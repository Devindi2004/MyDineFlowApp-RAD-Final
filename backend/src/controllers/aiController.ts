import { Request, Response, NextFunction } from "express";
import { GoogleAuth } from "google-auth-library";
import mongoose from "mongoose";
import { MenuItem } from "../models/MenuItem";
import { Order } from "../models/Order";
import { AuthRequest } from "../middleware/auth";
import { sendSuccess } from "../utils/response";

const DEFAULT_REASONING_ENGINE =
  "projects/parking-system-489607/locations/us-west1/reasoningEngines/295029756057878528";
const VERTEX_SCOPE = "https://www.googleapis.com/auth/cloud-platform";
const DEFAULT_REASONING_ENGINE_URL =
  "https://us-west1-aiplatform.googleapis.com/v1/projects/parking-system-489607/locations/us-west1/reasoningEngines/295029756057878528:query";

const remoteSessionCache = new Map<string, string>();

type ReasoningEngineResponse = {
  output?: unknown;
  response?: unknown;
  result?: unknown;
  content?: unknown;
  messages?: unknown;
  id?: unknown;
  session?: unknown;
  name?: unknown;
  error?: { message?: string };
};

type ChatContext = {
  restaurantId?: string;
  userId?: string;
  role?: string;
  table?: string;
  menuItems: Array<{
    name: string;
    description: string;
    category: string;
    price: number;
    isAvailable: boolean;
    tags: string[];
    spiceLevel: string;
    prepTime: number;
    orderCount: number;
  }>;
  recentOrders: Array<{
    orderNumber: string;
    status: string;
    tableNumber: string;
    totalAmount: number;
    items: Array<{ name: string; quantity: number; price: number }>;
    createdAt: Date;
  }>;
};

/**
 * AI Food Recommendation Engine
 * Uses OpenAI/Gemini if API key is available, otherwise falls back to
 * a smart rule-based recommendation system using order history and popularity.
 */
export async function getRecommendations(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { restaurantId, preferences, limit = 5 } = req.body as {
      restaurantId?: string;
      preferences?: string[];
      limit?: number;
    };

    const filter: Record<string, unknown> = { isAvailable: true };
    if (restaurantId) filter.restaurantId = restaurantId;

    // Try AI-powered recommendations first
    const geminiKey = process.env.GEMINI_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (geminiKey || openaiKey) {
      try {
        const menuItems = await MenuItem.find(filter).limit(30).lean();
        const recommendations = await getAIRecommendations(menuItems, preferences ?? [], geminiKey, openaiKey);
        sendSuccess(res, { recommendations });
        return;
      } catch (aiError) {
        // Fall through to rule-based recommendations
        console.warn("AI recommendation failed, using fallback:", aiError);
      }
    }

    // Rule-based fallback: popular items + preference matching
    const recommendations = await getRuleBasedRecommendations(filter, preferences ?? [], Number(limit));
    sendSuccess(res, { recommendations });
  } catch (err) {
    next(err);
  }
}

export async function chatWithAssistant(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { message, sessionId, userId, context } = req.body as {
      message?: string;
      sessionId?: string;
      userId?: string;
      context?: Record<string, unknown>;
    };

    if (!message || !message.trim()) {
      res.status(400).json({ success: false, message: "Message is required." });
      return;
    }

    const liveContext = await buildChatContext({
      userId,
      restaurantId: stringValue(context?.restaurantId),
      role: stringValue(context?.role),
      table: stringValue(context?.table),
    });

    const reply = await queryReasoningEngine({
      message: message.trim(),
      sessionId,
      userId,
      context: {
        ...(context ?? {}),
        ...liveContext,
      },
    });

    sendSuccess(res, { reply });
  } catch (err) {
    try {
      const { message, userId, context } = req.body as {
        message?: string;
        userId?: string;
        context?: Record<string, unknown>;
      };
      const fallbackContext = await buildChatContext({
        userId,
        restaurantId: stringValue(context?.restaurantId),
        role: stringValue(context?.role),
        table: stringValue(context?.table),
      });
      const reply = buildDatabaseFallbackReply(message ?? "", fallbackContext);
      sendSuccess(res, { reply, fallback: true }, "Assistant fallback response.");
    } catch {
      next(err);
    }
  }
}

async function queryReasoningEngine(input: {
  message: string;
  sessionId?: string;
  userId?: string;
  context?: Record<string, unknown>;
}): Promise<string> {
  const reasoningEngine = process.env.VERTEX_AI_REASONING_ENGINE || DEFAULT_REASONING_ENGINE;
  const location = process.env.VERTEX_AI_LOCATION || extractLocation(reasoningEngine);
  const classMethod = process.env.VERTEX_AI_REASONING_ENGINE_CLASS_METHOD || "query";
  const endpoint =
    process.env.VERTEX_AI_REASONING_ENGINE_URL ||
    `https://${location}-aiplatform.googleapis.com/v1/${reasoningEngine}:query`;
  const useStreamQuery = process.env.VERTEX_AI_USE_STREAM_QUERY !== "false";

  const auth = new GoogleAuth({ scopes: [VERTEX_SCOPE] });
  const client = await auth.getClient();
  const token = await client.getAccessToken();

  if (!token.token) {
    throw new Error("Could not get Google Cloud access token. Configure ADC or GOOGLE_APPLICATION_CREDENTIALS.");
  }

  const headers = {
    Authorization: `Bearer ${token.token}`,
    "Content-Type": "application/json",
  };
  const agentMessage = buildAgentMessage(input.message, input.context);

  if (useStreamQuery) {
    return streamQueryReasoningEngine(endpoint, headers, {
      ...input,
      message: agentMessage,
    });
  }

  return queryDirectReasoningEngine(endpoint, headers, {
    ...input,
    message: agentMessage,
    classMethod,
  });
}

async function queryDirectReasoningEngine(
  endpoint: string,
  headers: Record<string, string>,
  input: {
    message: string;
    sessionId?: string;
    userId?: string;
    context?: Record<string, unknown>;
    classMethod: string;
  }
): Promise<string> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({
      classMethod: input.classMethod,
      input: {
        message: input.message,
        question: input.message,
        user_id: input.userId || "dineflow-customer",
        session_id: input.sessionId || `dineflow-${Date.now()}`,
        context: {
          app: "DineFlow",
          purpose: "restaurant customer support and menu guidance",
          ...(input.context ?? {}),
        },
      },
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as ReasoningEngineResponse;

  if (!response.ok) {
    throw new Error(payload.error?.message || `Reasoning Engine request failed with ${response.status}.`);
  }

  return extractReply(payload);
}

async function streamQueryReasoningEngine(
  queryEndpoint: string,
  headers: Record<string, string>,
  input: {
    message: string;
    sessionId?: string;
    userId?: string;
    context?: Record<string, unknown>;
  }
): Promise<string> {
  const userId = input.userId || "dineflow-customer";
  const streamEndpoint = queryEndpoint.replace(/:query$/, ":streamQuery?alt=sse");
  const response = await fetch(streamEndpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({
      input: {
        user_id: userId,
        message: input.message,
      },
    }),
  });

  const rawText = await response.text();
  if (!response.ok) {
    throw new Error(extractErrorMessage(rawText) || `Reasoning Engine stream request failed with ${response.status}.`);
  }

  const reply = extractReplyFromSse(rawText);
  if (reply) return reply;

  return extractReply(parseJson(rawText) as ReasoningEngineResponse);
}

async function invokeReasoningMethod(
  endpoint: string,
  headers: Record<string, string>,
  classMethod: string,
  input: Record<string, unknown>
): Promise<ReasoningEngineResponse> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({ classMethod, input }),
  });
  const payload = (await response.json().catch(() => ({}))) as ReasoningEngineResponse;

  if (!response.ok) {
    throw new Error(payload.error?.message || `Reasoning Engine ${classMethod} failed with ${response.status}.`);
  }

  return payload;
}

async function buildChatContext(input: {
  userId?: string;
  restaurantId?: string;
  role?: string;
  table?: string;
}): Promise<ChatContext> {
  const restaurantId = isObjectId(input.restaurantId) ? input.restaurantId : undefined;
  const userId = isObjectId(input.userId) ? input.userId : undefined;
  const menuFilter: Record<string, unknown> = { isAvailable: true };
  const orderFilter: Record<string, unknown> = {};

  if (restaurantId) {
    menuFilter.restaurantId = restaurantId;
    orderFilter.restaurantId = restaurantId;
  }

  if (userId) {
    orderFilter.customerId = userId;
  }

  let [menuItems, recentOrders] = await Promise.all([
    MenuItem.find(menuFilter)
      .sort({ orderCount: -1, rating: -1, createdAt: -1 })
      .limit(40)
      .select("name description category price isAvailable tags spiceLevel prepTime orderCount")
      .lean(),
    Order.find(orderFilter)
      .sort({ createdAt: -1 })
      .limit(10)
      .select("orderNumber status tableNumber totalAmount items createdAt")
      .lean(),
  ]);

  if (!menuItems.length && restaurantId) {
    menuItems = await MenuItem.find({ isAvailable: true })
      .sort({ orderCount: -1, rating: -1, createdAt: -1 })
      .limit(40)
      .select("name description category price isAvailable tags spiceLevel prepTime orderCount")
      .lean();
  }

  if (!recentOrders.length && restaurantId && userId) {
    recentOrders = await Order.find({ customerId: userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .select("orderNumber status tableNumber totalAmount items createdAt")
      .lean();
  }

  return {
    restaurantId,
    userId,
    role: input.role,
    table: input.table,
    menuItems: menuItems.map((item) => ({
      name: item.name,
      description: item.description,
      category: item.category,
      price: item.price,
      isAvailable: item.isAvailable,
      tags: item.tags ?? [],
      spiceLevel: item.spiceLevel,
      prepTime: item.prepTime,
      orderCount: item.orderCount,
    })),
    recentOrders: recentOrders.map((order) => ({
      orderNumber: order.orderNumber,
      status: order.status,
      tableNumber: order.tableNumber,
      totalAmount: order.totalAmount,
      items: (order.items ?? []).map((item) => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
      })),
      createdAt: order.createdAt,
    })),
  };
}

function extractLocation(resourceName: string) {
  const match = resourceName.match(/\/locations\/([^/]+)\//);
  return match?.[1] || "us-west1";
}

function buildAgentMessage(message: string, context?: Record<string, unknown>): string {
  if (process.env.VERTEX_AI_SEND_CONTEXT_IN_MESSAGE === "false") {
    return message;
  }

  const chatContext = context as ChatContext | undefined;
  const menuLines =
    chatContext?.menuItems
      ?.slice(0, 20)
      .map(
        (item) =>
          `- ${item.name} | ${item.category} | LKR ${item.price} | ${item.description} | prep ${item.prepTime} min | tags: ${item.tags.join(", ") || "none"}`
      )
      .join("\n") || "No live menu items found.";
  const orderLines =
    chatContext?.recentOrders
      ?.slice(0, 5)
      .map((order) => {
        const items = order.items.map((item) => `${item.quantity} x ${item.name}`).join(", ");
        return `- ${order.orderNumber} | ${order.status} | table ${order.tableNumber} | LKR ${order.totalAmount} | ${items}`;
      })
      .join("\n") || "No recent orders found.";

  return `You are the DineFlow restaurant customer assistant.
Answer the customer's question using the live DineFlow database context below.
If the question is not about the restaurant, menu, prices, prep time, table service, or order status, politely say you can only help with DineFlow restaurant questions.
Do not invent items, prices, or order statuses.

Customer question:
${message}

Live menu:
${menuLines}

Recent orders:
${orderLines}`;
}

function extractSessionId(payload: ReasoningEngineResponse): string | undefined {
  const output = payload.output ?? payload.response ?? payload.result ?? payload.session ?? payload;
  if (typeof output === "string") return output;
  if (!output || typeof output !== "object") return undefined;

  const record = output as Record<string, unknown>;
  const candidates = [record.id, record.session_id, record.sessionId, record.name, payload.id, payload.name];
  return candidates.find((candidate): candidate is string => typeof candidate === "string" && candidate.trim().length > 0);
}

function extractReply(payload: ReasoningEngineResponse): string {
  const output =
    payload.output ??
    payload.response ??
    payload.result ??
    payload.content ??
    payload.messages ??
    payload;

  if (typeof output === "string") return output;

  if (Array.isArray(output)) {
    const text = output.map(extractTextFromUnknown).filter(Boolean).join("\n");
    if (text.trim()) return text;
  }

  if (output && typeof output === "object") {
    const record = output as Record<string, unknown>;
    const candidates = [
      record.text,
      record.message,
      record.reply,
      record.answer,
      record.output,
      record.content,
      record.messages,
    ];

    for (const candidate of candidates) {
      if (typeof candidate === "string" && candidate.trim()) {
        return candidate;
      }
      const text = extractTextFromUnknown(candidate);
      if (text) return text;
    }
  }

  return JSON.stringify(output);
}

function extractReplyFromSse(rawText: string): string {
  let chunks = rawText
    .split(/\r?\n/)
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.replace(/^data:\s*/, "").trim())
    .filter((line) => line && line !== "[DONE]");

  if (!chunks.length) {
    chunks = rawText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }

  const texts = chunks
    .map((chunk) => extractTextFromUnknown(parseJson(chunk)))
    .filter(Boolean);
  return texts.join("\n").trim();
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function extractErrorMessage(rawText: string): string | undefined {
  const parsed = parseJson(rawText);
  if (parsed && typeof parsed === "object") {
    const record = parsed as { error?: { message?: string }; message?: string };
    return record.error?.message || record.message;
  }
  return rawText || undefined;
}

function extractTextFromUnknown(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) return value.map(extractTextFromUnknown).filter(Boolean).join("\n");
  if (!value || typeof value !== "object") return "";

  const record = value as Record<string, unknown>;
  const parts = record.parts;
  if (Array.isArray(parts)) {
    return parts.map(extractTextFromUnknown).filter(Boolean).join("\n");
  }

  for (const key of ["text", "content", "message", "reply", "answer"]) {
    const text = extractTextFromUnknown(record[key]);
    if (text) return text;
  }

  return "";
}

function buildDatabaseFallbackReply(question: string, context: ChatContext): string {
  const normalizedQuestion = question.toLowerCase();
  const orderIntent = /order|status|track|ready|preparing|pending|served|completed/.test(normalizedQuestion);

  if (orderIntent && context.recentOrders.length) {
    return context.recentOrders
      .slice(0, 3)
      .map((order) => {
        const items = order.items.map((item) => `${item.quantity} x ${item.name}`).join(", ");
        return `${order.orderNumber}: ${order.status} for table ${order.tableNumber}. Items: ${items || "No items listed"}. Total LKR ${order.totalAmount}.`;
      })
      .join("\n");
  }

  if (!isRestaurantQuestion(normalizedQuestion)) {
    return "I can help with DineFlow menu recommendations, prices, prep times, and your order status. Ask me about dishes, drinks, desserts, Sri Lankan food, or your current order.";
  }

  const requestedCategory = detectRequestedCategory(normalizedQuestion);
  const tokens = tokenizeQuestion(normalizedQuestion);
  const hasSpecificFoodRequest = Boolean(requestedCategory || tokens.length);
  const candidates = context.menuItems
    .map((item) => {
      const itemCategory = item.category.toLowerCase();
      const searchable = [item.name, item.description, itemCategory, item.spiceLevel, ...item.tags]
        .join(" ")
        .toLowerCase();
      const categoryScore = requestedCategory && itemCategory === requestedCategory ? 100 : 0;
      const tokenScore = tokens.reduce((score, token) => score + (searchable.includes(token) ? 12 : 0), 0);
      const popularityScore = Math.min(Number(item.orderCount || 0), 500) / 100;
      return { ...item, relevance: categoryScore + tokenScore, score: categoryScore + tokenScore + popularityScore };
    })
    .filter((item) => !hasSpecificFoodRequest || item.relevance > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  if (!candidates.length) {
    return requestedCategory
      ? `I could not find available ${requestedCategory} items in the live menu right now.`
      : "I could not find matching available menu items in the live menu right now.";
  }

  return candidates
    .map((item) => `${item.name} - LKR ${item.price}. ${item.description} Prep time: ${item.prepTime} minutes.`)
    .join("\n");
}

function isRestaurantQuestion(question: string): boolean {
  return /\b(menu|dish|dishes|food|eat|order|drink|drinks|dessert|desserts|price|cost|prep|recommend|suggest|sri lankan|kottu|rice|curry|lassi|soda|coconut|chicken|prawn|seafood|vegetarian|vegan|spicy|mild|hot)\b/.test(
    question
  );
}

function detectRequestedCategory(question: string): string | undefined {
  const categories: Array<[string, string[]]> = [
    ["sri lankan", ["sri lankan", "srilankan", "local", "rice", "curry", "kottu", "lamprais"]],
    ["drinks", ["drink", "drinks", "beverage", "lassi", "soda", "juice", "coconut"]],
    ["desserts", ["dessert", "desserts", "sweet", "cake", "watalappan"]],
    ["seafood", ["seafood", "prawn", "prawns", "fish"]],
    ["mains", ["main", "mains", "chicken", "steak", "pasta"]],
    ["signature", ["signature", "chef pick", "chef-pick", "special"]],
  ];

  return categories.find(([, aliases]) => aliases.some((alias) => question.includes(alias)))?.[0];
}

function tokenizeQuestion(question: string): string[] {
  const stopWords = new Set([
    "a",
    "an",
    "and",
    "are",
    "can",
    "for",
    "from",
    "give",
    "i",
    "me",
    "menu",
    "our",
    "please",
    "recommend",
    "show",
    "suggest",
    "the",
    "to",
    "what",
    "with",
  ]);

  return question
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2 && !stopWords.has(token));
}

function isObjectId(value?: string): value is string {
  return Boolean(value && mongoose.Types.ObjectId.isValid(value));
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

async function getAIRecommendations(
  menuItems: Array<Record<string, unknown>>,
  preferences: string[],
  geminiKey?: string,
  openaiKey?: string
): Promise<Array<Record<string, unknown>>> {
  const menuSummary = menuItems
    .slice(0, 20)
    .map((item) => `${item.name} (${item.category}, LKR ${item.price}, tags: ${(item.tags as string[]).join(", ")})`)
    .join("\n");

  const prompt = `You are a restaurant recommendation AI. Based on these menu items:
${menuSummary}

Customer preferences: ${preferences.length > 0 ? preferences.join(", ") : "no specific preferences"}

Recommend the top 5 dishes with a brief reason for each. Return JSON array with fields: name, recommendationReason.`;

  if (geminiKey) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    const data = await response.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]";

    // Extract JSON from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const aiRecs = JSON.parse(jsonMatch[0]) as Array<{ name: string; recommendationReason: string }>;

      // Match AI recommendations to actual menu items
      return menuItems
        .filter((item) => aiRecs.some((rec) => rec.name.toLowerCase().includes((item.name as string).toLowerCase())))
        .slice(0, 5)
        .map((item) => {
          const aiRec = aiRecs.find((rec) =>
            rec.name.toLowerCase().includes((item.name as string).toLowerCase())
          );
          return { ...item, recommendationReason: aiRec?.recommendationReason ?? "AI recommended" };
        });
    }
  }

  throw new Error("AI response parsing failed");
}

async function getRuleBasedRecommendations(
  filter: Record<string, unknown>,
  preferences: string[],
  limit: number
): Promise<Array<Record<string, unknown>>> {
  // Get top items by order count
  const popularItems = await MenuItem.find(filter)
    .sort({ orderCount: -1, rating: -1 })
    .limit(limit * 2)
    .lean();

  // Score items based on preferences
  const scored = popularItems.map((item) => {
    let score = item.orderCount as number;
    const tags = item.tags as string[];

    if (preferences.includes("vegetarian") && tags.includes("vegetarian")) score += 50;
    if (preferences.includes("vegan") && tags.includes("vegan")) score += 50;
    if (preferences.includes("gluten-free") && tags.includes("gluten-free")) score += 30;
    if (preferences.includes("high-protein") && tags.includes("high-protein")) score += 30;

    let reason = "Popular choice";
    if (tags.includes("chef-pick")) reason = "Chef's special recommendation";
    else if (tags.includes("signature")) reason = "Our signature dish";
    else if ((item.orderCount as number) > 50) reason = "Customer favourite";
    else if (tags.includes("vegan")) reason = "Great vegan option";
    else if (tags.includes("high-protein")) reason = "High protein meal";

    return { ...item, score, recommendationReason: reason };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ score, ...item }) => item);
}

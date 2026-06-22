import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { Html5QrcodeScanner } from "html5-qrcode";
import { io } from "socket.io-client";
import {
  BarChart3,
  Bell,
  Bot,
  BookOpen,
  CalendarDays,
  ChefHat,
  Clock,
  ClipboardList,
  CreditCard,
  CheckCircle2,
  ChevronLeft,
  ChevronDown,
  Edit3,
  Eye,
  Home,
  LayoutDashboard,
  Laptop,
  Mail,
  LockKeyhole,
  LogIn,
  LogOut,
  MonitorSmartphone,
  Menu as MenuIcon,
  MessageSquare,
  MessageSquareQuote,
  Minus,
  PackageCheck,
  Plus,
  QrCode,
  Quote,
  ReceiptText,
  SendHorizontal,
  ScanQrCode,
  Search,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Star,
  Smartphone,
  Moon,
  Sun,
  Table2,
  Trash2,
  Users,
  Utensils,
  ArrowRight,
  TrendingUp,
  WalletCards,
  X,
  Zap,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import "./styles.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
const DEFAULT_RESTAURANT_ID = localStorage.getItem("dineflow_restaurant_id") || "";
const SESSION_UPDATED_EVENT = "dineflow-session-updated";
const AUTH_TOKEN_KEY = "dineflow_token";
const AUTH_REFRESH_KEY = "dineflow_refresh";
const AUTH_USER_KEY = "dineflow_user";

const api = axios.create({ baseURL: API_URL });
api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const unwrap = (response) => response.data?.data ?? response.data;
const apiErrorMessage = (err, fallback = "Request failed.") => {
  const validationMessage = err.response?.data?.errors?.map((entry) => entry.message).filter(Boolean).join(" ");
  return validationMessage || err.response?.data?.message || fallback;
};

function readStoredUser() {
  try {
    const sessionUser = sessionStorage.getItem(AUTH_USER_KEY);
    if (sessionUser) return JSON.parse(sessionUser);

    const legacyUser = localStorage.getItem(AUTH_USER_KEY);
    const legacyToken = localStorage.getItem(AUTH_TOKEN_KEY);
    const legacyRefresh = localStorage.getItem(AUTH_REFRESH_KEY);
    if (legacyUser || legacyToken || legacyRefresh) {
      if (legacyUser) sessionStorage.setItem(AUTH_USER_KEY, legacyUser);
      if (legacyToken) sessionStorage.setItem(AUTH_TOKEN_KEY, legacyToken);
      if (legacyRefresh) sessionStorage.setItem(AUTH_REFRESH_KEY, legacyRefresh);
    }
    return JSON.parse(legacyUser || "null");
  } catch {
    return null;
  }
}

function getStoredToken() {
  const sessionToken = sessionStorage.getItem(AUTH_TOKEN_KEY);
  if (sessionToken) return sessionToken;

  const legacyToken = localStorage.getItem(AUTH_TOKEN_KEY);
  const legacyRefresh = localStorage.getItem(AUTH_REFRESH_KEY);
  if (legacyToken) {
    sessionStorage.setItem(AUTH_TOKEN_KEY, legacyToken);
    if (legacyRefresh) sessionStorage.setItem(AUTH_REFRESH_KEY, legacyRefresh);
  }
  return legacyToken;
}

function getStoredRefreshToken() {
  const sessionRefresh = sessionStorage.getItem(AUTH_REFRESH_KEY);
  if (sessionRefresh) return sessionRefresh;

  const legacyRefresh = localStorage.getItem(AUTH_REFRESH_KEY);
  if (legacyRefresh) {
    sessionStorage.setItem(AUTH_REFRESH_KEY, legacyRefresh);
  }
  return legacyRefresh;
}

function storeAuthSession(data) {
  if (data?.accessToken) {
    sessionStorage.setItem(AUTH_TOKEN_KEY, data.accessToken);
    localStorage.setItem(AUTH_TOKEN_KEY, data.accessToken);
  }
  if (data?.refreshToken) {
    sessionStorage.setItem(AUTH_REFRESH_KEY, data.refreshToken);
    localStorage.setItem(AUTH_REFRESH_KEY, data.refreshToken);
  }
  if (data?.user) {
    const userValue = JSON.stringify(data.user);
    sessionStorage.setItem(AUTH_USER_KEY, userValue);
    localStorage.setItem(AUTH_USER_KEY, userValue);
    if (data.user.restaurantId) localStorage.setItem("dineflow_restaurant_id", data.user.restaurantId);
  }
  window.dispatchEvent(new Event(SESSION_UPDATED_EVENT));
}

function updateStoredUser(user) {
  if (!user) return;
  const userValue = JSON.stringify(user);
  sessionStorage.setItem(AUTH_USER_KEY, userValue);
  localStorage.setItem(AUTH_USER_KEY, userValue);
  if (user.restaurantId) localStorage.setItem("dineflow_restaurant_id", user.restaurantId);
  window.dispatchEvent(new Event(SESSION_UPDATED_EVENT));
}

function clearStoredSession() {
  sessionStorage.removeItem(AUTH_TOKEN_KEY);
  sessionStorage.removeItem(AUTH_REFRESH_KEY);
  sessionStorage.removeItem(AUTH_USER_KEY);
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_REFRESH_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
  window.dispatchEvent(new Event(SESSION_UPDATED_EVENT));
}

let refreshRequest = null;
let authRedirecting = false;

function redirectToLoginAfterAuthFailure() {
  if (authRedirecting || window.location.pathname === "/login") return;
  authRedirecting = true;
  window.setTimeout(() => {
    window.location.assign("/login");
  }, 0);
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const requestUrl = originalRequest?.url || "";

    if (!originalRequest || status !== 401 || originalRequest._retry || requestUrl.includes("/auth/refresh")) {
      return Promise.reject(error);
    }

    const refreshToken = getStoredRefreshToken();
    if (!refreshToken) {
      clearStoredSession();
      redirectToLoginAfterAuthFailure();
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      if (!refreshRequest) {
        refreshRequest = axios
          .post(`${API_URL}/auth/refresh`, { refreshToken })
          .then((response) => unwrap(response))
          .finally(() => {
            refreshRequest = null;
          });
      }

      const data = await refreshRequest;
      storeAuthSession(data);
      originalRequest.headers = {
        ...(originalRequest.headers || {}),
        Authorization: `Bearer ${data.accessToken}`,
      };
      return api(originalRequest);
    } catch (refreshError) {
      clearStoredSession();
      redirectToLoginAfterAuthFailure();
      return Promise.reject(refreshError);
    }
  },
);

const money = (value = 0) => `LKR ${Number(value).toLocaleString()}`;
const orderStatuses = ["pending", "accepted", "preparing", "ready", "served", "completed", "cancelled"];
const SERVICE_CHARGE_RATE = 0.1;
const TAX_RATE = 0.08;
const FOOD_BOWL_IMAGE = "/images/menu/signature-bowl-photo.png";
const DASHBOARD_DEMO_MENU = [
  { _id: "demo-chicken-bowl", name: "Chicken Bowl", price: 350, rating: 4.5 },
  { _id: "demo-veggie-bowl", name: "Veggie Bowl", price: 280, rating: 4.6 },
  { _id: "demo-pasta-alfredo", name: "Pasta Alfredo", price: 420, rating: 4.7 },
];
const DASHBOARD_DEMO_CART_ITEM = { ...DASHBOARD_DEMO_MENU[0], quantity: 1 };

const currentTableLabel = (fallback = "01") => localStorage.getItem("dineflow_table_number") || localStorage.getItem("dineflow_table_id") || fallback;

function calculateOrderTotals(subtotal = 0) {
  const serviceFee = Math.round(Number(subtotal) * SERVICE_CHARGE_RATE);
  const tax = Math.round(Number(subtotal) * TAX_RATE);
  return {
    subtotal,
    serviceFee,
    tax,
    total: subtotal + serviceFee + tax,
  };
}

const AuthContext = createContext(null);
const CartContext = createContext(null);
const SocketContext = createContext(null);
const ThemeContext = createContext(null);

function useAuth() {
  return useContext(AuthContext);
}

function useCart() {
  return useContext(CartContext);
}

function useSocket() {
  return useContext(SocketContext);
}

function useTheme() {
  return useContext(ThemeContext);
}

function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem("dineflow_theme") || "light");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("dineflow_theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme((current) => (current === "dark" ? "light" : "dark"));

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

function AuthProvider({ children }) {
  const [user, setUser] = useState(() => readStoredUser());
  const [token, setToken] = useState(() => getStoredToken());

  useEffect(() => {
    const syncSession = () => {
      setToken(getStoredToken());
      setUser(readStoredUser());
    };
    window.addEventListener(SESSION_UPDATED_EVENT, syncSession);
    return () => window.removeEventListener(SESSION_UPDATED_EVENT, syncSession);
  }, []);

  const login = async (email, password) => {
    const data = unwrap(await api.post("/auth/login", { email, password }));
    storeAuthSession(data);
    setToken(data.accessToken);
    setUser(data.user);
    return data.user;
  };

  const register = async (payload) => {
    const data = unwrap(await api.post("/auth/register", payload));
    storeAuthSession(data);
    setToken(data.accessToken);
    setUser(data.user);
    return data.user;
  };

  const googleLogin = async (credential) => {
    const data = unwrap(await api.post("/auth/google", { credential }));
    storeAuthSession(data);
    setToken(data.accessToken);
    setUser(data.user);
    return data.user;
  };

  const updateProfile = async (payload) => {
    const data = unwrap(await api.patch("/auth/me", payload));
    updateStoredUser(data.user);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    clearStoredSession();
    setToken(null);
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, token, login, register, googleLogin, updateProfile, logout }}>{children}</AuthContext.Provider>;
}

function CartProvider({ children }) {
  const [items, setItems] = useState(() => JSON.parse(localStorage.getItem("dineflow_cart") || "[]"));
  useEffect(() => localStorage.setItem("dineflow_cart", JSON.stringify(items)), [items]);
  const add = (item) => {
    setItems((current) => {
      const existing = current.find((entry) => entry._id === item._id);
      if (existing) return current.map((entry) => (entry._id === item._id ? { ...entry, quantity: entry.quantity + 1 } : entry));
      return [...current, { ...item, quantity: 1, specialInstructions: "" }];
    });
  };
  const update = (id, patch) => setItems((current) => current.map((item) => (item._id === id ? { ...item, ...patch } : item)));
  const remove = (id) => setItems((current) => current.filter((item) => item._id !== id));
  const clear = () => setItems([]);
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  return <CartContext.Provider value={{ items, add, update, remove, clear, total }}>{children}</CartContext.Provider>;
}

function SocketProvider({ children }) {
  const { token, user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [alerts, setAlerts] = useState([]);
  useEffect(() => {
    if (!token || !user?.role) {
      setSocket(null);
      setAlerts([]);
      return undefined;
    }
    const pushAlert = (text) => {
      setAlerts((current) => {
        const alert = { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, text };
        return [alert, ...current.filter((entry) => entry.text !== text)].slice(0, 5);
      });
    };
    const connection = io(SOCKET_URL, { auth: { token } });
    connection.emit("join-role", user.role === "chef" || user.role === "staff" ? "kitchen" : user.role);
    connection.on("order:ready", (order) => pushAlert(`${order.orderNumber} ready for Table ${order.tableNumber}`));
    connection.on("order:new", (order) => pushAlert(`New order ${order.orderNumber}`));
    setSocket(connection);
    return () => connection.disconnect();
  }, [token, user?.role]);
  return <SocketContext.Provider value={{ socket, alerts }}>{children}</SocketContext.Provider>;
}

function AppProviders({ children }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CartProvider>
          <SocketProvider>
            {children}
            <FloatingAiChat />
          </SocketProvider>
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

function FloatingAiChat() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Hi, I can help with menu choices, table service questions, and order guidance.",
    },
  ]);
  const sessionId = useMemo(
    () => localStorage.getItem("dineflow_ai_session") || `dineflow-${crypto.randomUUID?.() || Date.now()}`,
    [],
  );

  useEffect(() => {
    localStorage.setItem("dineflow_ai_session", sessionId);
  }, [sessionId]);

  const sendMessage = async (event) => {
    event?.preventDefault();
    const text = input.trim();
    if (!text || busy) return;

    setInput("");
    setMessages((current) => [...current, { role: "user", text }]);
    setBusy(true);

    try {
      const response = await api.post("/ai/chat", {
        message: text,
        sessionId,
        userId: user?._id || user?.id || "guest",
        context: {
          role: user?.role || "guest",
          restaurantId: user?.restaurantId || DEFAULT_RESTAURANT_ID || undefined,
          table: currentTableLabel("guest"),
        },
      });
      const data = unwrap(response);
      setMessages((current) => [
        ...current,
        { role: "assistant", text: data.reply || "I could not generate a reply right now." },
      ]);
    } catch (err) {
      setMessages((current) => [
        ...current,
        { role: "assistant", text: apiErrorMessage(err, "Assistant is unavailable right now.") },
      ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`ai-chat-widget ${open ? "open" : ""}`}>
      {open && (
        <section className="ai-chat-panel" aria-label="DineFlow AI chat">
          <div className="ai-chat-head">
            <div>
              <span><Bot size={16} /> AI Assistant</span>
              <strong>DineFlow help</strong>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close AI chat">
              <X size={18} />
            </button>
          </div>
          <div className="ai-chat-messages">
            {messages.map((message, index) => (
              <p className={`ai-chat-bubble ${message.role}`} key={`${message.role}-${index}`}>
                {message.text}
              </p>
            ))}
            {busy && <p className="ai-chat-bubble assistant">Thinking...</p>}
          </div>
          <form className="ai-chat-form" onSubmit={sendMessage}>
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask about menu or service"
              aria-label="Message AI assistant"
            />
            <button type="submit" disabled={busy || !input.trim()} aria-label="Send message">
              <SendHorizontal size={18} />
            </button>
          </form>
        </section>
      )}
      <button className="ai-chat-launcher" type="button" onClick={() => setOpen((value) => !value)} aria-label="Open AI chat">
        <MessageSquare size={22} />
      </button>
    </div>
  );
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button className="theme-toggle" type="button" onClick={toggleTheme} aria-label="Toggle dark and light mode">
      <span className={isDark ? "active" : ""}><Moon size={16} /> Dark</span>
      <span className={!isDark ? "active" : ""}><Sun size={16} /> Light</span>
    </button>
  );
}

function PwaInstallButton() {
  const [promptEvent, setPromptEvent] = useState(null);
  const [installed, setInstalled] = useState(() => window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator.standalone);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setPromptEvent(event);
    };
    const handleInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const install = async () => {
    if (!promptEvent) return;
    promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice.outcome === "accepted") setInstalled(true);
    setPromptEvent(null);
  };

  if (installed) return <span className="waiter-app-installed"><Smartphone size={16} /> Installed</span>;

  return (
    <Button className="waiter-install-btn" variant="soft" onClick={install} disabled={!promptEvent}>
      <Smartphone size={16} /> Install app
    </Button>
  );
}

function Button({ children, className = "", variant = "primary", ...props }) {
  const styles = variant === "ghost" ? "btn-ghost" : variant === "soft" ? "btn-soft" : "btn-primary";
  return <button className={`btn ${styles} ${className}`} {...props}>{children}</button>;
}

function Input(props) {
  return <input className="input" {...props} />;
}

function StatusBadge({ status }) {
  return <span className={`status status-${status}`}>{status}</span>;
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="stat-card">
      <Icon size={22} />
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon = Utensils, title, text }) {
  return (
    <div className="empty">
      <Icon size={32} />
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

function Header({ title, actions }) {
  const { user, logout } = useAuth();
  return (
    <header className="header">
      <div>
        <p className="eyebrow">DineFlow</p>
        <h1>{title}</h1>
      </div>
      <div className="header-actions">
        <ThemeToggle />
        {actions}
        {user && <Button variant="ghost" onClick={logout}><LogOut size={16} /> Logout</Button>}
      </div>
    </header>
  );
}

function Sidebar({ links, showPremium = true }) {
  const location = useLocation();
  return (
    <aside className="sidebar">
      <Link to="/" className="brand"><ChefHat /> <span>DineFlow<small>Restaurant Management</small></span></Link>
      <nav>{links.map((link) => <Link className={location.pathname === link.to ? "active" : ""} key={link.to} to={link.to}><link.icon size={18} /> {link.label}</Link>)}</nav>
      {showPremium && <div className="sidebar-premium">
        <div><ChefHat size={20} /></div>
        <strong>DineFlow Premium</strong>
        <p>Manage your restaurant efficiently with DineFlow.</p>
        <span>View Plan <ArrowRight size={14} /></span>
      </div>}
    </aside>
  );
}

function MobileNav({ links }) {
  return <nav className="mobile-nav">{links.map((link) => <Link key={link.to} to={link.to}><link.icon size={18} /><span>{link.label}</span></Link>)}</nav>;
}

function Modal({ open, title, children, onClose, className = "" }) {
  if (!open) return null;
  return (
    <div className="modal-backdrop">
      <div className={`modal ${className}`}>
        <div className="modal-head"><h3>{title}</h3><Button variant="ghost" onClick={onClose}>Close</Button></div>
        {children}
      </div>
    </div>
  );
}

function DataTable({ columns, rows }) {
  return (
    <div className="table-wrap">
      <table>
        <thead><tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr></thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row._id || row.id || JSON.stringify(row)}>
              {columns.map((column) => <td key={column.key}>{column.render ? column.render(row) : row[column.key]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProtectedRoute({ roles, children }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" state={{ from: { pathname: location.pathname, search: location.search, hash: location.hash, roles } }} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={roleHome(user.role)} replace />;
  return children;
}

function roleHome(role) {
  if (role === "admin") return "/admin";
  if (role === "waiter") return "/waiter";
  if (role === "chef" || role === "staff" || role === "kitchen") return "/kitchen";
  return "/customer";
}

function LandingPage() {
  const metrics = [
    ["40%", "Faster service", Zap],
    ["24/7", "Digital menu", Clock],
    ["3", "Role dashboards", Users],
    ["AI", "Recommendations", Sparkles],
  ];
  const features = [
    ["QR Digital Menus", "Create beautiful, dynamic menus accessible via QR codes.", QrCode],
    ["AI Recommendations", "Smart suggestions based on customer preferences and order history.", Bot],
    ["Live Kitchen Operations", "Monitor orders in real-time and streamline kitchen workflows.", Bell],
    ["Owner Analytics", "Get live sales insights, trends, customers, and restaurant performance.", BarChart3],
  ];
  const steps = [
    ["1", "Customer scans QR code", ScanQrCode],
    ["2", "Browses digital menu & orders", BookOpen],
    ["3", "Kitchen prepares in real-time", ChefHat],
    ["4", "Order delivered & customer satisfied", CheckCircle2],
  ];
  const testimonials = [
    ["DineFlow has completely transformed the way we manage orders and customers.", "Tharindu Perera", "The Grill House"],
    ["The analytics and insights help us make better decisions every day.", "Nadeesha Silva", "Spice Trail Restaurant"],
    ["The digital menu and QR ordering experience is seamless and modern.", "Kasun Fernando", "Urban Bites"],
  ];

  return (
    <main className="landing">
      <nav className="landing-nav">
        <Link to="/" className="brand landing-brand"><ChefHat /> <span>Dine<span>Flow</span><small>Smart Dining</small></span></Link>
        <div className="landing-nav-links">
          <a href="#features">Features</a>
          <Link to="/login">For Restaurants</Link>
          <a href="#pricing">Pricing</a>
          <a href="#about">About Us</a>
          <a href="#contact">Contact</a>
        </div>
        <div className="landing-nav-actions">
          <Link className="btn btn-soft" to="/login"><LogIn size={16} /> Login</Link>
        </div>
      </nav>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow"><Sparkles size={16} /> AI-powered restaurant flow</p>
          <h1>Dine<span>Flow</span></h1>
          <p>A smart restaurant ordering and management system connecting QR menus, personalized recommendations, live kitchen operations, and owner analytics in one polished platform.</p>
          <div className="hero-actions">
            <Link className="btn btn-primary" to="/menu/demo-table?view=menu"><BookOpen size={19} /> Browse digital menu <ArrowRight size={18} /></Link>
            <Link className="btn btn-soft" to="/login"><BarChart3 size={19} /> View platform</Link>
          </div>
        </div>
        <div className="hero-metrics">
          {metrics.map(([value, label, Icon]) => (
            <div key={label}>
              <Icon />
              <strong>{value}</strong>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="trusted-strip">
        <p>Trusted by food & restaurants</p>
        {["The Grill House", "Urban Bites", "Spice Trail", "Green Leaf", "The Coffee Den", "Ocean Basket"].map((name) => <span key={name}>{name}</span>)}
      </section>

      <section className="landing-section" id="features">
        <span className="section-kicker">Powerful features</span>
        <h2>Everything you need to run your restaurant smarter</h2>
        <div className="landing-feature-grid">
          {features.map(([title, text, Icon]) => (
            <article className="landing-feature-card" key={title}>
              <Icon />
              <h3>{title}</h3>
              <p>{text}</p>
              <div className="feature-preview"><span /><span /><span /></div>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section compact">
        <span className="section-kicker">How it works</span>
        <h2>Simple steps, powerful results</h2>
        <div className="steps-row">
          {steps.map(([number, label, Icon]) => (
            <article className="step-card" key={label}>
              <div><Icon /><strong>{number}</strong></div>
              <p>{label}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="platform-section" id="about">
        <div className="platform-copy">
          <span className="section-kicker">All-in-one platform</span>
          <h2>Manage. Monitor. Grow.</h2>
          <p>DineFlow brings all your restaurant operations into one powerful dashboard.</p>
          {["Real-time order tracking", "Inventory & menu management", "Customer management", "Detailed reports & analytics", "Multi-branch support"].map((item) => <span key={item}><CheckCircle2 size={15} /> {item}</span>)}
          <Link className="btn btn-primary" to="/login">View platform <ArrowRight size={16} /></Link>
        </div>
        <div className="platform-preview">
          <Laptop />
          <div className="preview-window">
            <div className="preview-sidebar" />
            <div className="preview-main">
              <strong>Dashboard</strong>
              <div className="preview-stats"><span>LKR 128,200</span><span>98%</span><span>142</span></div>
              <div className="preview-chart" />
            </div>
          </div>
          <div className="preview-phone">
            <img src={FOOD_BOWL_IMAGE} alt="" />
            <strong>Chicken Bowl</strong>
            <span>LKR 350</span>
          </div>
        </div>
      </section>

      <section className="landing-cta">
        <div><PackageCheck /><h2>Ready to transform your restaurant?</h2><p>Join thousands of restaurants already using DineFlow to deliver better experiences.</p></div>
        <Link className="btn btn-primary" to="/register">Get started now <ArrowRight size={16} /></Link>
      </section>

      <section className="landing-section compact" id="contact">
        <span className="section-kicker">What our partners say</span>
        <h2>Loved by restaurant owners</h2>
        <div className="testimonial-grid">
          {testimonials.map(([quote, name, role]) => (
            <article className="testimonial-card" key={name}>
              <Quote />
              <p>{quote}</p>
              <strong>{name}</strong>
              <span>{role}</span>
            </article>
          ))}
        </div>
      </section>

      <footer className="landing-footer">
        <div>
          <Link to="/" className="brand landing-brand"><ChefHat /> <span>Dine<span>Flow</span><small>Smart Dining</small></span></Link>
          <p>A smart restaurant ordering and management platform built to help restaurants deliver better, faster service.</p>
        </div>
        <nav><strong>Products</strong><a href="#features">Features</a><a href="#pricing">Pricing</a><a href="#contact">Contact</a></nav>
        <nav><strong>For Restaurants</strong><a href="#about">How it works</a><a href="#features">Ordering</a><a href="#about">Analytics</a></nav>
        <form className="newsletter"><strong>Newsletter</strong><p>Stay updated with the latest features.</p><label><input placeholder="Enter your email" /><button type="button"><Mail size={15} /></button></label></form>
      </footer>
    </main>
  );
}

function LoginPage({ mode = "login" }) {
  const { login, register, googleLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const googleButtonRef = useRef(null);
  const [form, setForm] = useState({ name: "", email: "customer@example.com", password: "Customer@123", phone: "", role: "customer" });
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [googleReady, setGoogleReady] = useState(false);
  const [googleError, setGoogleError] = useState("");
  const redirectAfterAuth = (user) => {
    const from = location.state?.from;
    if (from?.pathname && (!from.roles || from.roles.includes(user.role))) {
      navigate(`${from.pathname}${from.search || ""}${from.hash || ""}`, { replace: true });
      return;
    }
    navigate(roleHome(user.role), { replace: true });
  };

  useEffect(() => {
    setGoogleReady(false);
    setGoogleError("");
    if (mode !== "login") return;
    if (!GOOGLE_CLIENT_ID) {
      setGoogleError("Google login is not configured yet.");
      return;
    }

    const handleCredential = async (response) => {
      setError("");
      try {
        const user = await googleLogin(response.credential);
        redirectAfterAuth(user);
      } catch (err) {
        setError(apiErrorMessage(err, "Google login failed."));
      }
    };

    const initializeGoogle = () => {
      if (!window.google?.accounts?.id || !googleButtonRef.current) return;
      setGoogleError("");
      window.google.accounts.id.disableAutoSelect();
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredential,
        auto_select: false,
        cancel_on_tap_outside: true,
        context: "signin",
        use_fedcm_for_prompt: true,
      });
      googleButtonRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: "outline",
        size: "large",
        type: "standard",
        shape: "pill",
        text: "signin_with",
        logo_alignment: "left",
        width: 360,
      });
      setGoogleReady(true);
    };

    if (window.google?.accounts?.id) {
      initializeGoogle();
      return;
    }

    const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existingScript) {
      existingScript.addEventListener("load", initializeGoogle, { once: true });
      return () => existingScript.removeEventListener("load", initializeGoogle);
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = initializeGoogle;
    script.onerror = () => setGoogleError("Could not load Google sign-in. Check your internet connection.");
    document.head.appendChild(script);
  }, [googleLogin, mode, navigate]);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      const user = mode === "register" ? await register(form) : await login(form.email, form.password);
      redirectAfterAuth(user);
    } catch (err) {
      setError(apiErrorMessage(err, "Authentication failed."));
    }
  };
  return (
    <main className="auth-page">
      <section className="auth-visual-panel">
        <Link to="/" className="auth-brand"><ChefHat /> <span>Dine<span>Flow</span><small>Smart Dining</small></span></Link>
        <div className="auth-visual-copy">
          <span className="auth-pill"><Sparkles size={15} /> AI-powered restaurant flow</span>
          <h1>Smart. Simple. <span>Seamless.</span></h1>
          <p>Manage orders, menus, kitchen operations, and customer experiences in one intelligent platform.</p>
          <div className="auth-benefits">
            {[
              ["Digital Menus", "Create beautiful QR menus instantly", ReceiptText],
              ["Real-time Analytics", "Track sales and performance live", TrendingUp],
              ["Kitchen Operations", "Streamline orders and improve efficiency", ChefHat],
              ["AI Recommendations", "Delight customers with smart suggestions", Sparkles],
            ].map(([title, text, Icon]) => (
              <article key={title}><Icon /><div><strong>{title}</strong><span>{text}</span></div></article>
            ))}
          </div>
          <div className="auth-join-card"><Users /><p><strong>Join 1000+ restaurants</strong><span>growing smarter with <b>DineFlow.</b></span></p></div>
        </div>
      </section>

      <section className="auth-form-panel">
        <form className="auth-card" onSubmit={submit}>
          <div className="auth-card-icon"><ChefHat /></div>
          <h1>{mode === "register" ? "Create account" : "Welcome back"}</h1>
          <p>{mode === "register" ? <>Create your <strong>DineFlow</strong> account</> : <>Login to access your <strong>DineFlow</strong> dashboard</>}</p>
          {mode === "register" && (
            <label className="auth-field">
              <span>Name</span>
              <div><Users size={19} /><input placeholder="Enter your name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            </label>
          )}
          <label className="auth-field">
            <span>Email address</span>
            <div><Mail size={19} /><input placeholder="Enter your email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
          </label>
          <label className="auth-field">
            <span>Password</span>
            <div><LockKeyhole size={19} /><input placeholder="Enter your password" type={showPassword ? "text" : "password"} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label="Show password"><Eye size={18} /></button></div>
          </label>
          {mode === "register" && (
            <label className="auth-field">
              <span>Account role</span>
              <div><ShieldCheck size={19} /><select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}><option>customer</option><option>waiter</option><option>chef</option><option>staff</option></select></div>
            </label>
          )}
          {mode === "login" && <div className="auth-options"><label><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Remember me</label><a href="#forgot">Forgot password?</a></div>}
          {error && <p className="error">{error}</p>}
          <Button className="auth-submit"><LogIn size={18} /> {mode === "register" ? "Create account" : "Login"}</Button>
          {mode === "login" && (
            <>
              <div className="auth-divider"><span />or continue with<span /></div>
              <div className="auth-google-box">
                <div className="auth-google-mark">G</div>
                <div className={`google-signin-slot ${!GOOGLE_CLIENT_ID || googleError ? "not-configured" : ""}`} ref={googleButtonRef}>
                  {!GOOGLE_CLIENT_ID || googleError ? <span className="auth-provider-disabled"><b>G</b> Sign in with Google</span> : !googleReady ? <span>Loading Google...</span> : null}
                </div>
                <button type="button" className="auth-provider-button" disabled><span className="microsoft-logo">■</span> Microsoft</button>
              </div>
              {googleError && <p className="auth-google-hint">{googleError} Add the Google Client ID to frontend and backend env files.</p>}
            </>
          )}
        </form>
        <p className="auth-switch">{mode === "register" ? "Already have an account?" : "Don't have an account?"} <Link to={mode === "register" ? "/login" : "/register"}>{mode === "register" ? "Login" : "Create account"} <ArrowRight size={15} /></Link></p>
        <p className="auth-copy">© 2026 DineFlow. All rights reserved.</p>
      </section>
    </main>
  );
}

function useResource(path, fallback = []) {
  const auth = useAuth();
  const [data, setData] = useState(fallback);
  const [loading, setLoading] = useState(true);
  const load = async () => {
    if (!path) return;
    setLoading(true);
    try {
      setData(unwrap(await api.get(path)));
    } catch (err) {
      if (err.response?.status === 401 && auth?.token) auth.logout();
      setData(fallback);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, [path, auth?.token]);
  return { data, setData, loading, load };
}

function CustomerLayout({ children, showMobileNav = true }) {
  const links = [
    { to: "/customer", label: "Home", icon: Home },
    { to: "/customer/menu", label: "Menu", icon: Utensils },
    { to: "/customer/cart", label: "Cart", icon: ShoppingCart },
    { to: "/customer/tracking", label: "Track", icon: ClipboardList },
    { to: "/customer/reservations", label: "Reserve", icon: CalendarDays },
  ];
  return <div className="app-shell customer-shell">{showMobileNav && <MobileNav links={links} />}<main>{children}</main></div>;
}

function CustomerDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const cart = useCart();
  const { data: orders } = useResource("/orders/my");
  const { data: menu } = useResource("/menu");
  const lastOrder = orders[0];
  const activeOrders = orders.filter((order) => !["completed", "served", "cancelled"].includes(order.status)).length;
  const tableLabel = lastOrder?.tableNumber || currentTableLabel("demo-table");
  const featuredMenu = menu.slice(0, 3);
  const dashboardMenuPreview = featuredMenu.length ? featuredMenu : DASHBOARD_DEMO_MENU;
  const hasCartItems = cart.items.length > 0;
  const dashboardCartItems = hasCartItems ? cart.items.slice(0, 3) : [DASHBOARD_DEMO_CART_ITEM];
  const dashboardCartTotal = hasCartItems ? cart.total : DASHBOARD_DEMO_CART_ITEM.price;

  return (
    <CustomerLayout>
      <div className="customer-dashboard">
        <section className="customer-hero-panel">
          <div className="customer-hero-copy">
            <span className="eyebrow">DineFlow</span>
            <h1>Hi, {user?.name || "Demo Customer"}</h1>
            <p>Track your table orders, ask for quick food ideas, and jump back into the menu when you are ready for another dish.</p>
            <div className="customer-hero-actions">
              <Link className="btn btn-primary" to="/customer/menu"><MenuIcon size={16} /> Order now</Link>
              <Link className="btn btn-soft" to="/customer/tracking"><ClipboardList size={16} /> Track orders</Link>
            </div>
          </div>
          <div className="customer-hero-food">
            <div className="customer-hero-food-ring">
              <img src={FOOD_BOWL_IMAGE} alt="Chicken bowl with tofu, corn, cucumber, greens, and cabbage" />
            </div>
            <div className="customer-cart-chip">
              <ShoppingCart size={18} />
              <span>Your cart total</span>
              <strong>{money(dashboardCartTotal)}</strong>
            </div>
          </div>
          <div className="customer-hero-card">
            <div className="customer-hero-card-top">
              <div>
                <span>Current table</span>
                <strong>{tableLabel}</strong>
              </div>
              <ShoppingCart size={24} />
            </div>
            <div className="customer-hero-total">
              <span>Last total</span>
              <strong>{lastOrder ? money(lastOrder.totalAmount) : money(0)}</strong>
            </div>
            <div className="customer-hero-status">
              <span>{activeOrders} active</span>
              <span>{orders.length} total orders</span>
            </div>
          </div>
          <div className="customer-top-actions">
            <ThemeToggle />
            <Button onClick={() => navigate("/customer/menu")}><MenuIcon size={16} /> Order now</Button>
            <Button variant="ghost" onClick={logout}><LogOut size={16} /> Logout</Button>
          </div>
        </section>

        <div className="customer-stats-grid">
          <StatCard icon={Star} label="Loyalty points" value={user?.loyaltyPoints || 0} />
          <StatCard icon={ClipboardList} label="Total orders" value={orders.length} />
          <StatCard icon={Bell} label="Active orders" value={activeOrders} />
          <StatCard icon={WalletCards} label="Last total" value={lastOrder ? money(lastOrder.totalAmount) : money(0)} />
        </div>

        <section className="customer-dashboard-grid">
          <AIChatbot menu={menu} orders={orders} />
          <div className="customer-orders-panel">
            <div className="panel-title-row">
              <div>
                <span className="eyebrow">Recent activity</span>
                <h2>Your orders</h2>
              </div>
              <Link className="btn btn-soft" to="/customer/tracking">View all</Link>
            </div>
            <OrderList orders={orders.slice(0, 4)} />
          </div>
        </section>

        <section className="customer-menu-cart-grid">
          <div className="customer-menu-preview">
            <div className="panel-title-row">
              <div>
                <span className="eyebrow">Our menu</span>
                <h2>Popular food for your table</h2>
              </div>
              <span className="menu-count-pill">{dashboardMenuPreview.length} dishes available</span>
            </div>
            {dashboardMenuPreview.length ? (
              <div className="customer-menu-mini-grid">
                {dashboardMenuPreview.map((item) => (
                  <article className="customer-menu-mini-card" key={item._id}>
                    <img src={FOOD_BOWL_IMAGE} alt={item.name} />
                    <div>
                      <h3>{item.name}</h3>
                      <span><Star size={13} /> {item.rating || "New"}</span>
                      <strong>{money(item.price)}</strong>
                    </div>
                    <button type="button" onClick={() => cart.add(item)} aria-label={`Add ${item.name}`}>
                      <Plus size={17} />
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState title="No menu items yet" text="Add menu items to show popular food here." />
            )}
          </div>

          <div className="customer-mini-cart">
            <div className="panel-title-row">
              <div>
                <span className="eyebrow">Selected items</span>
                <h2>Order cart</h2>
                <p>Table {tableLabel} - {dashboardCartItems.length} item{dashboardCartItems.length === 1 ? "" : "s"}</p>
              </div>
              <ShoppingCart size={22} />
            </div>
            <div className="customer-mini-cart-list">
              {dashboardCartItems.map((item) => (
                <article className={`customer-mini-cart-row ${hasCartItems ? "" : "is-demo"}`} key={item._id}>
                  <img src={FOOD_BOWL_IMAGE} alt={item.name} />
                  <h3>{item.name}</h3>
                  <strong>{money(item.price * item.quantity)}</strong>
                  <button
                    type="button"
                    onClick={() => hasCartItems && cart.update(item._id, { quantity: Math.max(1, item.quantity - 1) })}
                    aria-label={`Decrease ${item.name}`}
                  >
                    <Minus size={15} />
                  </button>
                  <span>{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => hasCartItems ? cart.update(item._id, { quantity: item.quantity + 1 }) : cart.add(item)}
                    aria-label={`Increase ${item.name}`}
                  >
                    <Plus size={15} />
                  </button>
                </article>
              ))}
            </div>
            <div className="customer-mini-cart-total">
              <span>Total</span>
              <strong>{money(dashboardCartTotal)}</strong>
            </div>
          </div>
        </section>
      </div>
    </CustomerLayout>
  );
}

function CustomerTableEntryPage() {
  const { tableId } = useParams();
  const navigate = useNavigate();
  const { data: table, loading } = useResource(tableId ? `/tables/${tableId}` : null, null);

  useEffect(() => {
    if (!table?._id) return;
    localStorage.setItem("dineflow_table_id", table._id);
    localStorage.setItem("dineflow_table_number", table.tableNumber || table._id);
    navigate("/customer/menu", { replace: true });
  }, [table, navigate]);

  return (
    <CustomerLayout showMobileNav={false}>
      <section className="qr-table-entry">
        <div className="checkout-success-icon">
          <QrCode size={42} />
        </div>
        <span className="eyebrow">Table QR</span>
        <h1>{loading ? "Opening your table menu" : table?._id ? `Table ${table.tableNumber}` : "Table not found"}</h1>
        <p>{loading ? "Please wait while we connect this QR code to your customer menu." : table?._id ? "Redirecting to the digital menu." : "Please ask a waiter to check this table QR code."}</p>
        {!loading && !table?._id && <Link className="btn btn-primary" to="/customer"><Home size={16} /> Customer home</Link>}
      </section>
    </CustomerLayout>
  );
}

function MenuPage() {
  const { tableId } = useParams();
  const location = useLocation();
  const cart = useCart();
  const navigate = useNavigate();
  const { data: menu } = useResource("/menu");
  const viewOnly = new URLSearchParams(location.search).get("view") === "menu";
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const categories = ["All", ...new Set(menu.map((item) => item.category))];
  const filtered = menu.filter((item) => (category === "All" || item.category === category) && item.name.toLowerCase().includes(query.toLowerCase()));
  const subtotal = cart.total;
  const { serviceFee, tax, total } = calculateOrderTotals(subtotal);
  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  const displayItems = filtered.length ? filtered : menu;
  const featuredItems = displayItems.slice(0, 4);
  const heroItem = displayItems[0] || {
    _id: "demo-signature",
    name: "Chicken Bowl",
    category: "Chef Special",
    description: "Tofu, corn, cucumber, cabbage, greens, and house sauce in a colorful signature bowl.",
    price: 350,
    imageUrl: FOOD_BOWL_IMAGE,
    rating: 4.8,
  };
  const visualHeroItem = { ...heroItem, imageUrl: heroItem.imageUrl || FOOD_BOWL_IMAGE };
  const offerItems = featuredItems.length ? featuredItems : [heroItem];

  useEffect(() => {
    if (tableId) localStorage.setItem("dineflow_table_id", tableId);
  }, [tableId]);

  return (
    <CustomerLayout showMobileNav={!viewOnly}>
      <section className="foodhut-menu-shell">
        <nav className="foodhut-menu-nav">
          <Link to="/" className="brand foodhut-brand"><ChefHat /> <span>DineFlow<small>Food ordering</small></span></Link>
          <div>
            <a href="#special-offers">Special offers</a>
            <a href="#menu-catalog">Our menu</a>
            {!viewOnly && <a href="#order-cart">Order cart</a>}
          </div>
          {!viewOnly && <Link className="btn btn-primary" to="/customer/cart"><ShoppingCart size={16} /> {itemCount ? `${itemCount} items` : "Cart"}</Link>}
        </nav>

        <section className="foodhut-hero">
          <div className="foodhut-hero-copy">
            <span className="foodhut-trust"><Star size={14} /> People trust us</span>
            <h1>We're Serious For <span>Food</span> & <mark>Delivery.</mark></h1>
            <p>{viewOnly ? "Browse our digital menu, explore categories, and preview dishes before you choose what to order." : "Best cooks and fast service for your table. Pick dishes, see your cart total live, and move to checkout without losing the menu."}</p>
            <label className="foodhut-hero-search">
              <Search size={18} />
              <input placeholder="Search food" value={query} onChange={(e) => setQuery(e.target.value)} />
              <button type="button" aria-label="Search menu"><Search size={16} /></button>
            </label>
            <div className="foodhut-hero-actions">
              <a className="btn btn-primary" href="#menu-catalog"><BookOpen size={16} /> View menu</a>
              {!viewOnly && <button className="btn btn-soft" type="button"><ShoppingCart size={16} /> Table {tableId || currentTableLabel()}</button>}
            </div>
          </div>

          <div className="foodhut-hero-visual">
            <div className="foodhut-plate">
              <img src={menuImage(visualHeroItem)} onError={(event) => handleMenuImageError(event, visualHeroItem)} alt={visualHeroItem.name} />
            </div>
            <div className="foodhut-floating foodhut-floating-price">
              <img src={menuImage(visualHeroItem)} onError={(event) => handleMenuImageError(event, visualHeroItem)} alt="" />
              <div><strong>Fresh Lime Soda</strong><span>LKR 350</span></div>
            </div>
            <div className="foodhut-floating foodhut-floating-rating">
              <Star size={16} />
              <div><strong>Happy customer</strong><span>4.8 table rating</span></div>
            </div>
          </div>
        </section>
      </section>

      <section className="special-offers-section" id="special-offers">
        <div className="section-title-center">
          <h2>Today <span>Special</span> Offers</h2>
              <p>{viewOnly ? "Freshly selected dishes from the kitchen, ready for you to browse." : "Freshly selected dishes from the kitchen, ready for fast table ordering."}</p>
        </div>
        <div className="special-offer-grid">
          {offerItems.map((item, index) => (
            <article className="special-offer-card" key={item._id || item.name}>
              <div className="special-offer-image"><img src={menuImage(item)} onError={(event) => handleMenuImageError(event, item)} alt={item.name} /></div>
              <span className="special-offer-price">{money(item.price)}</span>
              <div className="special-offer-rating"><Star size={14} /> {(4.5 + index * 0.1).toFixed(1)}</div>
              <h3>{item.name}</h3>
              <p>{item.description}</p>
              {!viewOnly && <Button onClick={() => cart.add(item)}><Plus size={16} /> Add</Button>}
            </article>
          ))}
        </div>
      </section>

      <div className={`menu-order-layout ${viewOnly ? "menu-order-layout-view-only" : ""}`}>
        <section className="menu-catalog" id="menu-catalog">
          <div className="section-title-row">
            <div>
              <span className="eyebrow">Our menu</span>
              <h2>Popular food for your table</h2>
            </div>
            <p>{filtered.length} dishes available</p>
          </div>
          <div className="toolbar">
            <label className="search"><Search size={18} /><Input placeholder="Search dishes" value={query} onChange={(e) => setQuery(e.target.value)} /></label>
            <div className="tabs">{categories.map((name) => <button className={category === name ? "active" : ""} onClick={() => setCategory(name)} key={name}>{name}</button>)}</div>
          </div>
          <div className="menu-grid">{filtered.map((item) => <MenuItemCard key={item._id} item={item} onAdd={viewOnly ? null : () => cart.add(item)} />)}</div>
        </section>
        {!viewOnly && (
          <div id="order-cart">
            <MenuSideCart
              cart={cart}
              itemCount={itemCount}
              serviceFee={serviceFee}
              subtotal={subtotal}
              tableId={tableId}
              tax={tax}
              total={total}
              onCheckout={() => navigate("/customer/checkout")}
            />
          </div>
        )}
      </div>
    </CustomerLayout>
  );
}

function generatedFoodImage(item = {}) {
  const label = item.name || item.category || "DineFlow dish";
  const text = label.length > 22 ? `${label.slice(0, 20)}...` : label;
  const haystack = `${item.name || ""} ${item.category || ""} ${item.description || ""}`.toLowerCase();
  const dishType = haystack.includes("lime") || haystack.includes("soda") || haystack.includes("drink") || haystack.includes("water")
    ? "drink"
    : haystack.includes("coconut")
      ? "coconut"
      : haystack.includes("rice") || haystack.includes("curry")
        ? "rice"
        : haystack.includes("kottu") || haystack.includes("roti")
          ? "kottu"
          : haystack.includes("dessert") || haystack.includes("cake") || haystack.includes("ice")
            ? "dessert"
            : "bowl";
  const palette = {
    bowl: ["#ffede1", "#ff5a52", "#ffc64d", "#15b981"],
    coconut: ["#ecfff3", "#14b879", "#f6f1d5", "#7a4d21"],
    dessert: ["#fff1f6", "#ef5c8a", "#f6c45d", "#8b5a3c"],
    drink: ["#effff7", "#1ecf8f", "#f8df53", "#8bdff2"],
    kottu: ["#fff4df", "#ff6a3d", "#f4b63f", "#58a85a"],
    rice: ["#fff8e8", "#ff8a3d", "#fff7df", "#cc3f2f"],
  }[dishType];
  const [bg, accent, light, extra] = palette;
  const mainVisual = {
    bowl: `<circle cx="180" cy="150" r="74" fill="#fff" stroke="${accent}" stroke-width="12"/><circle cx="156" cy="136" r="20" fill="${light}"/><circle cx="198" cy="128" r="19" fill="${extra}"/><circle cx="184" cy="172" r="24" fill="${accent}"/><path d="M132 185c34 25 79 25 111 0" fill="none" stroke="#4b2c1f" stroke-width="10" stroke-linecap="round"/>`,
    coconut: `<circle cx="180" cy="145" r="70" fill="${light}" stroke="${accent}" stroke-width="12"/><path d="M147 108c32-26 71-11 82 22-39 0-62-6-82-22z" fill="${extra}"/><path d="M165 126h54l-10 56h-34z" fill="#ffffff" opacity=".72"/><path d="M174 118l40-34" stroke="${extra}" stroke-width="9" stroke-linecap="round"/>`,
    dessert: `<path d="M118 174h124l-14 48h-96z" fill="${accent}"/><path d="M135 132h90l18 42H116z" fill="${light}"/><circle cx="178" cy="119" r="16" fill="${extra}"/><path d="M135 150h92" stroke="#fff" stroke-width="8" stroke-linecap="round"/>`,
    drink: `<path d="M140 95h80l-15 128h-50z" fill="#ffffff" stroke="${accent}" stroke-width="10"/><path d="M151 142h58l-8 70h-42z" fill="${light}"/><circle cx="225" cy="116" r="22" fill="${extra}" stroke="#ffffff" stroke-width="7"/><path d="M173 93l43-45" stroke="${accent}" stroke-width="9" stroke-linecap="round"/>`,
    kottu: `<circle cx="180" cy="150" r="76" fill="#fff8e7" stroke="${accent}" stroke-width="12"/><path d="M125 150h110M134 178h92M146 122h76" stroke="${light}" stroke-width="15" stroke-linecap="round"/><circle cx="154" cy="150" r="13" fill="${extra}"/><circle cx="204" cy="174" r="12" fill="${accent}"/><path d="M128 209l102-102M230 209L128 107" stroke="#5b3c25" stroke-width="7" stroke-linecap="round"/>`,
    rice: `<circle cx="180" cy="150" r="78" fill="#ffffff" stroke="${accent}" stroke-width="12"/><ellipse cx="158" cy="154" rx="36" ry="48" fill="${light}"/><circle cx="205" cy="132" r="28" fill="${extra}"/><circle cx="207" cy="181" r="24" fill="#f3b43f"/><path d="M140 199c31 18 78 18 112-1" stroke="#6f3d1b" stroke-width="8" fill="none" stroke-linecap="round"/>`,
  }[dishType];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 300"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${bg}"/><stop offset="1" stop-color="#fff"/></linearGradient><filter id="s" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="16" stdDeviation="14" flood-color="${accent}" flood-opacity=".22"/></filter></defs><rect width="360" height="300" rx="34" fill="url(#g)"/><circle cx="300" cy="40" r="64" fill="${accent}" opacity=".12"/><circle cx="62" cy="242" r="52" fill="${light}" opacity=".34"/><g filter="url(#s)">${mainVisual}</g><text x="180" y="270" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="22" font-weight="800" fill="#251815">${text}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function menuImage(item) {
  const imageUrl = item?.imageUrl || "";
  if (imageUrl.startsWith("http") || imageUrl.startsWith("data:image") || imageUrl.startsWith("blob:")) return imageUrl;
  if (imageUrl.startsWith("/")) return imageUrl;
  return FOOD_BOWL_IMAGE;
}

function handleMenuImageError(event, item) {
  const fallback = new URL(FOOD_BOWL_IMAGE, window.location.origin).href;
  if (event.currentTarget.src !== fallback) event.currentTarget.src = fallback;
}

function fileToMenuImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read image file."));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("Could not load image preview."));
      image.onload = () => {
        const maxSize = 900;
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function MenuItemCard({ item, onAdd }) {
  const image = menuImage(item);
  return (
    <article className="menu-card">
      <img src={image} onError={(event) => handleMenuImageError(event, item)} alt={item.name} />
      <div>
        <span>{item.category}</span>
        <h3>{item.name}</h3>
        <p>{item.description}</p>
        <div className="card-foot"><strong>{money(item.price)}</strong>{onAdd && <Button onClick={onAdd}><Plus size={16} /> Add</Button>}</div>
      </div>
    </article>
  );
}

function MenuSideCart({ cart, itemCount, serviceFee, subtotal, tableId, tax, total, onCheckout }) {
  const tableNumber = tableId || currentTableLabel();

  return (
    <aside className="menu-cart-panel" aria-label="Selected order cart">
      <div className="menu-cart-head">
        <div>
          <span className="eyebrow">Selected items</span>
          <h2>Order cart</h2>
          <p>Table {tableNumber} - {itemCount} item{itemCount === 1 ? "" : "s"}</p>
        </div>
        <div className="menu-cart-icon"><ShoppingCart size={22} /></div>
      </div>

      {!cart.items.length ? (
        <div className="menu-cart-empty">
          <ShoppingCart size={34} />
          <h3>No items selected</h3>
          <p>Choose dishes from the menu. Prices and totals will calculate here.</p>
        </div>
      ) : (
        <div className="menu-cart-list">
          {cart.items.map((item) => (
            <article className="menu-cart-item" key={item._id}>
              <img src={menuImage(item)} onError={(event) => handleMenuImageError(event, item)} alt={item.name} />
              <div className="menu-cart-item-main">
                <div className="menu-cart-item-title">
                  <div>
                    <h3>{item.name}</h3>
                    <p>{money(item.price)} each</p>
                  </div>
                  <button type="button" className="menu-cart-remove" onClick={() => cart.remove(item._id)} aria-label={`Remove ${item.name}`}>
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="menu-cart-controls">
                  <div className="menu-cart-qty">
                    <button type="button" onClick={() => cart.update(item._id, { quantity: Math.max(1, item.quantity - 1) })} aria-label={`Decrease ${item.name}`}>
                      <Minus size={15} />
                    </button>
                    <strong>{item.quantity}</strong>
                    <button type="button" onClick={() => cart.update(item._id, { quantity: item.quantity + 1 })} aria-label={`Increase ${item.name}`}>
                      <Plus size={15} />
                    </button>
                  </div>
                  <strong>{money(item.price * item.quantity)}</strong>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="menu-cart-totals">
        <div><span>Subtotal</span><strong>{money(subtotal)}</strong></div>
        <div><span>Service fee (10%)</span><strong>{money(serviceFee)}</strong></div>
        <div><span>Tax</span><strong>{money(tax)}</strong></div>
        <div className="grand-total"><span>Total</span><strong>{money(total)}</strong></div>
      </div>
      <Button className="menu-cart-checkout" disabled={!cart.items.length} onClick={onCheckout}>
        <CreditCard size={17} /> Checkout {cart.items.length ? money(total) : ""}
      </Button>
    </aside>
  );
}

function CartPage() {
  const cart = useCart();
  const { logout } = useAuth();
  const subtotal = cart.total;
  const { serviceFee, tax, total } = calculateOrderTotals(subtotal);
  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  const tableNumber = currentTableLabel("demo-table");

  return (
    <CustomerLayout>
      <section className="cart-shell">
        <nav className="cart-topbar">
          <Link to="/" className="cart-brand">DineFlow</Link>
          <div>
            <ThemeToggle />
            <Link className="btn btn-primary" to="/customer/checkout"><ShoppingCart size={16} /> Checkout</Link>
            <Button variant="ghost" onClick={logout}><LogOut size={16} /> Logout</Button>
          </div>
        </nav>

        <header className="cart-hero">
          <h1>Cart</h1>
          <p>Review your selected items before checkout.</p>
        </header>

        {!cart.items.length ? (
          <section className="cart-empty-panel">
            <div className="cart-empty-icon"><ShoppingCart size={44} /></div>
            <h2>Your cart is empty</h2>
            <p>Add dishes from the menu before checking out.</p>
            <Link className="btn btn-primary" to="/customer/menu"><Plus size={16} /> Add items</Link>
          </section>
        ) : (
          <section className="cart-page">
            <div className="cart-items-card">
              <div className="cart-card-title">
                <div className="cart-card-icon"><ShoppingCart size={18} /></div>
                <h2>Your items ({itemCount})</h2>
              </div>

              <div className="cart-review-list">
                {cart.items.map((item) => (
                  <article className="cart-review-row" key={item._id}>
                    <img src={menuImage(item)} onError={(event) => handleMenuImageError(event, item)} alt={item.name} />
                    <div className="cart-review-info">
                      <h3>{item.name}</h3>
                      <p>Table: {tableNumber}</p>
                    </div>
                    <strong className="cart-review-price">{money(item.price * item.quantity)}</strong>
                    <div className="cart-review-qty" aria-label={`${item.name} quantity`}>
                      <button type="button" onClick={() => cart.update(item._id, { quantity: Math.max(1, item.quantity - 1) })} aria-label={`Decrease ${item.name}`}>
                        <Minus size={16} />
                      </button>
                      <span>{item.quantity}</span>
                      <button type="button" onClick={() => cart.update(item._id, { quantity: item.quantity + 1 })} aria-label={`Increase ${item.name}`}>
                        <Plus size={16} />
                      </button>
                    </div>
                    <button className="cart-review-delete" type="button" onClick={() => cart.remove(item._id)} aria-label={`Remove ${item.name}`}>
                      <Trash2 size={18} />
                    </button>
                  </article>
                ))}
              </div>

              <Link className="cart-add-more" to="/customer/menu"><Plus size={16} /> Add more items</Link>
            </div>

            <aside className="cart-summary-card">
              <div className="cart-card-title">
                <div className="cart-card-icon"><ReceiptText size={18} /></div>
                <h2>Order summary</h2>
              </div>
              <div className="summary-totals">
                <div><span>Subtotal</span><strong>{money(subtotal)}</strong></div>
                <div><span>Service charge (10%)</span><strong>{money(serviceFee)}</strong></div>
                <div><span>Tax</span><strong>{money(tax)}</strong></div>
                <div className="grand-total"><span>Total</span><strong>{money(total)}</strong></div>
              </div>
              <Link className="cart-checkout-btn" to="/customer/checkout">
                <ShoppingCart size={18} />
                <strong>Proceed to checkout</strong>
              </Link>
              <p className="cart-secure-note"><CreditCard size={15} /> Secure & safe checkout</p>
            </aside>
          </section>
        )}
      </section>
    </CustomerLayout>
  );
}

function CheckoutPage() {
  const cart = useCart();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { subtotal, serviceFee, tax, total } = calculateOrderTotals(cart.total);
  const [form, setForm] = useState({ customerName: user?.name || "", contactNumber: user?.phone || "", tableNumber: currentTableLabel(), paymentMethod: "cash", specialInstructions: "" });
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [error, setError] = useState("");
  const [successReceipt, setSuccessReceipt] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const noteLength = form.specialInstructions.length;
  const paymentMethods = [
    { label: "Cash", value: "cash" },
    { label: "Mock Card", value: "card" },
    { label: "PayHere Test", value: "payhere" },
  ];
  const selectedPayment = paymentMethods.find((method) => method.value === form.paymentMethod) || paymentMethods[0];
  const restaurantId =
    user?.restaurantId ||
    DEFAULT_RESTAURANT_ID ||
    cart.items.find((item) => item.restaurantId)?.restaurantId?._id ||
    cart.items.find((item) => item.restaurantId)?.restaurantId;

  const redirectToPayHere = (checkoutUrl, fields) => {
    const formElement = document.createElement("form");
    formElement.method = "POST";
    formElement.action = checkoutUrl;
    formElement.style.display = "none";
    Object.entries(fields || {}).forEach(([key, value]) => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = key;
      input.value = String(value ?? "");
      formElement.appendChild(input);
    });
    document.body.appendChild(formElement);
    formElement.submit();
  };

  const placeOrder = async () => {
    setError("");

    if (!cart.items.length) {
      setError("Add dishes to your cart before placing an order.");
      return;
    }

    if (!form.customerName.trim()) {
      setError("Customer name is required.");
      return;
    }

    if (!restaurantId) {
      setError("Restaurant is not selected. Please open the menu from a restaurant/table QR code and try again.");
      return;
    }

    setSubmitting(true);
    try {
      const receiptSnapshot = {
        items: cart.items.map((item) => ({
          id: item._id,
          name: item.name,
          quantity: item.quantity,
          lineTotal: item.price * item.quantity,
        })),
        subtotal,
        serviceFee,
        tax,
        total,
        tableNumber: form.tableNumber,
        paymentMethod: selectedPayment.label,
      };
      const payload = {
        ...form,
        customerName: form.customerName.trim(),
        contactNumber: form.contactNumber.trim(),
        totalAmount: total,
        restaurantId,
        items: cart.items.map((item) => ({
          menuItem: item._id,
          quantity: item.quantity,
          price: item.price,
          specialInstructions: item.specialInstructions,
        })),
      };
      const order = unwrap(await api.post("/orders", payload));
      const paymentResponse = unwrap(await api.post("/payments", { orderId: order._id, paymentMethod: form.paymentMethod, amount: total }));
      cart.clear();
      if (form.paymentMethod === "payhere") {
        setSuccessReceipt({
          ...receiptSnapshot,
          orderId: order._id,
          orderNumber: order.orderNumber,
          paymentStatus: "redirecting",
        });
        window.setTimeout(() => redirectToPayHere(paymentResponse.checkoutUrl, paymentResponse.payhereData), 400);
        return;
      }
      setSuccessReceipt({
        ...receiptSnapshot,
        orderId: order._id,
        orderNumber: order.orderNumber,
        paymentStatus: form.paymentMethod === "payhere" ? "pending" : "paid",
      });
    } catch (err) {
      const status = err.response?.status;
      setError(
        status === 401
          ? "Your session expired. Please log in again, then place the order."
          : err.response?.data?.message || "Order could not be placed. Please check your details and try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <CustomerLayout>
      <section className="checkout-shell">
        <nav className="checkout-topbar">
          <Link to="/" className="checkout-brand">DineFlow</Link>
          <div>
            <ThemeToggle />
            <Link className="btn btn-primary" to="/customer/menu"><ShoppingCart size={16} /> Order now</Link>
            <Button variant="ghost" onClick={logout}><LogOut size={16} /> Logout</Button>
          </div>
        </nav>

        <Link className="checkout-back-link" to="/customer/menu"><ChevronLeft size={18} /> Back to menu</Link>

        <div className="checkout-title">
          <h1>Checkout</h1>
          <p>Please confirm your details and place your order.</p>
        </div>

        {!cart.items.length ? (
          successReceipt ? (
            <CheckoutSuccess receipt={successReceipt} />
          ) : (
            <div className="checkout-empty-card">
              <ShoppingCart size={34} />
              <h2>Your cart is empty</h2>
              <p>Add dishes from the menu before checking out.</p>
              <Link className="btn btn-primary" to="/customer/menu"><Plus size={16} /> Browse menu</Link>
            </div>
          )
        ) : (
          <div className="checkout-layout">
            <section className="checkout-card checkout-details-card">
              <div className="checkout-section-title">
                <Users size={18} />
                <h2>Customer details</h2>
              </div>

              <div className="checkout-field-grid">
                <label className="checkout-field">
                  <Users size={17} />
                  <span>Name</span>
                  <Input value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} placeholder="Customer name" />
                </label>
                <label className="checkout-field">
                  <MessageSquare size={17} />
                  <span>Phone number</span>
                  <Input value={form.contactNumber} onChange={(e) => setForm({ ...form, contactNumber: e.target.value })} placeholder="077 123 4567" />
                </label>
                <label className="checkout-field">
                  <Table2 size={17} />
                  <span>Table</span>
                  <Input value={form.tableNumber} onChange={(e) => setForm({ ...form, tableNumber: e.target.value })} placeholder="Table number" />
                </label>
                <label className="checkout-field">
                  <CreditCard size={17} />
                  <span>Payment method</span>
                  <div className="checkout-payment-select">
                    <button
                      type="button"
                      className="checkout-payment-trigger"
                      onClick={() => setPaymentOpen((open) => !open)}
                      aria-expanded={paymentOpen}
                    >
                      {selectedPayment.label}
                      <ChevronDown size={16} />
                    </button>
                    {paymentOpen && (
                      <div className="checkout-payment-menu">
                        {paymentMethods.map((method) => (
                          <button
                            type="button"
                            className={form.paymentMethod === method.value ? "active" : ""}
                            key={method.value}
                            onClick={() => {
                              setForm({ ...form, paymentMethod: method.value });
                              setPaymentOpen(false);
                            }}
                          >
                            {method.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </label>
              </div>

              <label className="checkout-notes">
                <div className="checkout-section-title">
                  <MessageSquare size={18} />
                  <h2>Order notes <span>(optional)</span></h2>
                </div>
                <textarea
                  className="input textarea"
                  maxLength={200}
                  placeholder="Add any special instructions..."
                  value={form.specialInstructions}
                  onChange={(e) => setForm({ ...form, specialInstructions: e.target.value })}
                />
                <span>{noteLength} / 200</span>
              </label>

              {error && <p className="checkout-error">{error}</p>}

              <div className="checkout-total-strip">
                <span>Total</span>
                <strong>{money(total)}</strong>
              </div>

              <Button className="checkout-place-order" disabled={submitting || !cart.items.length} onClick={placeOrder}>
                <CreditCard size={16} /> {submitting ? "Placing order..." : "Place order"}
              </Button>
            </section>

            <aside className="checkout-card checkout-summary-card">
              <div className="checkout-section-title">
                <ShoppingCart size={18} />
                <h2>Order summary</h2>
              </div>

              <div className="checkout-summary-list">
                {cart.items.map((item) => (
                  <article className="checkout-summary-item" key={item._id}>
                    <img src={menuImage(item)} onError={(event) => handleMenuImageError(event, item)} alt={item.name} />
                    <div>
                      <h3>{item.name}</h3>
                      <p>Table {form.tableNumber || "01"}</p>
                    </div>
                    <div>
                      <strong>{money(item.price * item.quantity)}</strong>
                      <span>x {item.quantity}</span>
                    </div>
                  </article>
                ))}
              </div>

              <div className="checkout-summary-totals">
                <div><span>Subtotal</span><strong>{money(subtotal)}</strong></div>
                <div><span>Service charge (10%)</span><strong>{money(serviceFee)}</strong></div>
                <div><span>Tax</span><strong>{money(tax)}</strong></div>
                <div className="checkout-grand-total"><span>Total</span><strong>{money(total)}</strong></div>
              </div>
            </aside>
          </div>
        )}
      </section>
    </CustomerLayout>
  );
}

function CheckoutSuccess({ receipt }) {
  return (
    <section className="checkout-success-card">
      <div className="checkout-success-icon">
        <CheckCircle2 size={42} />
      </div>
      <span className="eyebrow">Order placed</span>
      <h2>Your order was placed successfully</h2>
      <p>
        {receipt.orderNumber
          ? `Order ${receipt.orderNumber} has been sent to the kitchen.`
          : "Your order has been sent to the kitchen."}
      </p>

      <div className="checkout-success-receipt">
        <div className="checkout-success-row">
          <span>Table</span>
          <strong>{receipt.tableNumber}</strong>
        </div>
        <div className="checkout-success-row">
          <span>Payment</span>
          <strong>{receipt.paymentMethod}</strong>
        </div>
        <div className="checkout-success-row">
          <span>Status</span>
          <strong>{receipt.paymentStatus}</strong>
        </div>
        <div className="checkout-success-items">
          {receipt.items.map((item) => (
            <div key={item.id || item.name}>
              <span>{item.quantity} x {item.name}</span>
              <strong>{money(item.lineTotal)}</strong>
            </div>
          ))}
        </div>
        <div className="checkout-success-total">
          <span>Total paid</span>
          <strong>{money(receipt.total)}</strong>
        </div>
      </div>

      <div className="checkout-success-actions">
        <Link className="btn btn-primary" to={`/customer/tracking/${receipt.orderNumber || receipt.orderId}`}>
          <ReceiptText size={16} /> Track order
        </Link>
        <Link className="btn btn-soft" to="/customer/menu">
          <Plus size={16} /> Add more food
        </Link>
      </div>
    </section>
  );
}

function PaymentPage() {
  const { orderId } = useParams();
  const location = useLocation();
  const { data: order, load } = useResource(`/orders/${orderId}`, null);
  const { data: payment } = useResource(`/payments/order/${orderId}`, null);
  const paymentStatus = new URLSearchParams(location.search).get("status");

  useEffect(() => {
    const timer = window.setInterval(load, 3000);
    return () => window.clearInterval(timer);
  }, [load]);

  return (
    <CustomerLayout>
      <Header title="Payment" />
      <div className="payment-card">
        <CreditCard size={40} />
        <h2>{order?.paymentStatus === "paid" ? "Payment complete" : paymentStatus === "cancel" ? "Payment cancelled" : "Payment pending"}</h2>
        <p>
          {order?.paymentStatus === "paid"
            ? "Your PayHere payment was verified and the order has been updated."
            : paymentStatus === "cancel"
              ? "The PayHere checkout was cancelled. You can return to the menu and place the order again."
              : "Waiting for PayHere confirmation. This page will refresh automatically when the payment notification arrives."}
        </p>
        {payment?.transactionId && <p className="muted">Transaction ID: {payment.transactionId}</p>}
        <Link className="btn btn-primary" to={`/customer/tracking/${order?.orderNumber || orderId}`}>Track order</Link>
      </div>
    </CustomerLayout>
  );
}

function TrackingPage() {
  const { orderId } = useParams();
  const path = orderId ? `/orders/${orderId}` : "/orders/my";
  const { data, load } = useResource(path, orderId ? null : []);
  const { socket } = useSocket();
  const { logout } = useAuth();
  const orders = orderId ? (data ? [data] : []) : data;
  const activeOrders = orders.filter((order) => isActiveOrder(order));
  const visibleOrders = orderId ? orders.filter(Boolean) : activeOrders;
  const completedToday = orders.filter((order) => {
    const date = new Date(order.updatedAt || order.createdAt || Date.now());
    const today = new Date();
    return ["served", "completed"].includes(order.status) && date.toDateString() === today.toDateString();
  }).length;
  const now = new Date();
  const displayDate = now.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const displayDay = now.toLocaleDateString("en-US", { weekday: "long" });

  useEffect(() => {
    if (!socket) return;
    if (orderId) {
      socket.emit("join-order", orderId);
      socket.emit("order:subscribe", { orderNumber: orderId });
    }
    socket.on("order:update", load);
    return () => socket.off("order:update", load);
  }, [socket, orderId]);

  return (
    <CustomerLayout>
      <section className="tracking-shell">
        <nav className="tracking-topbar">
          <Link to="/" className="tracking-brand">DineFlow</Link>
          <div>
            <ThemeToggle />
            <Link className="btn btn-primary" to="/customer/menu"><Plus size={16} /> Order now</Link>
            <Button variant="ghost" onClick={logout}><LogOut size={16} /> Logout</Button>
          </div>
        </nav>

        <header className="tracking-hero">
          <div>
            <h1>Live order tracking</h1>
            <p>Track your live orders in real-time and stay updated on the kitchen status.</p>
          </div>
        </header>

        <section className="tracking-stat-grid" aria-label="Order tracking summary">
          <TrackingStat icon={ClipboardList} label="Active orders" value={activeOrders.length} text="Currently in progress" />
          <TrackingStat icon={Clock} label="Completed today" value={completedToday} text="Orders delivered" />
          <TrackingStat icon={PackageCheck} label="Estimated delivery" value="25 - 30 min" text="Average kitchen time" />
          <TrackingStat icon={CalendarDays} label="Date" value={displayDate} text={displayDay} />
        </section>

        {orderId && !data ? (
          <section className="tracking-empty-panel">
            <div className="tracking-empty-icon"><ShoppingCart size={48} /></div>
            <h2>Order not found</h2>
            <p>Check the order number and try again.</p>
            <Link className="btn btn-primary" to="/customer/menu"><ShoppingCart size={16} /> Place an order</Link>
          </section>
        ) : visibleOrders.length ? (
          <section className="tracking-live-list">
            {visibleOrders.map((order) => <TrackingOrderCard order={order} key={order._id || order.orderNumber} />)}
          </section>
        ) : (
          <section className="tracking-empty-panel">
            <div className="tracking-empty-icon"><ShoppingCart size={48} /></div>
            <h2>No active orders right now</h2>
            <p>You do not have any live orders at the moment.<br />When you place an order, you can track it here.</p>
            <Link className="btn btn-primary" to="/customer/menu"><ShoppingCart size={16} /> Place an order</Link>
          </section>
        )}
      </section>
    </CustomerLayout>
  );
}

function isActiveOrder(order) {
  return order && !["completed", "cancelled"].includes(order.status);
}

function TrackingStat({ icon: Icon, label, value, text }) {
  return (
    <article className="tracking-stat-card">
      <div className="tracking-stat-icon"><Icon size={24} /></div>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        <span>{text}</span>
      </div>
    </article>
  );
}

function OrderTracker({ order }) {
  if (!order) return <EmptyState title="Order not found" text="Check the order number and try again." />;
  const index = orderStatuses.indexOf(order.status);
  return (
    <div className="tracker">
      <h2>{order.orderNumber}</h2>
      <StatusBadge status={order.status} />
      <div className="steps">{orderStatuses.slice(0, 6).map((status, idx) => <div className={idx <= index ? "done" : ""} key={status}><span />{status}</div>)}</div>
      <OrderList orders={[order]} />
    </div>
  );
}

function TrackingOrderCard({ order }) {
  const activeStepIndex = Math.max(0, orderStatuses.slice(0, 6).indexOf(order.status));
  const items = order.items || [];
  const itemCount = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const placedAt = new Date(order.createdAt || Date.now()).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  return (
    <article className="tracking-order-card">
      <div className="tracking-order-head">
        <div>
          <span className="eyebrow">Current order</span>
          <h2>{order.orderNumber}</h2>
          <p>Table {order.tableNumber} - {itemCount || items.length} item{itemCount === 1 ? "" : "s"} - Placed {placedAt}</p>
        </div>
        <div>
          <StatusBadge status={order.status} />
          <strong>{money(order.totalAmount)}</strong>
        </div>
      </div>

      <div className="tracking-steps">
        {orderStatuses.slice(0, 6).map((status, index) => (
          <div className={index <= activeStepIndex ? "done" : ""} key={status}>
            <span>{index + 1}</span>
            <p>{status}</p>
          </div>
        ))}
      </div>

      <div className="tracking-order-items">
        {items.slice(0, 4).map((item) => (
          <div key={item._id || item.menuItem || item.name}>
            <span>{item.quantity} x {item.name}</span>
            <strong>{money(Number(item.price || 0) * Number(item.quantity || 1))}</strong>
          </div>
        ))}
        {items.length > 4 && <p>+ {items.length - 4} more item{items.length - 4 === 1 ? "" : "s"}</p>}
      </div>
    </article>
  );
}

function OrderList({ orders = [] }) {
  if (!orders.length) return <EmptyState title="No orders yet" text="Orders will appear here as soon as they are placed." />;
  return <div className="order-list">{orders.map((order) => <OrderCard key={order._id} order={order} />)}</div>;
}

function OrderCard({ order, actions }) {
  return (
    <article className="order-card">
      <div><h3>{order.orderNumber}</h3><p>Table {order.tableNumber} - {order.customerName}</p></div>
      <StatusBadge status={order.status} />
      <strong>{money(order.totalAmount)}</strong>
      {actions}
    </article>
  );
}

function ReservationPage() {
  const { user } = useAuth();
  const { logout } = useAuth();
  const { socket } = useSocket();
  const { data: reservations, load } = useResource("/reservations");
  const [form, setForm] = useState({
    date: "",
    time: "19:00",
    persons: 2,
    customerName: user?.name || "",
    contactNumber: user?.phone || "",
    tableId: "",
    notes: "",
    restaurantId: user?.restaurantId || DEFAULT_RESTAURANT_ID,
  });
  const [availableTables, setAvailableTables] = useState([]);
  const [checkingTables, setCheckingTables] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const selectedTable = availableTables.find((table) => table._id === form.tableId);
  const canCheckTables = form.date && form.time && form.persons;

  useEffect(() => {
    if (!socket) return;
    const handleReservationMessage = (payload) => {
      setMessage(payload.message || "Your reservation status was updated.");
      load();
    };
    socket.on("reservation:notification", handleReservationMessage);
    socket.on("reservation:update", load);
    return () => {
      socket.off("reservation:notification", handleReservationMessage);
      socket.off("reservation:update", load);
    };
  }, [socket]);

  useEffect(() => {
    const checkTables = async () => {
      if (!canCheckTables) {
        setAvailableTables([]);
        return;
      }

      setCheckingTables(true);
      setError("");
      try {
        const params = new URLSearchParams({
          date: form.date,
          time: form.time,
          persons: String(form.persons),
        });
        if (form.restaurantId) params.set("restaurantId", form.restaurantId);
        const tables = unwrap(await api.get(`/reservations/available-tables?${params.toString()}`));
        setAvailableTables(tables);
        if (form.tableId && !tables.some((table) => table._id === form.tableId)) {
          setForm((current) => ({ ...current, tableId: "" }));
        }
      } catch (err) {
        setAvailableTables([]);
        setError(err.response?.data?.message || "Could not check available tables.");
      } finally {
        setCheckingTables(false);
      }
    };

    checkTables();
  }, [form.date, form.time, form.persons, form.restaurantId]);

  const submit = async () => {
    setMessage("");
    setError("");

    if (!form.date || !form.time || !form.persons || !form.customerName.trim() || !form.contactNumber.trim()) {
      setError("Please fill all reservation details before submitting.");
      return;
    }

    if (!form.tableId) {
      setError("Please choose an available table before reserving.");
      return;
    }

    try {
      await api.post("/reservations", {
        ...form,
        persons: Number(form.persons),
        customerName: form.customerName.trim(),
        contactNumber: form.contactNumber.trim(),
      });
      setMessage("Reservation request sent. Admin will confirm your table soon.");
      setForm((current) => ({ ...current, tableId: "", notes: "" }));
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Reservation could not be created. Please try again.");
    }
  };

  return (
    <CustomerLayout>
      <section className="reservation-shell">
        <nav className="reservation-topbar">
          <Link to="/" className="reservation-brand">DineFlow</Link>
          <div>
            <ThemeToggle />
            <Link className="btn btn-primary" to="/customer/menu"><Plus size={16} /> Order now</Link>
            <Button variant="ghost" onClick={logout}><LogOut size={16} /> Logout</Button>
          </div>
        </nav>

        <header className="reservation-hero">
          <div>
            <h1>Reservation</h1>
            <p>Book your table in advance and enjoy a great dining experience.</p>
          </div>
        </header>

        <div className="reservation-layout">
          <section className="reservation-card reservation-form-card">
            <div className="reservation-section-title">
              <CalendarDays size={18} />
              <h2>Reservation details</h2>
            </div>

            <div className="reservation-field-grid">
              <label className="reservation-field">
                <span>Date</span>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value, tableId: "" })} />
                <CalendarDays size={17} />
              </label>
              <label className="reservation-field">
                <span>Time</span>
                <Input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value, tableId: "" })} />
                <Clock size={17} />
              </label>
              <label className="reservation-field">
                <span>Number of guests</span>
                <Input type="number" min="1" value={form.persons} onChange={(e) => setForm({ ...form, persons: Number(e.target.value), tableId: "" })} />
                <Users size={17} />
              </label>
              <label className="reservation-field">
                <span>Customer name</span>
                <Input value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} placeholder="Demo Customer" />
                <Users size={17} />
              </label>
              <label className="reservation-field full">
                <span>Phone number</span>
                <Input value={form.contactNumber} onChange={(e) => setForm({ ...form, contactNumber: e.target.value })} placeholder="077 123 4567" />
                <MessageSquare size={17} />
              </label>
            </div>

            <div className="reservation-table-picker">
              <div>
                <h3>Available tables</h3>
                <p>{canCheckTables ? "Choose one table for your reservation request." : "Select date, time, and guests to check tables."}</p>
              </div>
              <div className="reservation-table-grid">
                {checkingTables ? (
                  <p className="reservation-muted">Checking tables...</p>
                ) : availableTables.length ? (
                  availableTables.map((table) => (
                    <button
                      type="button"
                      className={form.tableId === table._id ? "selected" : ""}
                      key={table._id}
                      onClick={() => setForm({ ...form, tableId: table._id })}
                    >
                      <Table2 size={18} />
                      <strong>Table {table.tableNumber}</strong>
                      <span>{table.capacity} seats</span>
                    </button>
                  ))
                ) : (
                  <p className="reservation-muted">{canCheckTables ? "No available tables for this slot." : "Waiting for booking details."}</p>
                )}
              </div>
            </div>

            <label className="reservation-notes">
              <span>Special request</span>
              <textarea className="input textarea" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Window seat, birthday setup, high chair..." />
            </label>

            <div className="reservation-note">
              <Bell size={16} />
              <p><strong>Note:</strong> Please arrive on time for your reservation. We will hold your table for 15 minutes.</p>
            </div>

            {message && <p className="reservation-success">{message}</p>}
            {error && <p className="checkout-error">{error}</p>}

            <Button className="reservation-submit" onClick={submit}>
              <CalendarDays size={16} /> Reserve table
            </Button>
          </section>

          <aside className="reservation-card reservation-summary-card">
            <div className="reservation-image" />
            <div className="reservation-summary-body">
              <h2>Reservation summary</h2>
              <ReservationSummaryRow icon={CalendarDays} label="Date" value={form.date ? new Date(form.date).toLocaleDateString() : "Not selected"} />
              <ReservationSummaryRow icon={Clock} label="Time" value={form.time || "Not selected"} />
              <ReservationSummaryRow icon={Users} label="Guests" value={form.persons ? `${form.persons} guests` : "Not selected"} />
              <ReservationSummaryRow icon={Table2} label="Table" value={selectedTable ? `Table ${selectedTable.tableNumber}` : "Not selected"} />
              <ReservationSummaryRow icon={Users} label="Customer" value={form.customerName || "Not selected"} />
              <ReservationSummaryRow icon={MessageSquare} label="Phone" value={form.contactNumber || "Not selected"} />
              <p>Admin confirmation will appear below after your request is reviewed.</p>
            </div>
          </aside>
        </div>

        <section className="reservation-history">
          <div className="reservation-section-title">
            <ReceiptText size={18} />
            <h2>Your reservations</h2>
          </div>
          {reservations.length ? (
            <div className="reservation-history-list">
              {reservations.slice(0, 4).map((reservation) => (
                <article key={reservation._id}>
                  <div>
                    <h3>{new Date(reservation.date).toLocaleDateString()} at {reservation.time}</h3>
                    <p>Table {reservation.tableId?.tableNumber || "pending"} - {reservation.persons} guests</p>
                  </div>
                  <StatusBadge status={reservation.status} />
                </article>
              ))}
            </div>
          ) : (
            <p className="reservation-muted">No reservation requests yet.</p>
          )}
        </section>
      </section>
    </CustomerLayout>
  );
}

function ReservationSummaryRow({ icon: Icon, label, value }) {
  return (
    <div className="reservation-summary-row">
      <Icon size={16} />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ReviewPage() {
  const { data: orders } = useResource("/orders/my");
  const { user } = useAuth();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [orderId, setOrderId] = useState("");
  const submit = async () => {
    await api.post("/reviews", { rating, comment, orderId, restaurantId: user?.restaurantId || DEFAULT_RESTAURANT_ID });
    setComment("");
  };
  return (
    <CustomerLayout>
      <Header title="Review" />
      <div className="form-grid">
        <select className="input" value={orderId} onChange={(e) => setOrderId(e.target.value)}>{orders.map((order) => <option value={order._id} key={order._id}>{order.orderNumber}</option>)}</select>
        <Input type="number" min="1" max="5" value={rating} onChange={(e) => setRating(Number(e.target.value))} />
        <textarea className="input textarea" placeholder="Share your experience" value={comment} onChange={(e) => setComment(e.target.value)} />
        <Button onClick={submit}><Star size={16} /> Submit review</Button>
      </div>
    </CustomerLayout>
  );
}

function AIChatbot({ menu = [], orders = [] }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const sessionId = useMemo(
    () => localStorage.getItem("dineflow_dashboard_ai_session") || `dineflow-dashboard-${crypto.randomUUID?.() || Date.now()}`,
    [],
  );
  const menuCategories = useMemo(() => [...new Set(menu.map((item) => item.category).filter(Boolean))].slice(0, 3), [menu]);
  const menuTags = useMemo(() => [...new Set(menu.flatMap((item) => item.tags || []).filter(Boolean))].slice(0, 3), [menu]);
  const suggestionPrompts = useMemo(() => {
    const categoryPrompts = menuCategories.map((category) => ({
      label: category,
      prompt: `Recommend ${category} dishes from our menu`,
    }));
    const tagPrompts = menuTags.map((tag) => ({
      label: tag.replace(/-/g, " "),
      prompt: `Show ${tag.replace(/-/g, " ")} options from our menu`,
    }));
    const lastOrderItems = (orders[0]?.items || [])
      .map((item) => item.name || item.menuItem?.name)
      .filter(Boolean)
      .slice(0, 1)
      .map((name) => ({
        label: "Similar",
        prompt: `Recommend something similar to ${name}`,
      }));

    return [...lastOrderItems, ...categoryPrompts, ...tagPrompts].slice(0, 4);
  }, [menuCategories, menuTags, orders]);

  useEffect(() => {
    localStorage.setItem("dineflow_dashboard_ai_session", sessionId);
  }, [sessionId]);

  const buildLocalRecommendations = (query) => {
    const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
    const orderedIds = new Set(
      orders.flatMap((order) =>
        (order.items || []).map((item) => String(item.menuItem?._id || item.menuItem || item._id || ""))
      )
    );

    return menu
      .map((item) => {
        const searchable = [
          item.name,
          item.category,
          item.description,
          ...(item.tags || []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        const preferenceScore = tokens.reduce((score, token) => score + (searchable.includes(token) ? 10 : 0), 0);
        const popularityScore = Number(item.orderCount || 0) + Number(item.rating || 0);
        const historyScore = orderedIds.has(String(item._id)) ? 8 : 0;
        return { ...item, score: preferenceScore + popularityScore + historyScore };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  };

  const formatRecommendations = (items) => {
    if (!items.length) {
      return "Menu data is not available yet. Add active menu items to generate recommendations.";
    }

    return items
      .map((item) => `${item.name} - ${money(item.price)}${item.recommendationReason ? ` (${item.recommendationReason})` : ""}`)
      .join("\n");
  };

  const ask = async () => {
    if (!text.trim() || busy) return;
    const userText = text;
    setMessages((current) => [...current, { from: "user", text: userText }]);
    setText("");
    setBusy(true);
    try {
      const data = unwrap(await api.post("/ai/chat", {
        message: userText,
        sessionId,
        userId: user?._id || user?.id || "guest",
        context: {
          role: user?.role || "customer",
          restaurantId: user?.restaurantId || DEFAULT_RESTAURANT_ID || undefined,
          table: orders[0]?.tableNumber || currentTableLabel("demo-table"),
        },
      }));
      setMessages((current) => [
        ...current,
        { from: "bot", text: data.reply || "I could not generate a reply right now." },
      ]);
    } catch {
      setMessages((current) => [...current, { from: "bot", text: formatRecommendations(buildLocalRecommendations(userText)) }]);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="chat">
      <div className="chat-head">
        <div>
          <span className="eyebrow">AI assistant</span>
          <h2><Bot size={20} /> Food assistant</h2>
        </div>
        <span className="chat-live">Online</span>
      </div>
      <div className="chat-suggestions">
        {suggestionPrompts.map((suggestion) => (
          <button type="button" onClick={() => setText(suggestion.prompt)} key={suggestion.prompt}>
            {suggestion.label}
          </button>
        ))}
      </div>
      <div className="chat-messages">
        {messages.length ? (
          messages.map((message, index) => <p className={message.from} key={index}>{message.text}</p>)
        ) : (
          <div className="chat-empty">
            <strong>{menu.length ? `${menu.length} menu items ready` : "No menu items available"}</strong>
            <span>{menu.length ? "Ask for recommendations using your live menu data." : "Add menu items to enable AI recommendations."}</span>
          </div>
        )}
        {busy && <p className="bot">Thinking...</p>}
      </div>
      <label><Input value={text} onChange={(e) => setText(e.target.value)} placeholder="What should I order?" /><Button onClick={ask} disabled={busy || !text.trim()}><MessageSquare size={16} /></Button></label>
    </section>
  );
}

function StaffLayout({ role, children }) {
  const links = role === "admin"
    ? [{ to: "/admin", label: "Dashboard", icon: LayoutDashboard }, { to: "/admin/users", label: "Users", icon: Users }, { to: "/admin/attendance", label: "Attendance", icon: CalendarDays }, { to: "/admin/payroll", label: "Payroll", icon: WalletCards }, { to: "/admin/menu", label: "Menu", icon: Utensils }, { to: "/admin/inventory", label: "Inventory", icon: PackageCheck }, { to: "/admin/tables", label: "Tables", icon: Table2 }, { to: "/admin/reservations", label: "Reservations", icon: CalendarDays }, { to: "/admin/reports", label: "Reports", icon: BarChart3 }]
    : role === "waiter"
      ? [{ to: "/waiter", label: "Orders", icon: Bell }, { to: "/waiter/attendance", label: "Attendance", icon: Clock }, { to: "/waiter/profile", label: "Profile", icon: Users }, { to: "/waiter/tables", label: "Tables", icon: Table2 }, { to: "/waiter/manual-order", label: "Manual", icon: Plus }]
      : [{ to: "/kitchen", label: "Board", icon: ChefHat }, { to: "/kitchen/attendance", label: "Attendance", icon: Clock }, { to: "/kitchen/inventory", label: "Stock", icon: ClipboardList }];
  return <div className={`dashboard-shell ${role === "admin" ? "admin-shell" : ""} ${role}-shell`}><Sidebar links={links} showPremium={role !== "waiter"} /><main>{children}</main></div>;
}

function StaffAttendanceWidget() {
  const { data: records, load } = useResource("/staff/attendance/me");
  const { data: qrData } = useResource("/staff/attendance/qr", {});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [scanOpen, setScanOpen] = useState(false);
  const [manualQr, setManualQr] = useState("");
  const scannerId = useRef(`attendance-qr-reader-${Math.random().toString(36).slice(2)}`);
  const latest = records[0];
  const activeRecord = records.find((record) => record.checkInTime && !record.checkOutTime);
  const todayKey = new Date().toDateString();
  const todayRecord = records.find((record) => new Date(record.date).toDateString() === todayKey) || activeRecord || latest;
  const isCheckedIn = Boolean(activeRecord);
  const formatTime = (value) => value ? new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-";
  const workedToday = todayRecord?.workingHours || todayRecord?.workedHours || 0;
  const getLocation = () => new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({});
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      () => resolve({}),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  });

  const checkIn = async () => {
    setError("");
    setMessage("");
    try {
      const location = await getLocation();
      await api.post("/staff/attendance/check-in", location);
      setMessage("Checked in successfully.");
      await load();
    } catch (err) {
      setError(apiErrorMessage(err, "Could not check in."));
    }
  };

  const checkOut = async () => {
    setError("");
    setMessage("");
    try {
      const location = await getLocation();
      await api.patch("/staff/attendance/check-out", location);
      setMessage("Checked out successfully.");
      await load();
    } catch (err) {
      setError(apiErrorMessage(err, "Could not check out."));
    }
  };

  const markFromQr = async (qrPayload) => {
    setError("");
    setMessage("");
    try {
      const location = await getLocation();
      const result = unwrap(await api.post("/staff/attendance/scan", { qrPayload, ...location }));
      setMessage(result?.checkOutTime ? "Checked out from QR." : "Checked in from QR.");
      setManualQr("");
      await load();
    } catch (err) {
      setError(apiErrorMessage(err, "Could not mark attendance from QR."));
    }
  };

  useEffect(() => {
    if (!scanOpen) return undefined;
    const scanner = new Html5QrcodeScanner(scannerId.current, { fps: 10, qrbox: { width: 240, height: 240 } }, false);
    scanner.render(
      async (decodedText) => {
        await scanner.clear();
        setScanOpen(false);
        await markFromQr(decodedText);
      },
      () => {}
    );
    return () => {
      scanner.clear().catch(() => {});
    };
  }, [scanOpen]);

  return (
    <section className="chart-card staff-attendance-widget">
      <div className="reservation-section-title">
        <Clock size={18} />
        <h2>Mark attendance</h2>
      </div>
      {message && <p className="success">{message}</p>}
      {error && <p className="error">{error}</p>}
      <div className="staff-attendance-actions">
        <Button onClick={checkIn} disabled={isCheckedIn}><Clock size={16} /> Check in</Button>
        <Button variant="soft" onClick={checkOut} disabled={!isCheckedIn}><CheckCircle2 size={16} /> Check out</Button>
        <Button variant="ghost" onClick={() => setScanOpen((current) => !current)}><QrCode size={16} /> {scanOpen ? "Close scanner" : "Scan QR"}</Button>
        <Button variant="soft" onClick={() => qrData.qrPayload && markFromQr(qrData.qrPayload)} disabled={!qrData.qrPayload}><ScanQrCode size={16} /> Use my QR</Button>
      </div>
      <div className="staff-attendance-qr-panel">
        <div className="staff-attendance-qr-card">
          {qrData.qrPayload ? <QRCodeSVG value={qrData.qrPayload} size={116} /> : <QrCode size={48} />}
          <div>
            <strong>{qrData.staffName || "Staff QR"}</strong>
            <span>{qrData.role || "attendance"} unique QR code</span>
          </div>
        </div>
        <div className="staff-attendance-scan-box">
          {scanOpen && <div id={scannerId.current} className="staff-qr-reader" />}
          <label>
            <span className="sr-only">Attendance QR payload</span>
            <Input value={manualQr} onChange={(event) => setManualQr(event.target.value)} placeholder="Paste scanned QR code here" />
          </label>
          <Button variant="ghost" onClick={() => markFromQr(manualQr)} disabled={!manualQr.trim()}><ScanQrCode size={16} /> Mark from code</Button>
        </div>
      </div>
      <div className="staff-attendance-summary">
        <span>
          <small>Status</small>
          <strong>{isCheckedIn ? "Checked in" : todayRecord?.checkOutTime ? "Checked out" : "Not marked"}</strong>
        </span>
        <span>
          <small>Check in</small>
          <strong>{formatTime(todayRecord?.checkInTime)}</strong>
        </span>
        <span>
          <small>Check out</small>
          <strong>{formatTime(todayRecord?.checkOutTime)}</strong>
        </span>
        <span>
          <small>Today hours</small>
          <strong>{workedToday}h</strong>
        </span>
      </div>
      <p className="muted">{todayRecord ? `${new Date(todayRecord.date).toLocaleDateString()} - ${todayRecord.status}` : "No attendance record yet."}</p>
    </section>
  );
}

function WaiterDashboard() {
  const { user } = useAuth();
  const { data: orders, load } = useResource("/waiter/orders");
  const { alerts, socket } = useSocket();
  const markServed = async (id) => { await api.patch(`/waiter/orders/${id}/served`); load(); };
  const markCompleted = async (id) => { await api.patch(`/waiter/orders/${id}/completed`); load(); };
  const isToday = (value) => value && new Date(value).toDateString() === new Date().toDateString();
  const servedById = (order) => typeof order.servedBy === "object" ? (order.servedBy?._id || order.servedBy?.id) : order.servedBy;
  const isServedByMeToday = (order) => order.status === "served" && servedById(order) === user?.id && isToday(order.servedAt || order.updatedAt);
  const isCompletedByMeToday = (order) => order.status === "completed" && servedById(order) === user?.id && isToday(order.servedAt || order.updatedAt);
  const waiterStatuses = [
    { key: "accepted", emptyTitle: "No orders accepted yet.", emptyText: "New orders will appear here.", icon: ClipboardList },
    { key: "preparing", emptyTitle: "No orders preparing.", emptyText: "Orders being prepared will appear here.", icon: ChefHat },
    { key: "ready", emptyTitle: "No ready orders.", emptyText: "Kitchen-ready orders will appear here.", icon: Bell },
    { key: "served", emptyTitle: "No orders served by you today.", emptyText: "Orders you serve today will appear here.", icon: CheckCircle2 },
    { key: "completed", emptyTitle: "No completed orders today.", emptyText: "Completed orders you handled today will appear here.", icon: CheckCircle2 },
  ];
  useEffect(() => {
    if (!socket) return undefined;
    socket.emit("join-role", "waiter");
    socket.on("order:update", load);
    socket.on("order:ready", load);
    return () => {
      socket.off("order:update", load);
      socket.off("order:ready", load);
    };
  }, [socket]);
  return (
    <StaffLayout role="waiter">
      <Header title="Waiter mobile dashboard" actions={<PwaInstallButton />} />
      <div className="alert-strip">{alerts.map((alert) => <span key={alert.id}><Bell size={14} /> {alert.text}</span>)}</div>
      <div className="kanban waiter-order-board">
        {waiterStatuses.map(({ key, emptyTitle, emptyText, icon: EmptyIcon }) => {
          const statusOrders = key === "served"
            ? orders.filter(isServedByMeToday)
            : key === "completed"
              ? orders.filter(isCompletedByMeToday)
              : orders.filter((order) => order.status === key);
          return (
            <section key={key}>
              <h2>{key}<span>{statusOrders.length}</span></h2>
              {statusOrders.length ? (
                statusOrders.map((order) => (
                  <OrderCard
                    order={order}
                    key={order._id}
                    actions={
                      key === "ready"
                        ? <Button onClick={() => markServed(order._id)}>Served</Button>
                        : key === "served"
                          ? <Button variant="soft" onClick={() => markCompleted(order._id)}>Complete</Button>
                          : null
                    }
                  />
                ))
              ) : (
                <div className="waiter-empty-column">
                  <EmptyIcon size={48} />
                  <strong>{emptyTitle}</strong>
                  <p>{emptyText}</p>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </StaffLayout>
  );
}

function StaffQrDownloadCard({ title = "Attendance QR", description = "Download this QR and use it only at the Staff Attendance Kiosk. Dashboard attendance marking has been removed." } = {}) {
  const { data: qrData } = useResource("/staff/attendance/qr", {});
  const qrRef = useRef(null);
  const [message, setMessage] = useState("");

  const downloadQr = () => {
    if (!qrRef.current || !qrData.qrPayload) return;
    const svgText = new XMLSerializer().serializeToString(qrRef.current);
    const svgBlob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 640;
      canvas.height = 760;
      const context = canvas.getContext("2d");
      context.fillStyle = "#fff8e1";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = "#21170b";
      context.font = "700 34px Arial";
      context.fillText("DineFlow Attendance QR", 52, 70);
      context.font = "600 22px Arial";
      context.fillText(qrData.staffName || "Staff member", 52, 112);
      context.fillStyle = "#8b6f00";
      context.font = "700 18px Arial";
      context.fillText(`${qrData.role || "staff"} unique QR code`, 52, 144);
      context.drawImage(image, 120, 190, 400, 400);
      context.fillStyle = "#5f5546";
      context.font = "600 16px Arial";
      context.fillText("Use this QR at the Staff Attendance Kiosk.", 52, 670);
      URL.revokeObjectURL(url);
      const link = document.createElement("a");
      link.download = `dineflow-attendance-qr-${qrData.staffName || "staff"}.png`.replace(/\s+/g, "-").toLowerCase();
      link.href = canvas.toDataURL("image/png");
      link.click();
      setMessage("QR downloaded.");
    };
    image.src = url;
  };

  return (
    <section className="chart-card waiter-qr-download-card">
      <div className="reservation-section-title">
        <QrCode size={18} />
        <h2>{title}</h2>
      </div>
      <div className="waiter-qr-download-body">
        <div className="waiter-qr-frame">
          {qrData.qrPayload ? <QRCodeSVG ref={qrRef} value={qrData.qrPayload} size={180} /> : <QrCode size={72} />}
        </div>
        <div>
          <span className="eyebrow">Kiosk access</span>
          <h3>{qrData.staffName || "Your attendance QR"}</h3>
          <p>{description}</p>
          <Button onClick={downloadQr} disabled={!qrData.qrPayload}><QrCode size={16} /> Download QR</Button>
          {message && <p className="success">{message}</p>}
        </div>
      </div>
    </section>
  );
}

function WaiterTables() {
  const { data: tables, load } = useResource("/tables");
  const toggle = async (table) => { await api.patch(`/waiter/tables/${table._id}/status`, { isOccupied: !table.isOccupied }); load(); };
  return (
    <StaffLayout role="waiter">
      <Header title="Assigned tables" />
      <div className="table-grid">{tables.map((table) => <div className="table-card" key={table._id}><Table2 /><h3>Table {table.tableNumber}</h3><p>{table.capacity} seats</p><StatusBadge status={table.isOccupied ? "occupied" : "free"} /><Button onClick={() => toggle(table)}>{table.isOccupied ? "Mark free" : "Mark occupied"}</Button></div>)}</div>
    </StaffLayout>
  );
}

function WaiterAttendancePage() {
  const { data: records } = useResource("/staff/attendance/me");
  const columns = [
    { key: "date", label: "Date", render: (row) => new Date(row.date).toLocaleDateString() },
    { key: "checkInTime", label: "Check in", render: (row) => row.checkInTime ? new Date(row.checkInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-" },
    { key: "checkOutTime", label: "Check out", render: (row) => row.checkOutTime ? new Date(row.checkOutTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-" },
    { key: "workingHours", label: "Hours", render: (row) => `${row.workingHours || row.workedHours || 0}h` },
    { key: "overtimeHours", label: "Overtime", render: (row) => `${row.overtimeHours || 0}h` },
    { key: "method", label: "Method", render: (row) => <StatusBadge status={row.method || "manual"} /> },
    { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status} /> },
  ];

  return (
    <StaffLayout role="waiter">
      <Header title="My attendance" />
      <StaffQrDownloadCard />
      <section className="chart-card waiter-attendance-records">
        <div className="reservation-section-title">
          <CalendarDays size={18} />
          <h2>Recent attendance</h2>
        </div>
        {records.length ? (
          <DataTable columns={columns} rows={records} />
        ) : (
          <EmptyState icon={Clock} title="No attendance records" text="Use check in to mark your first shift." />
        )}
      </section>
    </StaffLayout>
  );
}

function WaiterProfilePage() {
  const { user, updateProfile } = useAuth();
  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    whatsappNumber: user?.whatsappNumber || "",
    address: user?.address || "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      name: user?.name || "",
      email: user?.email || "",
      phone: user?.phone || "",
      whatsappNumber: user?.whatsappNumber || "",
      address: user?.address || "",
    });
  }, [user?.id, user?.name, user?.email, user?.phone, user?.whatsappNumber, user?.address]);

  const submit = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");
    setSaving(true);
    try {
      await updateProfile(form);
      setMessage("Profile updated successfully.");
    } catch (err) {
      setError(apiErrorMessage(err, "Could not update profile."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <StaffLayout role="waiter">
      <Header title="My profile" />
      <section className="chart-card waiter-profile-card">
        <div className="waiter-profile-head">
          <div className="waiter-profile-avatar">{user?.name?.slice(0, 2)?.toUpperCase() || "DF"}</div>
          <div>
            <span className="eyebrow">Waiter profile</span>
            <h2>{user?.name || "Waiter"}</h2>
            <p>Manage your contact details and account information.</p>
          </div>
        </div>
        {message && <p className="success">{message}</p>}
        {error && <p className="error">{error}</p>}
        <form className="waiter-profile-form" onSubmit={submit}>
          <label>
            <span>Name</span>
            <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
          </label>
          <label>
            <span>Email</span>
            <Input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
          </label>
          <label>
            <span>Phone number</span>
            <Input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="077 123 4567" />
          </label>
          <label>
            <span>WhatsApp number</span>
            <Input value={form.whatsappNumber} onChange={(event) => setForm({ ...form, whatsappNumber: event.target.value })} placeholder="94771234567" />
          </label>
          <label className="waiter-profile-wide">
            <span>Address</span>
            <textarea className="input textarea" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} placeholder="Optional address" />
          </label>
          <div className="waiter-profile-wide waiter-profile-actions">
            <Button type="submit" disabled={saving}><CheckCircle2 size={16} /> {saving ? "Saving..." : "Save changes"}</Button>
          </div>
        </form>
      </section>
    </StaffLayout>
  );
}

function StaffAttendanceKioskPage() {
  const [qrPayload, setQrPayload] = useState("");
  const [activeTab, setActiveTab] = useState("scan");
  const [attendanceLog, setAttendanceLog] = useState([]);
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [scanOpen, setScanOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const scannerId = useRef(`kiosk-qr-reader-${Math.random().toString(36).slice(2)}`);
  const activeRecord = status?.record;
  const checkedIn = status?.status === "checked-in";
  const hasScannedStaff = Boolean(qrPayload && status?.staff);
  const now = new Date();
  const kioskDate = now.toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const kioskTime = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const formatTime = (value) => value ? new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-";
  const cleanQrPayload = (value) => {
    const text = String(value || "").trim();
    if (!text) return "";
    try {
      const parsed = JSON.parse(text);
      if (typeof parsed === "string") return cleanQrPayload(parsed);
      if (parsed?.qrPayload) return cleanQrPayload(parsed.qrPayload);
      if (parsed?.attendanceQrPayload) return cleanQrPayload(parsed.attendanceQrPayload);
    } catch {
      // Most scanners return the plain QR text.
    }
    try {
      const url = new URL(text);
      return cleanQrPayload(url.searchParams.get("qr") || url.searchParams.get("qrPayload") || url.searchParams.get("attendanceQrPayload") || url.searchParams.get("token") || text);
    } catch {
      return text;
    }
  };
  const getLocation = () => new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({});
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      () => resolve({}),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  });

  const loadStatus = async (nextQrPayload = qrPayload, options = {}) => {
    const cleanedPayload = cleanQrPayload(nextQrPayload);
    if (!cleanedPayload) {
      setStatus(null);
      setQrPayload("");
      setError("Scan a valid staff attendance QR code.");
      return false;
    }
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const data = unwrap(await api.post("/attendance-kiosk/status", { qrPayload: cleanedPayload }));
      setStatus(data);
      if (options.select) setQrPayload(cleanedPayload);
      return true;
    } catch (err) {
      setStatus(null);
      setQrPayload("");
      setAttendanceLog([]);
      setError(apiErrorMessage(err, "Could not find attendance status."));
      return false;
    } finally {
      setLoading(false);
    }
  };

  const markAttendance = async (action, nextQrPayload = qrPayload) => {
    const cleanedPayload = cleanQrPayload(nextQrPayload);
    if (!cleanedPayload) {
      setError("Scan a valid staff attendance QR code before marking attendance.");
      return;
    }
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const location = await getLocation();
      const data = unwrap(await api.post("/attendance-kiosk/mark", { qrPayload: cleanedPayload, action, ...location }));
      setStatus({ staff: data.staff, record: data.record, status: data.action });
      setMessage(action === "check-out" ? "Check out successful." : "Check in successful.");
      await loadAttendanceLog(cleanedPayload, true);
    } catch (err) {
      setError(apiErrorMessage(err, "Could not mark attendance."));
    } finally {
      setLoading(false);
    }
  };

  const loadAttendanceLog = async (nextQrPayload = qrPayload, silent = false) => {
    const cleanedPayload = cleanQrPayload(nextQrPayload);
    if (!cleanedPayload) {
      if (!silent) setError("Scan staff QR first to view attendance log.");
      return;
    }
    if (!silent) {
      setError("");
      setMessage("");
      setLoading(true);
    }
    try {
      const data = unwrap(await api.post("/attendance-kiosk/log", { qrPayload: cleanedPayload }));
      setAttendanceLog(data.records || []);
      setQrPayload(cleanedPayload);
      setStatus((current) => current?.staff ? current : { staff: data.staff, record: data.records?.[0], status: data.records?.[0]?.checkInTime && !data.records?.[0]?.checkOutTime ? "checked-in" : data.records?.[0]?.checkOutTime ? "checked-out" : "not-marked" });
    } catch (err) {
      if (!silent) setError(apiErrorMessage(err, "Could not load attendance log."));
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (!scanOpen) return undefined;
    const scanner = new Html5QrcodeScanner(scannerId.current, { fps: 10, qrbox: { width: 240, height: 240 } }, false);
    scanner.render(
      async (decodedText) => {
        await scanner.clear();
        setScanOpen(false);
        await loadStatus(decodedText, { select: true });
      },
      () => {}
    );
    return () => {
      scanner.clear().catch(() => {});
    };
  }, [scanOpen]);

  return (
    <main className="staff-kiosk-page">
      <section className="staff-kiosk-shell">
        <header className="staff-kiosk-topbar">
          <div className="staff-kiosk-title">
            <QrCode />
            <h1>Attendance System</h1>
          </div>
          <div className="staff-kiosk-clock">
            <CalendarDays size={22} />
            <span>{kioskDate} - {kioskTime}</span>
          </div>
          <button className="staff-kiosk-menu" type="button" aria-label="Kiosk menu"><MenuIcon size={22} /></button>
        </header>

        <nav className="staff-kiosk-tabs" aria-label="Attendance views">
          <button className={activeTab === "scan" ? "active" : ""} type="button" onClick={() => setActiveTab("scan")}><ScanQrCode size={22} /> Scan QR</button>
          <button className={activeTab === "log" ? "active" : ""} type="button" onClick={() => { setActiveTab("log"); loadAttendanceLog(); }}><ClipboardList size={22} /> Attendance Log</button>
          <button className={activeTab === "staff" ? "active" : ""} type="button" onClick={() => setActiveTab("staff")}><Users size={22} /> Staff</button>
        </nav>

        {activeTab === "scan" && <div className="staff-kiosk-grid">
          <section className="chart-card staff-kiosk-card staff-kiosk-scan-card">
            <div className="staff-kiosk-scan-visual">
              <div className={`staff-kiosk-scan-icon ${scanOpen ? "is-scanning" : ""}`}>
                <ScanQrCode size={142} />
                <i />
              </div>
              <p>Scan staff member QR code to check in or check out</p>
            </div>

            <div className="staff-kiosk-actions">
              <Button type="button" onClick={() => setScanOpen((current) => !current)}><QrCode size={16} /> {scanOpen ? "Close scanner" : "Scan QR"}</Button>
              <Button type="button" variant="ghost" onClick={() => loadStatus()} disabled={loading || !qrPayload}><Eye size={16} /> Today status</Button>
            </div>
            {qrPayload && (
              <div className="staff-kiosk-qr-loaded">
                <QRCodeSVG value={qrPayload} size={84} />
                <div>
                  <strong>{status?.staff?.name || "QR loaded"}</strong>
                  <span>{status?.staff?.role || "Staff selected"}</span>
                  <button type="button" onClick={() => { setQrPayload(""); setStatus(null); setMessage(""); }}>Clear QR</button>
                </div>
              </div>
            )}
            {!scanOpen && !qrPayload && (
              <div className="staff-kiosk-scan-empty">
                <ScanQrCode size={56} />
                <strong>Ready to scan</strong>
                <p>Scan the staff member's unique QR card, then choose Check In or Check Out.</p>
              </div>
            )}
            {scanOpen && <div id={scannerId.current} className="staff-qr-reader staff-kiosk-reader" />}
          </section>

          <section className="chart-card staff-kiosk-card staff-kiosk-status-card">
            <div className="staff-kiosk-card-title">
              <Clock size={20} />
              <h2>Selected staff</h2>
            </div>
            {message && <p className="success">{message}</p>}
            {error && <p className="error">{error}</p>}
            <div className="staff-kiosk-person">
              <div>{status?.staff?.name?.slice(0, 2)?.toUpperCase() || "DF"}</div>
              <span>
                <strong>{status?.staff?.name || "Staff member"}</strong>
                <small>{status?.staff?.role || "Scan staff QR first"}</small>
              </span>
            </div>
            <div className="staff-attendance-summary">
              <span><small>Status</small><strong>{checkedIn ? "Checked in" : activeRecord?.checkOutTime ? "Checked out" : "Not marked"}</strong></span>
              <span><small>Check in</small><strong>{formatTime(activeRecord?.checkInTime)}</strong></span>
              <span><small>Check out</small><strong>{formatTime(activeRecord?.checkOutTime)}</strong></span>
              <span><small>Hours</small><strong>{activeRecord?.workingHours || activeRecord?.workedHours || 0}h</strong></span>
            </div>
            <div className="staff-kiosk-mark-actions">
              <Button className="staff-kiosk-checkin" onClick={() => markAttendance("check-in")} disabled={loading || !hasScannedStaff || checkedIn}>
                <LogIn size={18} /> Check In
              </Button>
              <Button className="staff-kiosk-checkout" variant="ghost" onClick={() => markAttendance("check-out")} disabled={loading || !hasScannedStaff || !checkedIn}>
                <LogOut size={18} /> Check Out
              </Button>
            </div>
          </section>
        </div>}

        {activeTab === "log" && (
          <section className="chart-card staff-kiosk-log-panel">
            <div className="staff-kiosk-card-title">
              <ClipboardList size={22} />
              <h2>Attendance Log</h2>
            </div>
            {message && <p className="success">{message}</p>}
            {error && <p className="error">{error}</p>}
            <div className="staff-kiosk-log-head">
              <div className="staff-kiosk-person">
                <div>{status?.staff?.name?.slice(0, 2)?.toUpperCase() || "DF"}</div>
                <span>
                  <strong>{status?.staff?.name || "Scan staff QR first"}</strong>
                  <small>{status?.staff?.role || "Attendance log"}</small>
                </span>
              </div>
              <Button type="button" onClick={() => loadAttendanceLog()} disabled={loading || !qrPayload}><ClipboardList size={16} /> Refresh log</Button>
            </div>
            {attendanceLog.length ? (
              <div className="staff-kiosk-log-list">
                {attendanceLog.map((record) => (
                  <article key={record._id}>
                    <div>
                      <strong>{new Date(record.date).toLocaleDateString()}</strong>
                      <span>{formatTime(record.checkInTime)} - {formatTime(record.checkOutTime)}</span>
                    </div>
                    <div>
                      <strong>{record.workingHours || record.workedHours || 0}h</strong>
                      <span>OT {record.overtimeHours || 0}h</span>
                    </div>
                    <StatusBadge status={record.status} />
                    <StatusBadge status={record.method || "qr"} />
                  </article>
                ))}
              </div>
            ) : (
              <div className="staff-kiosk-scan-empty">
                <ClipboardList size={56} />
                <strong>No log selected</strong>
                <p>Scan a staff QR first, then open Attendance Log to view recent records.</p>
              </div>
            )}
          </section>
        )}

        {activeTab === "staff" && (
          <section className="chart-card staff-kiosk-log-panel">
            <div className="staff-kiosk-card-title">
              <Users size={22} />
              <h2>Staff</h2>
            </div>
            <div className="staff-kiosk-person">
              <div>{status?.staff?.name?.slice(0, 2)?.toUpperCase() || "DF"}</div>
              <span>
                <strong>{status?.staff?.name || "No staff selected"}</strong>
                <small>{status?.staff?.role || "Scan QR to select staff"}</small>
              </span>
            </div>
          </section>
        )}
      </section>
    </main>
  );
}

function ManualOrder() {
  return <MenuPage />;
}

function KitchenDashboard() {
  const { data: orders, load } = useResource("/kitchen/orders");
  const { socket } = useSocket();
  const [updatingId, setUpdatingId] = useState("");
  const [notifyingId, setNotifyingId] = useState("");
  const [message, setMessage] = useState("");
  const advance = async (order) => {
    const next = { pending: "accepted", accepted: "preparing", preparing: "ready" }[order.status] || order.status;
    if (next === order.status) return;
    setMessage("");
    setUpdatingId(order._id);
    try {
      await api.patch(`/kitchen/orders/${order._id}/status`, { status: next });
      load();
    } finally {
      setUpdatingId("");
    }
  };
  const notifyWaiter = async (order) => {
    setMessage("");
    setNotifyingId(order._id);
    try {
      await api.patch(`/kitchen/orders/${order._id}/status`, { status: "ready" });
      setMessage(`${order.orderNumber} notification sent to waiter.`);
      load();
    } finally {
      setNotifyingId("");
    }
  };
  const lanes = [
    { key: "pending", title: "New orders", action: "Accept order", icon: Bell, empty: "Customer orders will land here." },
    { key: "accepted", title: "Accepted", action: "Start cooking", icon: ClipboardList, empty: "Accepted orders wait here." },
    { key: "preparing", title: "Preparing", action: "Mark ready", icon: ChefHat, empty: "Cooking orders appear here." },
    { key: "ready", title: "Ready", icon: CheckCircle2, empty: "Ready orders wait for waiter service." },
  ];
  const activeOrders = orders.filter((order) => !["served", "completed", "cancelled"].includes(order.status));
  const waitingCount = orders.filter((order) => order.status === "pending").length;
  const preparingCount = orders.filter((order) => order.status === "accepted" || order.status === "preparing").length;
  const readyCount = orders.filter((order) => order.status === "ready").length;
  useEffect(() => {
    if (!socket) return undefined;
    socket.emit("join-role", "kitchen");
    socket.on("order:new", load);
    socket.on("order:update", load);
    return () => {
      socket.off("order:new", load);
      socket.off("order:update", load);
    };
  }, [socket]);
  return (
    <StaffLayout role="kitchen">
      <Header
        title="Kitchen order board"
        actions={<Link className="btn btn-soft" to="/kitchen/attendance"><QrCode size={16} /> My QR</Link>}
      />
      <section className="kitchen-hero">
        <div>
          <span className="eyebrow">Live kitchen flow</span>
          <h2>Customer order status control</h2>
          <p>Accept new customer orders, move them into cooking, and mark them ready for the waiter to serve.</p>
        </div>
        <div className="kitchen-hero-stats">
          <span><small>Active</small><strong>{activeOrders.length}</strong></span>
          <span><small>Waiting</small><strong>{waitingCount}</strong></span>
          <span><small>Cooking</small><strong>{preparingCount}</strong></span>
          <span><small>Ready</small><strong>{readyCount}</strong></span>
        </div>
      </section>
      {message && <p className="success">{message}</p>}
      <div className="kitchen-board kitchen-order-board">
        {lanes.map(({ key, title, action, icon: LaneIcon, empty }) => {
          const laneOrders = orders.filter((order) => order.status === key);
          return (
            <section key={key}>
              <h2><span><LaneIcon size={18} /> {title}</span><b>{laneOrders.length}</b></h2>
              {laneOrders.length ? (
                laneOrders.map((order) => (
                  <article className="kitchen-card kitchen-order-card" key={order._id}>
                    <div className="kitchen-order-card-head">
                      <div>
                        <h3>{order.orderNumber}</h3>
                        <p>Table {order.tableNumber} - {order.customerName}</p>
                      </div>
                      <StatusBadge status={order.status} />
                    </div>
                    <ul>
                      {order.items?.map((item) => (
                        <li key={item._id || `${order._id}-${item.name}`}>
                          <span>{item.quantity} x {item.name}</span>
                          {item.specialInstructions && <small>{item.specialInstructions}</small>}
                        </li>
                      ))}
                    </ul>
                    <div className="kitchen-order-card-foot">
                      <strong>{money(order.totalAmount)}</strong>
                      {key === "ready" ? (
                        <Button className="kitchen-ready-note-button" variant="soft" onClick={() => notifyWaiter(order)} disabled={notifyingId === order._id}>
                          <CheckCircle2 size={16} /> Notify waiter
                        </Button>
                      ) : (
                        <Button onClick={() => advance(order)} disabled={updatingId === order._id}>{action}</Button>
                      )}
                    </div>
                  </article>
                ))
              ) : (
                <div className="kitchen-empty-column">
                  <LaneIcon size={48} />
                  <strong>No {title.toLowerCase()}</strong>
                  <p>{empty}</p>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </StaffLayout>
  );
}

function KitchenAttendancePage() {
  const { data: records } = useResource("/staff/attendance/me");
  const columns = [
    { key: "date", label: "Date", render: (row) => new Date(row.date).toLocaleDateString() },
    { key: "checkInTime", label: "Check in", render: (row) => row.checkInTime ? new Date(row.checkInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-" },
    { key: "checkOutTime", label: "Check out", render: (row) => row.checkOutTime ? new Date(row.checkOutTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-" },
    { key: "workingHours", label: "Hours", render: (row) => `${row.workingHours || row.workedHours || 0}h` },
    { key: "overtimeHours", label: "Overtime", render: (row) => `${row.overtimeHours || 0}h` },
    { key: "method", label: "Method", render: (row) => <StatusBadge status={row.method || "qr"} /> },
    { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status} /> },
  ];

  return (
    <StaffLayout role="kitchen">
      <Header title="Chef attendance QR" />
      <StaffQrDownloadCard
        title="Chef attendance QR"
        description="Download this QR and scan it at the Staff Attendance Kiosk to check in, check out, and view attendance logs."
      />
      <section className="chart-card waiter-attendance-records">
        <div className="reservation-section-title">
          <CalendarDays size={18} />
          <h2>My attendance records</h2>
        </div>
        {records.length ? (
          <DataTable columns={columns} rows={records} />
        ) : (
          <EmptyState icon={Clock} title="No attendance records" text="Scan your QR at the kiosk to create attendance records." />
        )}
      </section>
    </StaffLayout>
  );
}

function InventoryPage() {
  const { data } = useResource("/kitchen/inventory");
  return (
    <StaffLayout role="kitchen">
      <Header title="Inventory and low stock" />
      <DataTable columns={[{ key: "itemName", label: "Item" }, { key: "quantity", label: "Qty" }, { key: "unit", label: "Unit" }, { key: "lowStockLimit", label: "Low limit" }, { key: "status", label: "Status", render: (row) => row.quantity <= row.lowStockLimit ? <StatusBadge status="low" /> : <StatusBadge status="ready" /> }]} rows={data} />
    </StaffLayout>
  );
}

function AdminDashboard() {
  const { data: analyticsResponse } = useResource("/admin/analytics", {});
  const { data: users } = useResource("/admin/users");
  const { data: inventory } = useResource("/admin/inventory");
  const { data: reservations } = useResource("/admin/reservations");
  const { data: payroll } = useResource("/admin/payroll");
  const { data: attendance } = useResource("/admin/attendance");
  const analytics = analyticsResponse.analytics || analyticsResponse || {};
  const sales = (analytics.chartData || analytics.salesByDay || analytics.salesTrend || [{ label: "Today", revenue: analytics.totalSales || analytics.revenue || 0, orders: analytics.todayOrders || 0 }])
    .map((row) => ({ ...row, label: row.label || row.name || row.date || "Today" }));
  const popular = analytics.topSellingFoods || analytics.popularItems || [];
  const recentOrders = analytics.recentOrders || [];
  const lowStock = inventory.filter((item) => Number(item.quantity) <= Number(item.lowStockLimit));
  const pendingReservations = reservations.filter((reservation) => reservation.status === "pending");
  const pendingPayroll = payroll.filter((row) => row.status === "pending").reduce((sum, row) => sum + Number(row.totalAmount || 0), 0);
  const today = new Date().toDateString();
  const todayAttendance = attendance.filter((record) => new Date(record.date).toDateString() === today);
  const checkedIn = todayAttendance.filter((record) => record.checkInTime && !record.checkOutTime).length;
  const staffCount = users.filter((user) => ["waiter", "chef", "staff", "kitchen"].includes(user.role)).length;

  return (
    <StaffLayout role="admin">
      <Header
        title="Admin dashboard"
        actions={<Link className="btn btn-primary" to="/admin/reports"><BarChart3 size={16} /> View reports</Link>}
      />

      <section className="admin-dashboard-hero">
        <div>
          <span className="eyebrow">Live overview</span>
          <h2>Restaurant control center</h2>
          <p>Track sales, staff, inventory, reservations, payroll, and live operations from one calm dashboard.</p>
        </div>
        <div className="admin-dashboard-hero-actions">
          <Link className="btn btn-soft" to="/admin/menu"><Utensils size={16} /> Menu</Link>
          <Link className="btn btn-soft" to="/admin/inventory"><PackageCheck size={16} /> Inventory</Link>
          <Link className="btn btn-soft" to="/admin/attendance"><CalendarDays size={16} /> Attendance</Link>
        </div>
      </section>

      <div className="stats-grid admin-dashboard-stats">
        <StatCard icon={WalletCards} label="Total sales" value={money(analytics.revenue || analytics.totalSales || 0)} />
        <StatCard icon={ClipboardList} label="Orders" value={analytics.totalOrders || analytics.todayOrders || recentOrders.length} />
        <StatCard icon={Users} label="Staff" value={staffCount} />
        <StatCard icon={Bell} label="Alerts" value={lowStock.length + pendingReservations.length} />
      </div>

      <div className="admin-dashboard-grid">
        <section className="chart-card admin-dashboard-card admin-dashboard-card-wide">
          <div className="admin-dashboard-card-head">
            <div>
              <span className="eyebrow">Sales</span>
              <h2>Revenue trend</h2>
            </div>
            <TrendingUp />
          </div>
          <ResponsiveContainer height={260}>
            <BarChart data={sales}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(111,99,65,0.18)" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip formatter={(value, name) => [name === "revenue" || name === "sales" ? money(value) : value, name]} />
              <Bar dataKey="revenue" fill="#08784f" radius={[8, 8, 0, 0]} />
              <Bar dataKey="orders" fill="#c1b495" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>

        <section className="chart-card admin-dashboard-card">
          <div className="admin-dashboard-card-head">
            <div>
              <span className="eyebrow">Kitchen</span>
              <h2>Popular items</h2>
            </div>
            <ChefHat />
          </div>
          {popular.length ? (
            <div className="admin-dashboard-list">
              {popular.slice(0, 5).map((item) => (
                <article key={item._id || item.name}>
                  <div><strong>{item.name}</strong><span>{item.quantitySold || item.orderCount || 0} sold</span></div>
                  <b>{money(item.revenue || 0)}</b>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState icon={ChefHat} title="No popular items" text="Top sellers will appear after orders." />
          )}
        </section>

        <section className="chart-card admin-dashboard-card">
          <div className="admin-dashboard-card-head">
            <div>
              <span className="eyebrow">Operations</span>
              <h2>Attention needed</h2>
            </div>
            <Bell />
          </div>
          <div className="admin-dashboard-alerts">
            <Link to="/admin/inventory"><PackageCheck /> <span>{lowStock.length} low-stock items</span></Link>
            <Link to="/admin/reservations"><CalendarDays /> <span>{pendingReservations.length} pending reservations</span></Link>
            <Link to="/admin/payroll"><WalletCards /> <span>{money(pendingPayroll)} pending payroll</span></Link>
            <Link to="/admin/attendance"><Clock /> <span>{checkedIn} staff currently checked in</span></Link>
          </div>
        </section>

        <section className="chart-card admin-dashboard-card">
          <div className="admin-dashboard-card-head">
            <div>
              <span className="eyebrow">Inventory</span>
              <h2>Low stock</h2>
            </div>
            <PackageCheck />
          </div>
          {lowStock.length ? (
            <div className="admin-dashboard-list">
              {lowStock.slice(0, 6).map((item) => (
                <article key={item._id}>
                  <div><strong>{item.itemName}</strong><span>{item.quantity} {item.unit} left</span></div>
                  <StatusBadge status={Number(item.quantity) <= 0 ? "out-of-stock" : "low"} />
                </article>
              ))}
            </div>
          ) : (
            <EmptyState icon={PackageCheck} title="Stock looks good" text="Low-stock items will appear here." />
          )}
        </section>

        <section className="chart-card admin-dashboard-card admin-dashboard-card-wide">
          <div className="admin-dashboard-card-head">
            <div>
              <span className="eyebrow">Activity</span>
              <h2>Recent orders</h2>
            </div>
            <ReceiptText />
          </div>
          {recentOrders.length ? (
            <div className="admin-recent-orders">
              {recentOrders.slice(0, 6).map((order) => (
                <article key={order._id || order.orderNumber}>
                  <div className="admin-recent-order-main">
                    <span className="admin-order-icon"><ReceiptText size={18} /></span>
                    <div>
                      <strong>{order.orderNumber}</strong>
                      <small>{new Date(order.createdAt || order.updatedAt || Date.now()).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</small>
                    </div>
                  </div>
                  <div>
                    <span>Customer</span>
                    <strong>{order.customerName || order.customer?.name || "Guest"}</strong>
                  </div>
                  <div>
                    <span>Table</span>
                    <strong>{order.tableNumber || "Pending"}</strong>
                  </div>
                  <div className="admin-recent-order-status">
                    <StatusBadge status={order.status} />
                    <b>{money(order.totalAmount)}</b>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState icon={ReceiptText} title="No recent orders" text="Recent orders will appear here." />
          )}
        </section>
      </div>
    </StaffLayout>
  );
}

function AdminResource({ title, path, columns }) {
  const { data, load } = useResource(path);
  const [open, setOpen] = useState(false);
  return (
    <StaffLayout role="admin">
      <Header title={title} actions={<Button onClick={() => setOpen(true)}><Plus size={16} /> Add</Button>} />
      <DataTable columns={columns} rows={data} />
      <Modal open={open} title={`Add ${title}`} onClose={() => setOpen(false)}>
        <p className="muted">Use the API-backed table as a starter for full CRUD forms. Existing records can be managed through the same REST endpoints.</p>
        <Button onClick={() => { setOpen(false); load(); }}>Done</Button>
      </Modal>
    </StaffLayout>
  );
}

function AdminUsersPage() {
  const { data: users, load } = useResource("/admin/users");
  const newPin = () => String(Math.floor(1000 + Math.random() * 9000));
  const emptyForm = () => ({ name: "", email: "", password: "Staff@123", phone: "", whatsappNumber: "", role: "waiter", salaryType: "monthly", monthlySalary: "", dailyRate: "", hourlyRate: "", overtimeRate: "", attendancePin: newPin() });
  const staffRoleOptions = [
    { value: "waiter", label: "Waiter", text: "Serve tables and update served orders." },
    { value: "chef", label: "Chef", text: "Accept and prepare kitchen orders." },
    { value: "kitchen", label: "Kitchen helper", text: "Kitchen support and stock work." },
    { value: "staff", label: "Staff / Cleaner", text: "General staff attendance and payroll." },
  ];
  const [open, setOpen] = useState(false);
  const [qrUser, setQrUser] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const adminQrRef = useRef(null);

  const openCreateForm = () => {
    setForm(emptyForm());
    setError("");
    setSuccess("");
    setOpen(true);
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const created = unwrap(await api.post("/admin/users", {
        ...form,
        monthlySalary: Number(form.monthlySalary || 0),
        dailyRate: Number(form.dailyRate || 0),
        hourlyRate: Number(form.hourlyRate || 0),
        overtimeRate: Number(form.overtimeRate || 0),
      }));
      setSuccess(`${form.name} added as ${form.role}.`);
      setForm(emptyForm());
      await load();
      setOpen(false);
      if (created?.attendanceQrPayload) setQrUser(created);
    } catch (err) {
      setError(err.response?.status === 409 ? "This email is already registered. Use a different email for the staff member." : apiErrorMessage(err, "Could not add staff user."));
    } finally {
      setSaving(false);
    }
  };

  const downloadAdminStaffQr = () => {
    if (!adminQrRef.current || !qrUser?.attendanceQrPayload) return;
    const svgText = new XMLSerializer().serializeToString(adminQrRef.current);
    const svgBlob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 640;
      canvas.height = 760;
      const context = canvas.getContext("2d");
      context.fillStyle = "#fff8e1";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = "#073828";
      context.font = "700 34px Arial";
      context.fillText("DineFlow Attendance QR", 52, 70);
      context.fillStyle = "#1f1b12";
      context.font = "600 22px Arial";
      context.fillText(qrUser.name || "Staff member", 52, 112);
      context.fillStyle = "#8b6f47";
      context.font = "700 18px Arial";
      context.fillText(`${qrUser.role || "staff"} unique QR code`, 52, 144);
      context.drawImage(image, 120, 190, 400, 400);
      context.fillStyle = "#5f5546";
      context.font = "600 16px Arial";
      context.fillText("Scan this QR at the Staff Attendance Kiosk.", 52, 670);
      URL.revokeObjectURL(url);
      const link = document.createElement("a");
      link.download = `dineflow-attendance-qr-${qrUser.name || "staff"}.png`.replace(/\s+/g, "-").toLowerCase();
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
    image.src = url;
  };

  return (
    <StaffLayout role="admin">
      <Header title="Users" actions={<Button onClick={openCreateForm}><Plus size={16} /> Add staff</Button>} />
      <DataTable
        columns={[
          { key: "name", label: "Name" },
          { key: "email", label: "Email" },
          { key: "whatsappNumber", label: "WhatsApp", render: (row) => row.whatsappNumber || row.phone || "-" },
          { key: "role", label: "Role", render: (row) => <StatusBadge status={row.role} /> },
          { key: "salaryType", label: "Salary type", render: (row) => <StatusBadge status={row.salaryType || "monthly"} /> },
          { key: "monthlySalary", label: "Monthly", render: (row) => money(row.monthlySalary) },
          { key: "dailyRate", label: "Daily", render: (row) => money(row.dailyRate) },
          { key: "hourlyRate", label: "Hourly", render: (row) => money(row.hourlyRate) },
          { key: "overtimeRate", label: "OT rate", render: (row) => money(row.overtimeRate) },
          { key: "qr", label: "QR", render: (row) => row.attendanceQrPayload ? <Button variant="ghost" onClick={() => setQrUser(row)}><QrCode size={16} /> QR</Button> : "-" },
        ]}
        rows={users}
      />
      <Modal open={Boolean(qrUser)} title="Staff attendance QR" onClose={() => setQrUser(null)}>
        <div className="admin-staff-qr-modal">
          <div className="waiter-qr-frame">
            {qrUser?.attendanceQrPayload ? <QRCodeSVG ref={adminQrRef} value={qrUser.attendanceQrPayload} size={180} /> : <QrCode size={64} />}
          </div>
          <div>
            <h3>{qrUser?.name}</h3>
            <p className="muted">{qrUser?.role} attendance QR. Scan this at the Staff Attendance Kiosk to mark attendance.</p>
            <Button onClick={downloadAdminStaffQr} disabled={!qrUser?.attendanceQrPayload}><QrCode size={16} /> Download QR</Button>
          </div>
        </div>
      </Modal>
      <Modal open={open} title="Add staff member" onClose={() => setOpen(false)} className="admin-user-modal">
        <form className="admin-user-form" onSubmit={submit}>
          <div className="admin-role-picker">
            {staffRoleOptions.map((option) => (
              <button
                className={form.role === option.value ? "active" : ""}
                key={option.value}
                type="button"
                onClick={() => setForm({ ...form, role: option.value })}
              >
                <strong>{option.label}</strong>
                <span>{option.text}</span>
              </button>
            ))}
          </div>
          <label>
            <span>Name</span>
            <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Demo Waiter" required />
          </label>
          <label>
            <span>Email</span>
            <Input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="waiter@example.com" required />
          </label>
          <label>
            <span>Temporary password</span>
            <Input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="Staff@123" minLength={6} required />
          </label>
          <label>
            <span>Phone</span>
            <Input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="077 123 4567" />
          </label>
          <label>
            <span>WhatsApp number</span>
            <Input value={form.whatsappNumber} onChange={(event) => setForm({ ...form, whatsappNumber: event.target.value })} placeholder="94771234567" />
          </label>
          <label>
            <span>Role</span>
            <select className="input" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
              <option value="waiter">Waiter</option>
              <option value="chef">Chef</option>
              <option value="kitchen">Kitchen helper</option>
              <option value="staff">Staff</option>
            </select>
          </label>
          <label>
            <span>Attendance PIN</span>
            <div className="admin-pin-field">
              <Input value={form.attendancePin} onChange={(event) => setForm({ ...form, attendancePin: event.target.value })} placeholder="0001" minLength={4} maxLength={12} />
              <Button type="button" variant="soft" onClick={() => setForm({ ...form, attendancePin: newPin() })}>Generate</Button>
            </div>
          </label>
          <label>
            <span>Salary type</span>
            <select className="input" value={form.salaryType} onChange={(event) => setForm({ ...form, salaryType: event.target.value })}>
              <option value="monthly">Monthly staff</option>
              <option value="hourly">Hourly staff</option>
            </select>
          </label>
          <label>
            <span>Monthly salary</span>
            <Input type="number" min="0" step="0.01" value={form.monthlySalary} onChange={(event) => setForm({ ...form, monthlySalary: event.target.value })} placeholder="75000" disabled={form.salaryType === "hourly"} />
          </label>
          <label>
            <span>Daily rate</span>
            <Input type="number" min="0" step="0.01" value={form.dailyRate} onChange={(event) => setForm({ ...form, dailyRate: event.target.value })} placeholder="2000" />
          </label>
          <label>
            <span>Hourly rate</span>
            <Input type="number" min="0" step="0.01" value={form.hourlyRate} onChange={(event) => setForm({ ...form, hourlyRate: event.target.value })} placeholder="850" disabled={form.salaryType === "monthly"} />
          </label>
          <label>
            <span>Overtime rate</span>
            <Input type="number" min="0" step="0.01" value={form.overtimeRate} onChange={(event) => setForm({ ...form, overtimeRate: event.target.value })} placeholder="300" />
          </label>
          {error && <p className="error">{error}</p>}
          {success && <p className="success">{success}</p>}
          <div className="admin-user-form-actions">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={saving}><Plus size={16} /> {saving ? "Adding..." : "Add user"}</Button>
          </div>
        </form>
      </Modal>
    </StaffLayout>
  );
}

function AdminPayrollPage() {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const { data: users } = useResource("/admin/users");
  const { data: payroll, load } = useResource("/admin/payroll");
  const { data: attendanceRecords, load: loadAttendance } = useResource("/admin/attendance");
  const staffUsers = users.filter((user) => ["waiter", "chef", "staff", "kitchen"].includes(user.role));
  const emptyForm = { staffId: "", month: currentMonth, baseSalary: "", allowances: "0", deductions: "0", notes: "" };
  const [form, setForm] = useState(emptyForm);
  const [editingPayrollId, setEditingPayrollId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [generatingPayroll, setGeneratingPayroll] = useState(false);
  const [payrollSearch, setPayrollSearch] = useState("");
  const [payrollStatusFilter, setPayrollStatusFilter] = useState("all");
  const [payrollRoleFilter, setPayrollRoleFilter] = useState("all");
  const [payrollMonthFilter, setPayrollMonthFilter] = useState(currentMonth);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const idOf = (value) => String(typeof value === "object" && value ? value._id || value.id || "" : value || "");
  const selectedStaff = staffUsers.find((staff) => idOf(staff.id || staff._id) === form.staffId);
  const selectedAttendance = attendanceRecords.filter((record) => (!form.staffId || idOf(record.staffId) === form.staffId) && record.month === form.month);
  const absentDays = selectedAttendance.filter((record) => record.status === "absent").length;
  const presentDays = selectedAttendance.filter((record) => ["present", "late"].includes(record.status)).length;
  const shortLeaveHours = selectedAttendance.reduce((sum, record) => sum + Number(record.shortLeaveHours || 0), 0);
  const workedHours = selectedAttendance.reduce((sum, record) => sum + Number(record.workingHours || record.workedHours || 0), 0);
  const overtimeHours = selectedAttendance.reduce((sum, record) => sum + Math.max(0, Number(record.workingHours || record.workedHours || 0) - 8), 0);
  const monthParts = form.month.split("-").map(Number);
  const daysInMonth = form.month ? new Date(monthParts[0], monthParts[1], 0).getDate() : 30;
  const profileBaseSalary = selectedStaff?.salaryType === "hourly"
    ? Number(selectedStaff.hourlyRate || 0) * workedHours
    : Number(selectedStaff?.monthlySalary || form.baseSalary || 0);
  const dailyRate = Number(form.baseSalary || profileBaseSalary || 0) / Math.max(1, daysInMonth);
  const hourlyRate = Number(selectedStaff?.hourlyRate || 0) || dailyRate / 8;
  const attendanceDeductions = Math.round((absentDays * dailyRate + shortLeaveHours * hourlyRate) * 100) / 100;
  const totalDeductions = Number(form.deductions || 0) + attendanceDeductions;
  const projectedTotal = Math.max(0, Number(form.baseSalary || 0) + Number(form.allowances || 0) - totalDeductions);

  const monthLabel = (month) => {
    if (!month) return "All months";
    const [year, monthIndex] = month.split("-").map(Number);
    return new Date(year, monthIndex - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
  };

  const monthPayroll = payroll.filter((row) => !payrollMonthFilter || row.month === payrollMonthFilter);
  const totalPayroll = monthPayroll.reduce((sum, row) => sum + Number(row.totalAmount || 0), 0);
  const paidPayroll = monthPayroll.filter((row) => row.status === "paid").reduce((sum, row) => sum + Number(row.totalAmount || 0), 0);
  const pendingPayroll = monthPayroll.filter((row) => row.status === "pending").reduce((sum, row) => sum + Number(row.totalAmount || 0), 0);
  const totalOtHours = monthPayroll.reduce((sum, row) => sum + Number(row.overtimeHours || 0), 0);
  const whatsappSentCount = monthPayroll.filter((row) => row.whatsappSentAt).length;
  const visiblePayroll = monthPayroll.filter((row) => {
    const matchesSearch = `${row.staffName} ${row.staffRole} ${row.month}`.toLowerCase().includes(payrollSearch.toLowerCase());
    const matchesStatus = payrollStatusFilter === "all" || row.status === payrollStatusFilter;
    const matchesRole = payrollRoleFilter === "all" || row.staffRole === payrollRoleFilter;
    return matchesSearch && matchesStatus && matchesRole;
  });
  const paidPercent = totalPayroll ? Math.round((paidPayroll / totalPayroll) * 100) : 0;
  const pendingCount = monthPayroll.filter((row) => row.status === "pending").length;

  const resetForm = () => {
    setForm(emptyForm);
    setEditingPayrollId(null);
    setError("");
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    const payload = {
      ...form,
      baseSalary: Number(form.baseSalary || 0),
      allowances: Number(form.allowances || 0),
      deductions: totalDeductions,
      notes: [form.notes, attendanceDeductions ? `Attendance deductions: ${money(attendanceDeductions)} (${absentDays} absent, ${shortLeaveHours} short-leave hours).` : ""].filter(Boolean).join("\n"),
    };

    try {
      if (editingPayrollId) {
        await api.patch(`/admin/payroll/${editingPayrollId}`, payload);
        setMessage("Payroll record updated.");
      } else {
        await api.post("/admin/payroll", payload);
        setMessage("Payroll record created.");
      }
      resetForm();
      await load();
    } catch (err) {
      setError(apiErrorMessage(err, "Could not save payroll record."));
    } finally {
      setSaving(false);
    }
  };

  const editPayroll = (row) => {
    setEditingPayrollId(row._id);
    setMessage("");
    setError("");
    setForm({
      staffId: idOf(row.staffId),
      month: row.month,
      baseSalary: row.baseSalary ?? row.basicSalary ?? "",
      allowances: row.allowances ?? "0",
      deductions: row.deductions ?? "0",
      notes: row.notes || "",
    });
  };

  const markPaid = async (row) => {
    setError("");
    setMessage("");
    try {
      const response = await api.patch(`/admin/payroll/${row._id}/paid`);
      const updated = unwrap(response);
      setMessage(updated?.whatsappSentAt
        ? `${row.staffName} salary paid and payslip PDF sent to WhatsApp.`
        : `${row.staffName} salary marked as paid. ${updated?.whatsappError || "WhatsApp payslip pending."}`);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err, "Could not mark salary as paid."));
    }
  };

  const sendWhatsAppPayslip = async (row) => {
    setError("");
    setMessage("");
    try {
      const response = await api.patch(`/admin/payroll/${row._id}/whatsapp`);
      const updated = unwrap(response);
      if (updated?.whatsappSentAt) {
        setMessage(`${row.staffName} payslip PDF sent to WhatsApp${updated.whatsappRecipient ? ` (${updated.whatsappRecipient})` : ""}.`);
      } else if (updated?.whatsappFallbackUrl) {
        await downloadPayslip(updated);
        window.open(updated.whatsappFallbackUrl, "_blank", "noopener,noreferrer");
        setMessage(`${row.staffName} payslip downloaded and WhatsApp chat opened. Attach the downloaded PDF if WhatsApp Cloud API is not configured.`);
      } else {
        setMessage(updated?.whatsappError || "WhatsApp payslip was not sent.");
      }
      await load();
    } catch (err) {
      setError(apiErrorMessage(err, "Could not send WhatsApp payslip."));
    }
  };

  const openWhatsAppFallback = (row) => {
    if (row.whatsappFallbackUrl) window.open(row.whatsappFallbackUrl, "_blank", "noopener,noreferrer");
  };

  const deletePayroll = async (row) => {
    setError("");
    setMessage("");
    try {
      await api.delete(`/admin/payroll/${row._id}`);
      setMessage(`${row.staffName} payroll record deleted.`);
      if (editingPayrollId === row._id) resetForm();
      await load();
    } catch (err) {
      setError(apiErrorMessage(err, "Could not delete payroll record."));
    }
  };

  const generatePayroll = async () => {
    setGeneratingPayroll(true);
    setError("");
    setMessage("");
    try {
      await api.post("/admin/payroll/generate", { month: form.month, staffId: form.staffId || undefined });
      setPayrollMonthFilter(form.month);
      setMessage(`Payroll generated from attendance records for ${monthLabel(form.month)}.`);
      await load();
      await loadAttendance();
    } catch (err) {
      setError(apiErrorMessage(err, "Could not generate payroll."));
    } finally {
      setGeneratingPayroll(false);
    }
  };

  const downloadPayslip = async (row) => {
    try {
      const response = await api.get(`/admin/payroll/${row._id}/payslip`, { responseType: "blob" });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = `payslip-${row.staffName}-${row.month}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(apiErrorMessage(err, "Could not download payslip."));
    }
  };

  return (
    <StaffLayout role="admin">
      <Header
        title="Staff payroll"
        actions={
          <>
            <Input type="month" value={form.month} onChange={(event) => setForm({ ...form, month: event.target.value })} />
            <Button onClick={generatePayroll} disabled={generatingPayroll}>
              <WalletCards size={16} /> {generatingPayroll ? "Generating..." : "Generate payroll"}
            </Button>
          </>
        }
      />
      {message && <p className="success">{message}</p>}
      {error && <p className="error">{error}</p>}

      <section className="stats-grid admin-payroll-stats">
        <StatCard icon={WalletCards} label="Total payroll" value={money(totalPayroll)} />
        <StatCard icon={CheckCircle2} label="Paid" value={money(paidPayroll)} />
        <StatCard icon={Clock} label="Pending" value={money(pendingPayroll)} />
        <StatCard icon={TrendingUp} label="Overtime hours" value={`${totalOtHours.toFixed(1)}h`} />
      </section>

      <section className="chart-card admin-payroll-hero">
        <div>
          <span className="eyebrow">Payroll control</span>
          <h2>{monthLabel(payrollMonthFilter)} salary run</h2>
          <p>Generate salaries from attendance, review overtime, mark payments as paid, and download PDF payslips for every staff member.</p>
        </div>
        <div className="admin-payroll-hero-metrics">
          <span><strong>{monthPayroll.length}</strong><small>Records</small></span>
          <span><strong>{paidPercent}%</strong><small>Paid</small></span>
          <span><strong>{pendingCount}</strong><small>Pending</small></span>
          <span><strong>{whatsappSentCount}</strong><small>WhatsApp sent</small></span>
        </div>
      </section>

      <div className="admin-payroll-layout">
        <section className="chart-card admin-payroll-form-card">
          <div className="reservation-section-title">
            <WalletCards size={18} />
            <h2>{editingPayrollId ? "Edit salary payment" : "Manual salary adjustment"}</h2>
          </div>
          <form className="admin-payroll-form" onSubmit={submit}>
            <label>
              <span>Staff member</span>
              <select
                className="input"
                value={form.staffId}
                onChange={(event) => {
                  const staff = staffUsers.find((entry) => idOf(entry.id || entry._id) === event.target.value);
                  setForm({
                    ...form,
                    staffId: event.target.value,
                    baseSalary: staff?.salaryType === "hourly" ? staff.hourlyRate || "" : staff?.monthlySalary || form.baseSalary,
                  });
                }}
                required
              >
                <option value="">Select staff</option>
                {staffUsers.map((staff) => <option value={staff.id || staff._id} key={staff.id || staff._id}>{staff.name} - {staff.role}</option>)}
              </select>
            </label>
            <label>
              <span>Month</span>
              <Input type="month" value={form.month} onChange={(event) => setForm({ ...form, month: event.target.value })} required />
            </label>
            {selectedStaff && (
              <div className="admin-payroll-staff-profile">
                <div>
                  <strong>{selectedStaff.name}</strong>
                  <span>{selectedStaff.role} - {selectedStaff.salaryType || "monthly"} staff</span>
                </div>
                <StatusBadge status={selectedStaff.attendanceStatus || "checked-out"} />
                <small>Monthly {money(selectedStaff.monthlySalary)} - Hourly {money(selectedStaff.hourlyRate)} - OT {money(selectedStaff.overtimeRate || Number(selectedStaff.hourlyRate || 0) * 1.5)}</small>
              </div>
            )}
            <div className="admin-payroll-form-grid">
              <label>
                <span>Base salary</span>
                <Input type="number" min="0" step="0.01" value={form.baseSalary} onChange={(event) => setForm({ ...form, baseSalary: event.target.value })} placeholder="75000" required />
              </label>
              <label>
                <span>Allowances</span>
                <Input type="number" min="0" step="0.01" value={form.allowances} onChange={(event) => setForm({ ...form, allowances: event.target.value })} />
              </label>
              <label>
                <span>Deductions</span>
                <Input type="number" min="0" step="0.01" value={form.deductions} onChange={(event) => setForm({ ...form, deductions: event.target.value })} />
              </label>
              <div className="admin-payroll-total">
                <span>Total salary</span>
                <strong>{money(projectedTotal)}</strong>
                <small>Attendance deduct {money(attendanceDeductions)}</small>
              </div>
            </div>
            <div className="admin-attendance-summary">
              <span><CheckCircle2 size={15} /> {presentDays} present day{presentDays === 1 ? "" : "s"}</span>
              <span><CalendarDays size={15} /> {absentDays} absent day{absentDays === 1 ? "" : "s"}</span>
              <span><Clock size={15} /> {shortLeaveHours} short-leave hour{shortLeaveHours === 1 ? "" : "s"}</span>
              <span><Clock size={15} /> {workedHours} worked hour{workedHours === 1 ? "" : "s"}</span>
              <span><TrendingUp size={15} /> {overtimeHours.toFixed(1)} overtime hour{overtimeHours === 1 ? "" : "s"}</span>
              <strong>{money(totalDeductions)} total deductions</strong>
            </div>
            <label>
              <span>Notes</span>
              <textarea className="input textarea" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Overtime, bonus, attendance note..." />
            </label>
            <div className="admin-payroll-actions">
              {editingPayrollId && <Button type="button" variant="ghost" onClick={resetForm}>Cancel edit</Button>}
              <Button disabled={saving}><Plus size={16} /> {saving ? "Saving..." : editingPayrollId ? "Update salary" : "Add salary"}</Button>
            </div>
          </form>
        </section>

        <section className="chart-card admin-payroll-attendance-card">
          <div className="reservation-section-title">
            <CalendarDays size={18} />
            <h2>Attendance snapshot</h2>
          </div>
          <div className="admin-payroll-attendance-summary">
            <span><strong>{presentDays}</strong><small>Present</small></span>
            <span><strong>{workedHours.toFixed(1)}h</strong><small>Total hours</small></span>
            <span><strong>{overtimeHours.toFixed(1)}h</strong><small>Overtime</small></span>
          </div>
          <div className="admin-attendance-list">
            {selectedAttendance.slice(0, 6).map((record) => (
              <article key={record._id}>
                <div>
                  <strong>{record.staffName}</strong>
                  <span>{new Date(record.date).toLocaleDateString()} - {record.workingHours || record.workedHours || 0}h worked - {record.shortLeaveHours ? `${record.shortLeaveHours}h short leave` : record.status}</span>
                </div>
                <StatusBadge status={record.status} />
              </article>
            ))}
            {!selectedAttendance.length && <EmptyState icon={CalendarDays} title="No attendance records" text="Select staff and month to check kiosk attendance records." />}
          </div>
        </section>

        <section className="chart-card admin-payroll-list-card">
          <div className="reservation-section-title">
            <ReceiptText size={18} />
            <h2>Salary payments</h2>
          </div>
          <div className="admin-payroll-toolbar">
            <label>
              <Search size={16} />
              <Input placeholder="Search staff, role, month" value={payrollSearch} onChange={(event) => setPayrollSearch(event.target.value)} />
            </label>
            <Input type="month" value={payrollMonthFilter} onChange={(event) => setPayrollMonthFilter(event.target.value)} />
            <select className="input" value={payrollRoleFilter} onChange={(event) => setPayrollRoleFilter(event.target.value)}>
              <option value="all">All roles</option>
              <option value="waiter">Waiters</option>
              <option value="chef">Chefs</option>
              <option value="staff">Staff</option>
              <option value="kitchen">Kitchen</option>
            </select>
            <select className="input" value={payrollStatusFilter} onChange={(event) => setPayrollStatusFilter(event.target.value)}>
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          {visiblePayroll.length ? (
            <div className="admin-payroll-list">
              {visiblePayroll.map((row) => (
                <article className="admin-payroll-card" key={row._id}>
                  <div className="admin-payroll-card-main">
                    <div>
                      <h3>{row.staffName}</h3>
                      <p>{row.staffRole} - {monthLabel(row.month)}</p>
                    </div>
                    <StatusBadge status={row.status} />
                  </div>
                  <div className="admin-payroll-breakdown">
                    <span><small>Present</small><strong>{row.presentDays || 0} days</strong></span>
                    <span><small>Total hours</small><strong>{Number(row.totalHours || 0).toFixed(1)}h</strong></span>
                    <span><small>Overtime</small><strong>{Number(row.overtimeHours || 0).toFixed(1)}h</strong></span>
                    <span><small>Basic</small><strong>{money(row.basicSalary || row.baseSalary)}</strong></span>
                    <span><small>OT pay</small><strong>{money(row.overtimeAmount || 0)}</strong></span>
                    <span><small>Deductions</small><strong>{money(row.deductions || 0)}</strong></span>
                  </div>
                  <div className="admin-payroll-card-total">
                    <small>Total salary</small>
                    <strong>{money(row.totalAmount)}</strong>
                  </div>
                  <div className="admin-payroll-delivery">
                    {row.paidAt && <span><CheckCircle2 size={15} /> Paid {new Date(row.paidAt).toLocaleDateString()}</span>}
                    {row.whatsappSentAt && <span><MessageSquare size={15} /> WhatsApp sent {row.whatsappRecipient ? `to ${row.whatsappRecipient}` : new Date(row.whatsappSentAt).toLocaleDateString()}</span>}
                    {row.whatsappError && <span className="error"><MessageSquareQuote size={15} /> WhatsApp: {row.whatsappError}</span>}
                    {!row.whatsappSentAt && !row.whatsappError && <span><MessageSquare size={15} /> WhatsApp payslip pending</span>}
                  </div>
                  <div className="admin-payroll-card-actions">
                    <Button variant="ghost" onClick={() => editPayroll(row)}><Edit3 size={16} /> Edit</Button>
                    {row.status !== "paid" && <Button variant="soft" onClick={() => markPaid(row)}><CheckCircle2 size={16} /> Mark paid</Button>}
                    {row.status === "paid" && !row.whatsappSentAt && <Button variant="soft" onClick={() => sendWhatsAppPayslip(row)}><MessageSquare size={16} /> Send WhatsApp</Button>}
                    {row.whatsappFallbackUrl && <Button variant="soft" onClick={() => openWhatsAppFallback(row)}><MessageSquareQuote size={16} /> Open WhatsApp</Button>}
                    <Button variant="soft" onClick={() => downloadPayslip(row)}><ReceiptText size={16} /> Payslip</Button>
                    <Button variant="ghost" onClick={() => deletePayroll(row)}><Trash2 size={16} /> Delete</Button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState icon={WalletCards} title="No salary records" text="Add staff salary payments for waiters, chefs, helpers, and cleaning staff." />
          )}
        </section>
      </div>
    </StaffLayout>
  );
}

function AdminAttendancePage() {
  const { data: users } = useResource("/admin/users");
  const { data: attendanceRecords, load } = useResource("/admin/attendance");
  const staffUsers = users.filter((user) => ["waiter", "chef", "staff", "kitchen"].includes(user.role));
  const emptyForm = { staffId: "", date: new Date().toISOString().slice(0, 10), status: "present", startTime: "09:00", endTime: "17:00", breakHours: "1", shortLeaveHours: "0", notes: "" };
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [attendanceSearch, setAttendanceSearch] = useState("");
  const [rangeFilter, setRangeFilter] = useState("monthly");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const now = new Date();
  const visibleAttendance = attendanceRecords.filter((record) => {
    const recordDate = new Date(record.date);
    const matchesSearch = `${record.staffName} ${record.staffRole} ${record.status}`.toLowerCase().includes(attendanceSearch.toLowerCase());
    const matchesRange = rangeFilter === "daily"
      ? recordDate.toDateString() === now.toDateString()
      : rangeFilter === "weekly"
        ? recordDate >= new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000)
        : record.month === now.toISOString().slice(0, 7);
    return matchesSearch && matchesRange;
  });
  const presentCount = visibleAttendance.filter((record) => record.status === "present").length;
  const absentCount = visibleAttendance.filter((record) => record.status === "absent").length;
  const shortLeaveCount = visibleAttendance.filter((record) => record.status === "short-leave").length;
  const totalWorkedHours = visibleAttendance.reduce((sum, record) => sum + Number(record.workingHours || record.workedHours || 0), 0);

  const saveAttendance = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await api.post("/admin/attendance", form);
      setMessage("Attendance saved.");
      setForm({ ...emptyForm, staffId: form.staffId, date: form.date });
      await load();
    } catch (err) {
      setError(apiErrorMessage(err, "Could not save attendance."));
    } finally {
      setSaving(false);
    }
  };

  const deleteAttendance = async (record) => {
    setError("");
    setMessage("");
    try {
      await api.delete(`/admin/attendance/${record._id}`);
      setMessage("Attendance record deleted.");
      await load();
    } catch (err) {
      setError(apiErrorMessage(err, "Could not delete attendance."));
    }
  };

  return (
    <StaffLayout role="admin">
      <Header title="Staff attendance" />
      {message && <p className="success">{message}</p>}
      {error && <p className="error">{error}</p>}

      <section className="stats-grid admin-attendance-stats">
        <StatCard icon={CheckCircle2} label="Present records" value={presentCount} />
        <StatCard icon={Trash2} label="Absent records" value={absentCount} />
        <StatCard icon={Clock} label="Short leave" value={shortLeaveCount} />
        <StatCard icon={CalendarDays} label="Worked hours" value={totalWorkedHours} />
      </section>

      <div className="admin-attendance-view-layout">
        <section className="chart-card admin-attendance-list-card">
          <div className="reservation-section-title">
            <ReceiptText size={18} />
            <h2>Attendance records</h2>
          </div>
          <div className="admin-payroll-toolbar">
            <Input placeholder="Search staff, role, status" value={attendanceSearch} onChange={(event) => setAttendanceSearch(event.target.value)} />
            <select className="input" value={rangeFilter} onChange={(event) => setRangeFilter(event.target.value)}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          {visibleAttendance.length ? (
            <DataTable
              columns={[
                { key: "staffName", label: "Staff" },
                { key: "staffRole", label: "Role" },
                { key: "date", label: "Date", render: (row) => new Date(row.date).toLocaleDateString() },
                { key: "time", label: "Time", render: (row) => row.status === "absent" ? "-" : `${row.startTime || "-"} - ${row.endTime || "-"}` },
                { key: "workedHours", label: "Worked", render: (row) => row.workingHours || row.workedHours || 0 },
                { key: "overtimeHours", label: "OT" },
                { key: "shortLeaveHours", label: "Short leave" },
                { key: "method", label: "Method", render: (row) => <StatusBadge status={row.method || "manual"} /> },
                { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status} /> },
              ]}
              rows={visibleAttendance}
            />
          ) : (
            <EmptyState icon={CalendarDays} title="No attendance records" text="QR kiosk attendance records will appear here." />
          )}
        </section>
      </div>
    </StaffLayout>
  );
}

function AdminMenuPage() {
  const { user } = useAuth();
  const { data: menu, load } = useResource("/admin/menu");
  const emptyMenuForm = {
    name: "",
    description: "",
    price: "",
    category: "Mains",
    spiceLevel: "mild",
    prepTime: 15,
    calories: 0,
    imageUrl: "",
    isAvailable: true,
    restaurantId: user?.restaurantId || DEFAULT_RESTAURANT_ID,
  };
  const [form, setForm] = useState({
    ...emptyMenuForm,
  });
  const [editingItemId, setEditingItemId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [imageName, setImageName] = useState("");

  const handleImageSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      return;
    }

    try {
      const imageUrl = await fileToMenuImage(file);
      setForm((current) => ({ ...current, imageUrl }));
      setImageName(file.name);
      setError("");
    } catch (err) {
      setError(err.message || "Image could not be selected.");
    }
  };

  const resetMenuForm = () => {
    setForm({ ...emptyMenuForm });
    setEditingItemId("");
    setImageName("");
    setError("");
  };

  const startEditMenuItem = (item) => {
    setForm({
      name: item.name || "",
      description: item.description || "",
      price: item.price ?? "",
      category: item.category || "Mains",
      spiceLevel: item.spiceLevel || "mild",
      prepTime: item.prepTime ?? 15,
      calories: item.calories ?? 0,
      imageUrl: item.imageUrl || "",
      isAvailable: item.isAvailable !== false,
      restaurantId: item.restaurantId || user?.restaurantId || DEFAULT_RESTAURANT_ID,
    });
    setEditingItemId(item._id);
    setImageName(item.imageUrl ? "Current image" : "");
    setMessage("");
    setError("");
  };

  const saveMenuItem = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!form.name.trim() || !form.description.trim() || !Number(form.price)) {
      setError("Name, description, and price are required.");
      return;
    }

    try {
      const payload = {
        ...form,
        name: form.name.trim(),
        description: form.description.trim(),
        price: Number(form.price),
        prepTime: Number(form.prepTime) || 15,
        calories: Number(form.calories) || 0,
      };
      const item = unwrap(
        editingItemId
          ? await api.patch(`/admin/menu/${editingItemId}`, payload)
          : await api.post("/admin/menu", payload),
      );
      setMessage(`${item.name} ${editingItemId ? "updated" : "added to the menu"}.`);
      resetMenuForm();
      load();
    } catch (err) {
      setError(err.response?.data?.message || `Menu item could not be ${editingItemId ? "updated" : "added"}.`);
    }
  };

  const deleteMenuItem = async (item) => {
    const confirmed = window.confirm(`Delete ${item.name}?`);
    if (!confirmed) return;

    setMessage("");
    setError("");
    try {
      await api.delete(`/admin/menu/${item._id}`);
      setMessage(`${item.name} deleted from the menu.`);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Menu item could not be deleted.");
    }
  };

  const toggleAvailability = async (item) => {
    await api.patch(`/admin/menu/${item._id}`, { isAvailable: !item.isAvailable });
    load();
  };

  return (
    <StaffLayout role="admin">
      <Header title="Menu items" />
      <div className="admin-menu-layout">
        <section className="chart-card admin-menu-form-card">
          <div className="reservation-section-title">
            <Utensils size={18} />
            <h2>{editingItemId ? "Edit menu item" : "Add menu item"}</h2>
          </div>
          <form className="admin-menu-form" onSubmit={saveMenuItem}>
            <label className="admin-menu-image-picker">
              <input type="file" accept="image/*" onChange={handleImageSelect} />
              <div>
                {form.imageUrl ? <img src={form.imageUrl} alt="Selected menu preview" /> : <Utensils size={34} />}
              </div>
              <span>{imageName || "Choose item image"}</span>
            </label>

            <label>Name<Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Chicken Kottu" /></label>
            <label>Description<textarea className="input textarea" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Short dish description..." /></label>
            <div className="admin-menu-form-grid">
              <label>Price<Input type="number" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="1250" /></label>
              <label>
                Category
                <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  <option>Signature</option>
                  <option>Mains</option>
                  <option>Sri Lankan</option>
                  <option>Seafood</option>
                  <option>Desserts</option>
                  <option>Drinks</option>
                </select>
              </label>
              <label>
                Spice
                <select className="input" value={form.spiceLevel} onChange={(e) => setForm({ ...form, spiceLevel: e.target.value })}>
                  <option value="mild">Mild</option>
                  <option value="medium">Medium</option>
                  <option value="hot">Hot</option>
                </select>
              </label>
              <label>Prep min<Input type="number" min="0" value={form.prepTime} onChange={(e) => setForm({ ...form, prepTime: Number(e.target.value) })} /></label>
              <label>Calories<Input type="number" min="0" value={form.calories} onChange={(e) => setForm({ ...form, calories: Number(e.target.value) })} /></label>
            </div>
            <label className="admin-menu-toggle">
              <input type="checkbox" checked={form.isAvailable} onChange={(e) => setForm({ ...form, isAvailable: e.target.checked })} />
              Available for customers
            </label>
            {error && <p className="checkout-error">{error}</p>}
            {message && <p className="success">{message}</p>}
            <div className="admin-menu-form-actions">
              <Button>{editingItemId ? <CheckCircle2 size={16} /> : <Plus size={16} />} {editingItemId ? "Save changes" : "Add menu item"}</Button>
              {editingItemId && <Button type="button" variant="ghost" onClick={resetMenuForm}>Cancel edit</Button>}
            </div>
          </form>
        </section>

        <section className="chart-card admin-menu-list-card">
          <div className="reservation-section-title">
            <ChefHat size={18} />
            <h2>Current menu</h2>
          </div>
          {menu.length ? (
            <div className="admin-menu-grid">
              {menu.map((item) => (
                <article className="admin-menu-card" key={item._id}>
                  <img src={menuImage(item)} onError={(event) => handleMenuImageError(event, item)} alt={item.name} />
                  <div>
                    <span>{item.category}</span>
                    <h3>{item.name}</h3>
                    <p>{item.description}</p>
                    <strong>{money(item.price)}</strong>
                  </div>
                  <div className="admin-menu-actions">
                    <Button variant="ghost" onClick={() => startEditMenuItem(item)}>
                      Edit
                    </Button>
                    <Button variant="soft" onClick={() => toggleAvailability(item)}>
                      {item.isAvailable ? "Hide" : "Show"}
                    </Button>
                    <button type="button" onClick={() => deleteMenuItem(item)} aria-label={`Delete ${item.name}`}>
                      <Trash2 size={18} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState icon={Utensils} title="No menu items yet" text="Add your first dish with an image to publish the menu." />
          )}
        </section>
      </div>
    </StaffLayout>
  );
}

function AdminInventoryPage() {
  const { user } = useAuth();
  const { data: inventory, load } = useResource("/admin/inventory");
  const emptyForm = {
    itemName: "",
    quantity: "",
    unit: "kg",
    lowStockLimit: "",
    dailyUsageEstimate: "",
    restaurantId: user?.restaurantId || DEFAULT_RESTAURANT_ID,
  };
  const [form, setForm] = useState(emptyForm);
  const [editingItemId, setEditingItemId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const lowStockItems = inventory
    .filter((item) => Number(item.quantity) <= Number(item.lowStockLimit))
    .sort((a, b) => Number(a.quantity) - Number(b.quantity));
  const outOfStockItems = inventory.filter((item) => Number(item.quantity) <= 0);
  const forecastItems = inventory
    .map((item) => {
      const dailyUsage = Number(item.dailyUsageEstimate || 0);
      const quantity = Number(item.quantity || 0);
      return {
        ...item,
        dailyUsage,
        daysRemaining: dailyUsage > 0 ? Math.floor(quantity / dailyUsage) : null,
      };
    })
    .sort((a, b) => (a.daysRemaining ?? 9999) - (b.daysRemaining ?? 9999));
  const totalUnits = inventory.reduce((sum, item) => sum + Number(item.quantity || 0), 0);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingItemId(null);
    setError("");
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    const payload = {
      ...form,
      quantity: Number(form.quantity),
      lowStockLimit: Number(form.lowStockLimit),
      dailyUsageEstimate: Number(form.dailyUsageEstimate || 0),
      restaurantId: form.restaurantId || user?.restaurantId || DEFAULT_RESTAURANT_ID,
    };

    try {
      if (editingItemId) {
        await api.patch(`/admin/inventory/${editingItemId}`, payload);
        setMessage(`${payload.itemName} updated.`);
      } else {
        await api.post("/admin/inventory", payload);
        setMessage(`${payload.itemName} added to inventory.`);
      }
      resetForm();
      await load();
    } catch (err) {
      setError(apiErrorMessage(err, "Could not save inventory item."));
    } finally {
      setSaving(false);
    }
  };

  const editItem = (item) => {
    setEditingItemId(item._id);
    setMessage("");
    setError("");
    setForm({
      itemName: item.itemName || "",
      quantity: item.quantity ?? "",
      unit: item.unit || "kg",
      lowStockLimit: item.lowStockLimit ?? "",
      dailyUsageEstimate: item.dailyUsageEstimate ?? "",
      restaurantId: item.restaurantId || user?.restaurantId || DEFAULT_RESTAURANT_ID,
    });
  };

  const adjustStock = async (item, quantity) => {
    setError("");
    setMessage("");
    try {
      await api.patch(`/admin/inventory/${item._id}`, { quantity });
      setMessage(`${item.itemName} stock updated.`);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err, "Could not update stock."));
    }
  };

  const deleteItem = async (item) => {
    setError("");
    setMessage("");
    try {
      await api.delete(`/admin/inventory/${item._id}`);
      setMessage(`${item.itemName} removed from inventory.`);
      if (editingItemId === item._id) resetForm();
      await load();
    } catch (err) {
      setError(apiErrorMessage(err, "Could not delete inventory item."));
    }
  };

  return (
    <StaffLayout role="admin">
      <Header title="Inventory" />
      {message && <p className="success">{message}</p>}
      {error && <p className="error">{error}</p>}

      <section className="stats-grid admin-inventory-stats">
        <StatCard icon={PackageCheck} label="Inventory items" value={inventory.length} />
        <StatCard icon={Trash2} label="Out of stock" value={outOfStockItems.length} />
        <StatCard icon={Bell} label="Low stock" value={lowStockItems.length} />
        <StatCard icon={ClipboardList} label="Total stock units" value={totalUnits} />
      </section>

      <section className="chart-card admin-low-stock-panel">
        <div className="reservation-section-title">
          <Bell size={18} />
          <h2>Stock alerts</h2>
        </div>
        {lowStockItems.length ? (
          <div className="admin-low-stock-list">
            {lowStockItems.map((item) => (
              <article className={`admin-low-stock-card ${Number(item.quantity) <= 0 ? "admin-out-stock-card" : ""}`} key={item._id}>
                <div>
                  <strong>{item.itemName}</strong>
                  <StatusBadge status={Number(item.quantity) <= 0 ? "out-of-stock" : "low"} />
                </div>
                <p>{item.quantity} {item.unit} available. Limit is {item.lowStockLimit} {item.unit}.</p>
                <Button variant="soft" onClick={() => editItem(item)}><Edit3 size={16} /> Check stock</Button>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState icon={Bell} title="No low stock items" text="Items will appear here when quantity reaches the low stock limit." />
        )}
      </section>

      <div className="admin-inventory-layout">
        <section className="chart-card admin-inventory-form-card">
          <div className="reservation-section-title">
            <PackageCheck size={18} />
            <h2>{editingItemId ? "Edit inventory item" : "Add inventory item"}</h2>
          </div>
          <form className="admin-inventory-form" onSubmit={submit}>
            <label>
              <span>Item name</span>
              <Input value={form.itemName} onChange={(event) => setForm({ ...form, itemName: event.target.value })} placeholder="Chicken breast" required />
            </label>
            <div className="admin-inventory-form-grid">
              <label>
                <span>Quantity</span>
                <Input type="number" min="0" step="0.01" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} placeholder="25" required />
              </label>
              <label>
                <span>Unit</span>
                <select className="input" value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })}>
                  <option value="kg">kg</option>
                  <option value="g">g</option>
                  <option value="L">L</option>
                  <option value="ml">ml</option>
                  <option value="pcs">pcs</option>
                  <option value="packs">packs</option>
                </select>
              </label>
            </div>
            <label>
              <span>Low stock limit</span>
              <Input type="number" min="0" step="0.01" value={form.lowStockLimit} onChange={(event) => setForm({ ...form, lowStockLimit: event.target.value })} placeholder="5" required />
            </label>
            <label>
              <span>Daily use estimate</span>
              <Input type="number" min="0" step="0.01" value={form.dailyUsageEstimate} onChange={(event) => setForm({ ...form, dailyUsageEstimate: event.target.value })} placeholder="2" />
            </label>
            <div className="admin-inventory-actions">
              {editingItemId && <Button type="button" variant="ghost" onClick={resetForm}>Cancel edit</Button>}
              <Button disabled={saving}><Plus size={16} /> {saving ? "Saving..." : editingItemId ? "Update item" : "Add item"}</Button>
            </div>
          </form>
        </section>

        <section className="chart-card admin-inventory-list-card">
          <div className="reservation-section-title">
            <ClipboardList size={18} />
            <h2>Stock check</h2>
          </div>
          {inventory.length ? (
            <div className="admin-inventory-list">
              {inventory.map((item) => {
                const isOut = Number(item.quantity) <= 0;
                const isLow = Number(item.quantity) <= Number(item.lowStockLimit);
                const restockQuantity = Math.max(Number(item.lowStockLimit || 0) * 2, Number(item.quantity || 0) + 1);
                const dailyUsage = Number(item.dailyUsageEstimate || 0);
                const daysRemaining = dailyUsage > 0 ? Math.floor(Number(item.quantity || 0) / dailyUsage) : null;
                return (
                  <article className={`admin-inventory-card ${isLow ? "admin-inventory-card-low" : ""} ${isOut ? "admin-inventory-card-out" : ""}`} key={item._id}>
                    <div className="admin-inventory-card-main">
                      <PackageCheck />
                      <div>
                        <h3>{item.itemName}</h3>
                        <p>{item.quantity} {item.unit} available - low limit {item.lowStockLimit} {item.unit}</p>
                        <small>{dailyUsage ? `${dailyUsage} ${item.unit}/day - ${daysRemaining} day${daysRemaining === 1 ? "" : "s"} remaining` : "Daily use estimate not set"}</small>
                      </div>
                    </div>
                    <StatusBadge status={isOut ? "out-of-stock" : isLow ? "low" : "ready"} />
                    <div className="admin-inventory-card-actions">
                      <Button variant="ghost" onClick={() => editItem(item)}><Edit3 size={16} /> Edit</Button>
                      <Button variant="soft" onClick={() => adjustStock(item, restockQuantity)}><Plus size={16} /> Restock</Button>
                      <Button variant="ghost" onClick={() => deleteItem(item)}><Trash2 size={16} /> Delete</Button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyState icon={PackageCheck} title="No inventory items" text="Add stock items to track low-stock alerts and reports." />
          )}
        </section>
      </div>

      <section className="chart-card admin-stock-forecast-panel">
        <div className="reservation-section-title">
          <TrendingUp size={18} />
          <h2>Daily usage forecast</h2>
        </div>
        <DataTable
          columns={[
            { key: "itemName", label: "Item" },
            { key: "quantity", label: "Stock", render: (row) => `${row.quantity} ${row.unit}` },
            { key: "dailyUsage", label: "Used/day", render: (row) => row.dailyUsage ? `${row.dailyUsage} ${row.unit}` : "Not set" },
            { key: "daysRemaining", label: "Days left", render: (row) => row.daysRemaining === null ? "Set daily use" : row.daysRemaining },
            { key: "status", label: "Status", render: (row) => <StatusBadge status={Number(row.quantity) <= 0 ? "out-of-stock" : Number(row.quantity) <= Number(row.lowStockLimit) ? "low" : "ready"} /> },
          ]}
          rows={forecastItems}
        />
      </section>
    </StaffLayout>
  );
}

function AdminTablesPage() {
  const { user } = useAuth();
  const { data: tables, load } = useResource("/admin/tables");
  const [form, setForm] = useState({
    capacity: 2,
    serviceStatus: "available",
    restaurantId: user?.restaurantId || DEFAULT_RESTAURANT_ID,
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const availableCount = tables.filter((table) => !table.isOccupied).length;
  const occupiedCount = tables.length - availableCount;
  const tableCustomerQrUrl = (table) => `${location.origin}/customer/table/${table._id}`;
  const nextTableNumber = String(
    tables.reduce((max, table) => {
      const parsed = Number.parseInt(String(table.tableNumber).replace(/\D/g, ""), 10);
      return Number.isFinite(parsed) ? Math.max(max, parsed) : max;
    }, 0) + 1,
  ).padStart(2, "0");

  const addTable = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!Number(form.capacity)) {
      setError("Seat capacity is required.");
      return;
    }

    try {
      const table = unwrap(await api.post("/admin/tables", {
        ...form,
        capacity: Number(form.capacity),
        isOccupied: false,
      }));
      setMessage(`Table ${table.tableNumber} added successfully.`);
      setForm((current) => ({ ...current, capacity: 2, serviceStatus: "available" }));
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Table could not be added.");
    }
  };

  const deleteTable = async (table) => {
    const confirmed = window.confirm(`Delete Table ${table.tableNumber}?`);
    if (!confirmed) return;

    setMessage("");
    setError("");
    try {
      await api.delete(`/admin/tables/${table._id}`);
      setMessage(`Table ${table.tableNumber} deleted.`);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Table could not be deleted.");
    }
  };

  const downloadTableQr = async (table) => {
    const canvas = document.createElement("canvas");
    canvas.width = 900;
    canvas.height = 1100;
    const context = canvas.getContext("2d");
    const qrUrl = tableCustomerQrUrl(table);
    const qrApi = `https://api.qrserver.com/v1/create-qr-code/?size=520x520&data=${encodeURIComponent(qrUrl)}`;
    const qrImage = new Image();
    qrImage.crossOrigin = "anonymous";
    qrImage.onload = () => {
      context.fillStyle = "#fff8e1";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = "#073828";
      context.font = "900 54px Arial";
      context.fillText("DineFlow", 72, 96);
      context.fillStyle = "#8b6f47";
      context.font = "700 24px Arial";
      context.fillText("Restaurant table ordering QR", 72, 132);
      context.fillStyle = "#08784f";
      context.font = "900 72px Arial";
      context.fillText(`Table ${table.tableNumber}`, 72, 235);
      context.fillStyle = "#ffffff";
      context.strokeStyle = "#d8cba9";
      context.lineWidth = 4;
      if (context.roundRect) {
        context.beginPath();
        context.roundRect(150, 300, 600, 600, 34);
        context.fill();
        context.stroke();
      } else {
        context.fillRect(150, 300, 600, 600);
        context.strokeRect(150, 300, 600, 600);
      }
      context.drawImage(qrImage, 190, 340, 520, 520);
      context.fillStyle = "#21170b";
      context.font = "800 30px Arial";
      context.textAlign = "center";
      context.fillText("Scan to login and order", canvas.width / 2, 965);
      context.fillStyle = "#635f53";
      context.font = "600 20px Arial";
      context.fillText(qrUrl, canvas.width / 2, 1006);
      context.textAlign = "left";
      const link = document.createElement("a");
      link.download = `dineflow-table-${table.tableNumber}-qr.png`.replace(/\s+/g, "-").toLowerCase();
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
    qrImage.src = qrApi;
  };

  return (
    <StaffLayout role="admin">
      <Header title="Tables and QR codes" />
      <div className="admin-table-stats">
        <StatCard icon={Table2} label="Total tables" value={tables.length} />
        <StatCard icon={CheckCircle2} label="Available" value={availableCount} />
        <StatCard icon={Bell} label="Occupied" value={occupiedCount} />
      </div>

      <div className="admin-table-layout">
        <section className="chart-card admin-table-form-card">
          <div className="reservation-section-title">
            <Table2 size={18} />
            <h2>Add table</h2>
          </div>
          <form className="admin-table-form" onSubmit={addTable}>
            <div className="admin-table-next-number">
              <span>Next table number</span>
              <strong>Table {nextTableNumber}</strong>
              <p>Generated automatically when you add the table.</p>
            </div>
            <label>
              Seats
              <Input type="number" min="1" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} />
            </label>
            <label>
              Service status
              <select className="input" value={form.serviceStatus} onChange={(e) => setForm({ ...form, serviceStatus: e.target.value })}>
                <option value="available">Available</option>
                <option value="seated">Seated</option>
                <option value="ordering">Ordering</option>
                <option value="served">Served</option>
                <option value="needs-cleaning">Needs cleaning</option>
              </select>
            </label>
            {error && <p className="checkout-error">{error}</p>}
            {message && <p className="success">{message}</p>}
            <Button><Plus size={16} /> Add table</Button>
          </form>
        </section>

        <section className="chart-card admin-table-list-card">
          <div className="reservation-section-title">
            <QrCode size={18} />
            <h2>Current tables</h2>
          </div>
          {tables.length ? (
            <div className="admin-table-grid">
              {tables.map((table) => (
                <article className="admin-table-card" key={table._id}>
                  <div className="admin-table-qr">
                    <QRCodeSVG value={tableCustomerQrUrl(table)} size={88} />
                  </div>
                  <div className="admin-table-info">
                    <h3>Table {table.tableNumber}</h3>
                    <p>{table.capacity} seats</p>
                    <small className="muted">Scan to login and order</small>
                    <div>
                      <StatusBadge status={table.isOccupied ? "occupied" : "free"} />
                      <StatusBadge status={table.serviceStatus || "available"} />
                    </div>
                    <Button variant="soft" onClick={() => downloadTableQr(table)}><QrCode size={16} /> Download QR</Button>
                  </div>
                  <button className="admin-table-delete" type="button" onClick={() => deleteTable(table)} aria-label={`Delete table ${table.tableNumber}`}>
                    <Trash2 size={18} />
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState icon={Table2} title="No tables yet" text="Add your first table to generate its QR code." />
          )}
        </section>
      </div>
    </StaffLayout>
  );
}

function AdminReservationsPage() {
  const { data: reservations, load } = useResource("/admin/reservations");
  const { socket } = useSocket();
  const [message, setMessage] = useState("");
  const pending = reservations.filter((reservation) => reservation.status === "pending");

  useEffect(() => {
    if (!socket) return;
    socket.on("reservation:new", load);
    socket.on("reservation:update", load);
    return () => {
      socket.off("reservation:new", load);
      socket.off("reservation:update", load);
    };
  }, [socket]);

  const updateReservationStatus = async (reservation, status) => {
    await api.patch(`/admin/reservations/${reservation._id}`, { status });
    setMessage(`Reservation ${status === "confirmed" ? "accepted" : "updated"} for ${reservation.customerName}.`);
    load();
  };

  return (
    <StaffLayout role="admin">
      <Header title="Reservations" />
      {message && <p className="success">{message}</p>}
      <div className="admin-reservation-grid">
        <section className="chart-card admin-reservation-panel">
          <div className="reservation-section-title">
            <Bell size={18} />
            <h2>Pending requests</h2>
          </div>
          {pending.length ? (
            <div className="admin-reservation-list">
              {pending.map((reservation) => (
                <AdminReservationCard
                  key={reservation._id}
                  reservation={reservation}
                  onAccept={() => updateReservationStatus(reservation, "confirmed")}
                  onReject={() => updateReservationStatus(reservation, "cancelled")}
                />
              ))}
            </div>
          ) : (
            <EmptyState icon={CalendarDays} title="No pending reservations" text="New customer requests will appear here for confirmation." />
          )}
        </section>

        <section className="chart-card admin-reservation-panel">
          <div className="reservation-section-title">
            <ReceiptText size={18} />
            <h2>Recent reservations</h2>
          </div>
          <div className="admin-reservation-list">
            {reservations.slice(0, 8).map((reservation) => (
              <article className="admin-reservation-mini" key={reservation._id}>
                <div>
                  <h3>{reservation.customerName}</h3>
                  <p>{new Date(reservation.date).toLocaleDateString()} - {reservation.time} - Table {reservation.tableId?.tableNumber || "pending"}</p>
                </div>
                <StatusBadge status={reservation.status} />
              </article>
            ))}
          </div>
        </section>
      </div>
    </StaffLayout>
  );
}

function AdminReservationCard({ reservation, onAccept, onReject }) {
  return (
    <article className="admin-reservation-card">
      <div className="admin-reservation-head">
        <div>
          <h3>{reservation.customerName}</h3>
          <p>{reservation.contactNumber}</p>
        </div>
        <StatusBadge status={reservation.status} />
      </div>
      <div className="admin-reservation-meta">
        <span><CalendarDays size={15} /> {new Date(reservation.date).toLocaleDateString()}</span>
        <span><Clock size={15} /> {reservation.time}</span>
        <span><Users size={15} /> {reservation.persons} guests</span>
        <span><Table2 size={15} /> Table {reservation.tableId?.tableNumber || "pending"}</span>
      </div>
      {reservation.notes && <p className="admin-reservation-note">{reservation.notes}</p>}
      <div className="admin-reservation-actions">
        <Button onClick={onAccept}><CheckCircle2 size={16} /> Accept</Button>
        <Button variant="ghost" onClick={onReject}><Trash2 size={16} /> Reject</Button>
      </div>
    </article>
  );
}

function ReportsPage() {
  const { data: analyticsResponse } = useResource("/admin/analytics", {});
  const { data: salesReport } = useResource("/admin/analytics/sales-report", {});
  const { data: ordersReport } = useResource("/admin/analytics/orders-summary", {});
  const { data: inventory } = useResource("/admin/inventory");
  const analytics = analyticsResponse.analytics || {};
  const categorySales = salesReport.salesByCategory || [];
  const orderSummary = ordersReport.summary || [];
  const totalRevenue = analytics.revenue ?? categorySales.reduce((sum, row) => sum + (row.revenue || 0), 0);
  const totalOrders = analytics.totalOrders ?? orderSummary.reduce((sum, row) => sum + (row.count || 0), 0);
  const totalItemsSold = categorySales.reduce((sum, row) => sum + (row.quantity || 0), 0);
  const averageOrderValue = analytics.averageOrderValue || (totalOrders ? totalRevenue / totalOrders : 0);
  const trendData = (analytics.chartData || []).map((row) => ({
    ...row,
    label: new Date(row.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  }));
  const statusColors = {
    pending: "#f5ba45",
    accepted: "#7cf8c8",
    preparing: "#00d094",
    ready: "#55a7ff",
    served: "#3ee58f",
    completed: "#3ee58f",
    cancelled: "#ff6b57",
  };
  const stockForecast = inventory
    .map((item) => {
      const dailyUsage = Number(item.dailyUsageEstimate || 0);
      const quantity = Number(item.quantity || 0);
      return {
        ...item,
        dailyUsage,
        daysRemaining: dailyUsage > 0 ? Math.floor(quantity / dailyUsage) : null,
      };
    })
    .sort((a, b) => (a.daysRemaining ?? 9999) - (b.daysRemaining ?? 9999));

  return (
    <StaffLayout role="admin">
      <Header title="Reports" />
      <section className="stats-grid report-stats">
        <StatCard icon={WalletCards} label="Revenue" value={money(totalRevenue)} />
        <StatCard icon={ClipboardList} label="Orders" value={totalOrders} />
        <StatCard icon={PackageCheck} label="Items sold" value={totalItemsSold} />
        <StatCard icon={TrendingUp} label="Avg order" value={money(averageOrderValue)} />
      </section>

      <div className="report-grid">
        <section className="chart-card report-card report-card-wide">
          <div className="report-card-head">
            <div>
              <span className="eyebrow">Sales</span>
              <h2>Revenue trend</h2>
            </div>
            <BarChart3 />
          </div>
          {trendData.length ? (
            <ResponsiveContainer height={280}>
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(120, 140, 130, 0.2)" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip formatter={(value, name) => [name === "revenue" ? money(value) : value, name]} />
                <Bar dataKey="revenue" fill="#00d094" radius={[8, 8, 0, 0]} />
                <Bar dataKey="orders" fill="#7cf8c8" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon={BarChart3} title="No sales yet" text="Revenue trend will appear after orders are created." />
          )}
        </section>

        <section className="chart-card report-card report-category-card">
          <div className="report-card-head">
            <div>
              <span className="eyebrow">Orders</span>
              <h2>Status summary</h2>
            </div>
            <ClipboardList />
          </div>
          {orderSummary.length ? (
            <>
              <ResponsiveContainer height={220}>
                <PieChart>
                  <Pie data={orderSummary} dataKey="count" nameKey="_id" outerRadius={82} innerRadius={48}>
                    {orderSummary.map((row) => <Cell key={row._id} fill={statusColors[row._id] || "#aeb9b5"} />)}
                  </Pie>
                  <Tooltip formatter={(value, name, item) => [value, item.payload._id]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="report-status-list">
                {orderSummary.map((row) => (
                  <div key={row._id}>
                    <span><i style={{ background: statusColors[row._id] || "#aeb9b5" }} />{row._id || "unknown"}</span>
                    <strong>{row.count} orders</strong>
                    <small>{money(row.totalAmount)}</small>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <EmptyState icon={ClipboardList} title="No orders yet" text="Order statuses will appear here." />
          )}
        </section>

        <section className="chart-card report-card">
          <div className="report-card-head">
            <div>
              <span className="eyebrow">Categories</span>
              <h2>Sales by category</h2>
            </div>
            <Utensils />
          </div>
          {categorySales.length ? (
            <DataTable
              columns={[
                { key: "_id", label: "Category", render: (row) => row._id || "Uncategorized" },
                { key: "quantity", label: "Qty" },
                { key: "revenue", label: "Revenue", render: (row) => money(row.revenue) },
              ]}
              rows={categorySales}
            />
          ) : (
            <EmptyState icon={Utensils} title="No category sales" text="Category report will appear after items are sold." />
          )}
        </section>

        <section className="chart-card report-card">
          <div className="report-card-head">
            <div>
              <span className="eyebrow">Menu</span>
              <h2>Top selling foods</h2>
            </div>
            <Star />
          </div>
          {(analytics.topSellingFoods || []).length ? (
            <DataTable
              columns={[
                { key: "name", label: "Item" },
                { key: "quantitySold", label: "Sold" },
                { key: "revenue", label: "Revenue", render: (row) => money(row.revenue) },
              ]}
              rows={analytics.topSellingFoods}
            />
          ) : (
            <EmptyState icon={Star} title="No top items yet" text="Top sellers will appear after orders are placed." />
          )}
        </section>

        <section className="chart-card report-card">
          <div className="report-card-head">
            <div>
              <span className="eyebrow">Inventory</span>
              <h2>Low stock alerts</h2>
            </div>
            <PackageCheck />
          </div>
          {(analytics.lowStockAlerts || []).length ? (
            <div className="report-alert-list">
              {analytics.lowStockAlerts.map((item) => (
                <article key={item.name}>
                  <strong>{item.name}</strong>
                  <span>{item.stock} {item.unit} left</span>
                  <small>Limit: {item.threshold} {item.unit}</small>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState icon={PackageCheck} title="Stock looks good" text="Low stock items will be listed here." />
          )}
        </section>

        <section className="chart-card report-card report-card-wide">
          <div className="report-card-head">
            <div>
              <span className="eyebrow">Activity</span>
              <h2>Recent orders</h2>
            </div>
            <ReceiptText />
          </div>
          {(analytics.recentOrders || []).length ? (
            <DataTable
              columns={[
                { key: "orderNumber", label: "Order" },
                { key: "customerName", label: "Customer", render: (row) => row.customerName || row.customer?.name || "Guest" },
                { key: "tableNumber", label: "Table" },
                { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status} /> },
                { key: "totalAmount", label: "Total", render: (row) => money(row.totalAmount) },
              ]}
              rows={analytics.recentOrders}
            />
          ) : (
            <EmptyState icon={ReceiptText} title="No recent orders" text="Recent orders will show here as they come in." />
          )}
        </section>
      </div>

      <section className="chart-card report-table-section">
        <div className="report-card-head">
          <div>
            <span className="eyebrow">Inventory</span>
            <h2>Daily usage forecast</h2>
          </div>
          <TrendingUp />
        </div>
        {stockForecast.length ? (
          <DataTable
            columns={[
              { key: "itemName", label: "Item" },
              { key: "quantity", label: "Stock", render: (row) => `${row.quantity} ${row.unit}` },
              { key: "dailyUsage", label: "Used/day", render: (row) => row.dailyUsage ? `${row.dailyUsage} ${row.unit}` : "Not set" },
              { key: "daysRemaining", label: "Days left", render: (row) => row.daysRemaining === null ? "Set daily use" : row.daysRemaining },
              { key: "status", label: "Status", render: (row) => <StatusBadge status={Number(row.quantity) <= 0 ? "out-of-stock" : Number(row.quantity) <= Number(row.lowStockLimit) ? "low" : "ready"} /> },
            ]}
            rows={stockForecast}
          />
        ) : (
          <EmptyState icon={PackageCheck} title="No inventory forecast" text="Add inventory items and daily use estimates to generate this report." />
        )}
      </section>
    </StaffLayout>
  );
}

function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppProviders>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<LoginPage mode="register" />} />
          <Route path="/staff-kiosk" element={<StaffAttendanceKioskPage />} />
          <Route path="/menu/:tableId" element={<MenuPage />} />
          <Route path="/customer" element={<ProtectedRoute roles={["customer"]}><CustomerDashboard /></ProtectedRoute>} />
          <Route path="/customer/table/:tableId" element={<ProtectedRoute roles={["customer"]}><CustomerTableEntryPage /></ProtectedRoute>} />
          <Route path="/customer/menu" element={<ProtectedRoute roles={["customer"]}><MenuPage /></ProtectedRoute>} />
          <Route path="/customer/cart" element={<ProtectedRoute roles={["customer"]}><CartPage /></ProtectedRoute>} />
          <Route path="/customer/checkout" element={<ProtectedRoute roles={["customer"]}><CheckoutPage /></ProtectedRoute>} />
          <Route path="/customer/payment/:orderId" element={<ProtectedRoute roles={["customer"]}><PaymentPage /></ProtectedRoute>} />
          <Route path="/customer/tracking" element={<ProtectedRoute roles={["customer"]}><TrackingPage /></ProtectedRoute>} />
          <Route path="/customer/tracking/:orderId" element={<ProtectedRoute roles={["customer"]}><TrackingPage /></ProtectedRoute>} />
          <Route path="/customer/orders" element={<ProtectedRoute roles={["customer"]}><TrackingPage /></ProtectedRoute>} />
          <Route path="/customer/reservations" element={<ProtectedRoute roles={["customer"]}><ReservationPage /></ProtectedRoute>} />
          <Route path="/customer/reviews" element={<ProtectedRoute roles={["customer"]}><ReviewPage /></ProtectedRoute>} />
          <Route path="/waiter" element={<ProtectedRoute roles={["waiter"]}><WaiterDashboard /></ProtectedRoute>} />
          <Route path="/waiter/attendance" element={<ProtectedRoute roles={["waiter"]}><WaiterAttendancePage /></ProtectedRoute>} />
          <Route path="/waiter/profile" element={<ProtectedRoute roles={["waiter"]}><WaiterProfilePage /></ProtectedRoute>} />
          <Route path="/waiter/tables" element={<ProtectedRoute roles={["waiter"]}><WaiterTables /></ProtectedRoute>} />
          <Route path="/waiter/manual-order" element={<ProtectedRoute roles={["waiter"]}><ManualOrder /></ProtectedRoute>} />
          <Route path="/kitchen" element={<ProtectedRoute roles={["chef", "staff", "kitchen"]}><KitchenDashboard /></ProtectedRoute>} />
          <Route path="/kitchen/attendance" element={<ProtectedRoute roles={["chef", "staff", "kitchen"]}><KitchenAttendancePage /></ProtectedRoute>} />
          <Route path="/kitchen/inventory" element={<ProtectedRoute roles={["chef", "staff", "kitchen"]}><InventoryPage /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute roles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute roles={["admin"]}><AdminUsersPage /></ProtectedRoute>} />
          <Route path="/admin/attendance" element={<ProtectedRoute roles={["admin"]}><AdminAttendancePage /></ProtectedRoute>} />
          <Route path="/admin/payroll" element={<ProtectedRoute roles={["admin"]}><AdminPayrollPage /></ProtectedRoute>} />
          <Route path="/admin/menu" element={<ProtectedRoute roles={["admin"]}><AdminMenuPage /></ProtectedRoute>} />
          <Route path="/admin/tables" element={<ProtectedRoute roles={["admin"]}><AdminTablesPage /></ProtectedRoute>} />
          <Route path="/admin/orders" element={<ProtectedRoute roles={["admin"]}><AdminResource title="Orders" path="/admin/orders" columns={[{ key: "orderNumber", label: "Order" }, { key: "customerName", label: "Customer" }, { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status} /> }, { key: "totalAmount", label: "Total", render: (row) => money(row.totalAmount) }]} /></ProtectedRoute>} />
          <Route path="/admin/payments" element={<ProtectedRoute roles={["admin"]}><AdminResource title="Payments" path="/admin/payments" columns={[{ key: "paymentMethod", label: "Method" }, { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status} /> }, { key: "amount", label: "Amount", render: (row) => money(row.amount) }]} /></ProtectedRoute>} />
          <Route path="/admin/reviews" element={<ProtectedRoute roles={["admin"]}><AdminResource title="Reviews" path="/admin/reviews" columns={[{ key: "rating", label: "Rating" }, { key: "comment", label: "Comment" }]} /></ProtectedRoute>} />
          <Route path="/admin/reservations" element={<ProtectedRoute roles={["admin"]}><AdminReservationsPage /></ProtectedRoute>} />
          <Route path="/admin/inventory" element={<ProtectedRoute roles={["admin"]}><AdminInventoryPage /></ProtectedRoute>} />
          <Route path="/admin/reports" element={<ProtectedRoute roles={["admin"]}><ReportsPage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </AppProviders>
    </BrowserRouter>
  );
}

const rootElement = document.getElementById("root");
const root = rootElement._dineflowRoot || createRoot(rootElement);
rootElement._dineflowRoot = root;
root.render(<App />);

if ("serviceWorker" in navigator && (import.meta.env.PROD || location.hostname === "localhost")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}



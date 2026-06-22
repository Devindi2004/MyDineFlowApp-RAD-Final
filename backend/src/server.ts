import "dotenv/config";
import http from "http";
import app from "./app";
import { connectDB } from "./config/db";
import { initSocket } from "./sockets/socketManager";

const PORT = Number(process.env.PORT ?? 5000);

async function start(): Promise<void> {
  await connectDB();

  const httpServer = http.createServer(app);
  initSocket(httpServer);

  httpServer.listen(PORT, () => {
    console.log(`DineFlow backend running on http://localhost:${PORT}`);
    console.log(`API base: http://localhost:${PORT}/api/v1`);
    console.log(`Environment: ${process.env.NODE_ENV ?? "development"}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});

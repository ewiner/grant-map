import type { Express } from "express";
import { createServer, type Server } from "http";

export async function registerRoutes(app: Express): Promise<Server> {
  // Static data app — no API routes needed
  const httpServer = createServer(app);
  return httpServer;
}

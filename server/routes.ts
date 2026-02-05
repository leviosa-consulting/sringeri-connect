import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const SRINGERI_API_URL = process.env.VITE_SRINGERI_API_URL || "https://dsspv2.lcpl.in";
  const SRINGERI_API_KEY = process.env.SRINGERI_API_KEY;

  app.get("/api/user/profile", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const token = authHeader.split(" ")[1];

      const response = await fetch(`${SRINGERI_API_URL}/api/user/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
          ...(SRINGERI_API_KEY && { "X-API-Key": SRINGERI_API_KEY }),
        },
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: "Failed to fetch profile" });
      }

      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  return httpServer;
}

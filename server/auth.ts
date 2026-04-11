import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "./db/shared";
import type { Express, Request, Response, NextFunction } from "express";

interface AuthRequest extends Request {
  user?: {
    id: number;
    username: string;
    role: string;
  };
}

export const seedAdmin = async () => {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return;

  const { rowCount } = await pool.query("SELECT 1 FROM users LIMIT 1");
  if (rowCount === 0) {
    const hash = await bcrypt.hash(adminPassword, 10);
    await pool.query(
      "INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3)",
      ["admin", hash, "admin"]
    );
  }
};

export const requireAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Non autorisé" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "fractal-pdp-secret") as any;
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: "Token invalide" });
  }
};

export const requireRole = (roles: string[]) => (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ error: "Accès refusé" });
  }
  next();
};

export const auditLogger = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (["POST", "PUT", "DELETE"].includes(req.method)) {
    res.on("finish", async () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          const userId = req.user?.id || null;
          const actionType = `${req.method}_${req.path.replace(/^\/api\//, "").replace(/\//g, "_").toUpperCase()}`;
          const details = JSON.stringify({
            params: req.params,
            body: req.body,
          });

          await pool.query(
            "INSERT INTO audit_logs (user_id, action_type, details) VALUES ($1, $2, $3)",
            [userId, actionType, details]
          );
        } catch (error) {
          console.error(error);
        }
      }
    });
  }
  next();
};

export const setupAuthRoutes = (app: Express) => {
  app.post("/api/auth/login", async (req, res) => {
    const { username, password } = req.body;
    const { rows } = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
    const user = rows[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: "Identifiants invalides" });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || "fractal-pdp-secret",
      { expiresIn: "7d" }
    );

    res.json({ token, role: user.role, username: user.username });
  });

  app.get("/api/users", requireAuth, requireRole(["admin"]), async (req, res) => {
    const { rows } = await pool.query("SELECT id, username, role, created_at FROM users ORDER BY id ASC");
    res.json(rows);
  });

  app.post("/api/users", requireAuth, requireRole(["admin"]), async (req, res) => {
    const { username, password, role } = req.body;
    try {
      const hash = await bcrypt.hash(password, 10);
      await pool.query(
        "INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3)",
        [username, hash, role]
      );
      res.json({ success: true });
    } catch (e) {
      res.status(400).json({ error: "Utilisateur existant ou données invalides" });
    }
  });

  app.put("/api/users/:id/role", requireAuth, requireRole(["admin"]), async (req, res) => {
    const { role } = req.body;
    await pool.query("UPDATE users SET role = $1 WHERE id = $2", [role, req.params.id]);
    res.json({ success: true });
  });
};

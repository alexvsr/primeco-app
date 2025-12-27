import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

export interface AuthPayload {
  sub: number;
  roles: string[];
}

export interface AuthenticatedRequest extends Request {
  user?: AuthPayload;
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing authorization header" });
  }
  const token = header.slice(7);
  try {
    const decoded = jwt.verify(token, env.jwtAccessSecret);
    const payload = decoded as unknown as AuthPayload;
    req.user = payload;
    return next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
}

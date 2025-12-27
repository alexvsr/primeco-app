import { NextFunction, Response } from "express";
import { AuthenticatedRequest } from "./auth";

export function requireRoles(...roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userRoles = req.user?.roles || [];
    const allowed = roles.some((r) => userRoles.includes(r));
    if (!allowed) {
      return res.status(403).json({ message: "Forbidden" });
    }
    return next();
  };
}

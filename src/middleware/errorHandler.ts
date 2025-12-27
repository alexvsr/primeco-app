import { NextFunction, Request, Response } from "express";
import { logger } from "../config/logger";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  logger.error(err);
  return res.status(500).json({ message: "Internal server error" });
}

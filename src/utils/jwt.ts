import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { AuthPayload } from "../middleware/auth";

export function signAccess(payload: AuthPayload) {
  return jwt.sign(payload as object, env.jwtAccessSecret, {
    expiresIn: env.jwtAccessExpiresIn
  } as jwt.SignOptions);
}

export function signRefresh(payload: AuthPayload) {
  return jwt.sign(payload as object, env.jwtRefreshSecret, {
    expiresIn: env.jwtRefreshExpiresIn
  } as jwt.SignOptions);
}

export function verifyRefresh(token: string): AuthPayload {
  const decoded = jwt.verify(token, env.jwtRefreshSecret);
  return decoded as unknown as AuthPayload;
}

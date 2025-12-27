import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: parseInt(process.env.PORT || "4000", 10),
  databaseUrl: process.env.DATABASE_URL || "",
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || "admin",
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || "admin",
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
};

if (!env.databaseUrl) {
  // eslint-disable-next-line no-console
  console.warn("DATABASE_URL is not set. Prisma will fail without it.");
}

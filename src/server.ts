import express from "express";
import cors from "cors";
import { env } from "./config/env";
import routes from "./routes";
import { errorHandler } from "./middleware/errorHandler";
import { logger } from "./config/logger";

import path from "path";

const app = express();

app.use(cors({
  origin: [
    "https://prime-co.alexvavasseur.ch",
    "https://api.alexvavasseur.ch",
    "http://localhost:3000",
    "http://localhost:5500"
  ],
  credentials: true
}));
app.use(express.json());

// Serve static files from root directory
app.use(express.static(path.join(__dirname, "..")));

// Redirect root to index.html
app.get("/", (_req, res) => {
  res.redirect("/index.html");
});

app.get("/ping", (_req, res) => {
  res.send("pong-primeco");
});

// API routes
app.use("/api", routes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

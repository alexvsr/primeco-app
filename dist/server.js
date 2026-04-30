"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const routes_1 = __importDefault(require("./routes"));
const path_1 = __importDefault(require("path"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)({
    origin: [
        "https://prime-co.alexvavasseur.ch",
        "https://api.alexvavasseur.ch",
        "http://localhost:3000",
        "http://localhost:5500"
    ],
    credentials: true
}));
app.use(express_1.default.json());
// Serve static files from root directory
app.use(express_1.default.static(path_1.default.join(__dirname, "..")));
// Redirect root to index.html
app.get("/", (_req, res) => {
    res.redirect("/index.html");
});
app.get("/ping", (_req, res) => {
    res.send("pong-primeco");
});
// API routes
app.use("/api", routes_1.default);
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

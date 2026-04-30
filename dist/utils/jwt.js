"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signAccess = signAccess;
exports.signRefresh = signRefresh;
exports.verifyRefresh = verifyRefresh;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
function signAccess(payload) {
    return jsonwebtoken_1.default.sign(payload, env_1.env.jwtAccessSecret, {
        expiresIn: env_1.env.jwtAccessExpiresIn
    });
}
function signRefresh(payload) {
    return jsonwebtoken_1.default.sign(payload, env_1.env.jwtRefreshSecret, {
        expiresIn: env_1.env.jwtRefreshExpiresIn
    });
}
function verifyRefresh(token) {
    const decoded = jsonwebtoken_1.default.verify(token, env_1.env.jwtRefreshSecret);
    return decoded;
}

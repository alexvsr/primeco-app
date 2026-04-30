"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRoles = requireRoles;
function requireRoles(...roles) {
    return (req, res, next) => {
        const userRoles = req.user?.roles || [];
        const allowed = roles.some((r) => userRoles.includes(r));
        if (!allowed) {
            return res.status(403).json({ message: "Forbidden" });
        }
        return next();
    };
}

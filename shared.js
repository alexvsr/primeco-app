/**
 * Prime&Co Ops - Shared JavaScript
 * Common utilities and components
 */

// API Configuration - Uses CONFIG from config.js if available
const API_URL = (typeof CONFIG !== 'undefined' && CONFIG.API_URL)
    ? CONFIG.API_URL
    : "http://localhost:4000/api";

// Get auth token
function getToken() {
    return localStorage.getItem("access_token");
}

// Get current user
function getCurrentUser() {
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : null;
}

// Check if user is authenticated
function isAuthenticated() {
    return !!getToken();
}

// Logout function
function logout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    localStorage.removeItem("mode");
    localStorage.removeItem("event_id");
    localStorage.removeItem("event_name");
    localStorage.removeItem("buvette_id");
    localStorage.removeItem("buvette_name");
    window.location.href = "index.html";
}

// Toast notifications
function showToast(message, type = 'success', duration = 4000) {
    // Remove existing toast if any
    const existingToast = document.getElementById('shared-toast');
    if (existingToast) {
        existingToast.remove();
    }

    // Create toast element
    const toast = document.createElement('div');
    toast.id = 'shared-toast';
    toast.className = `toast ${type}`;

    // Icon based on type
    const iconPath = type === 'success'
        ? '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>'
        : '<circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>';

    toast.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconPath}</svg>
        <span>${message}</span>
    `;

    document.body.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    // Auto remove
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// Confirm dialog (styled)
function showConfirm(message, onConfirm, onCancel) {
    // Remove existing dialog
    const existing = document.getElementById('shared-confirm');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'shared-confirm';
    overlay.style.cssText = `
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.7);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1001;
        animation: fadeIn 0.2s ease;
    `;

    overlay.innerHTML = `
        <div style="
            background: var(--bg-card-solid, #16162a);
            border: 1px solid var(--border, rgba(148,163,184,0.1));
            border-radius: 16px;
            padding: 28px;
            max-width: 400px;
            width: 90%;
            animation: slideUp 0.3s ease;
        ">
            <p style="
                color: var(--text, #f8fafc);
                font-size: 1rem;
                line-height: 1.6;
                margin-bottom: 24px;
            ">${message}</p>
            <div style="display: flex; gap: 12px;">
                <button id="confirm-cancel" class="btn btn-ghost" style="flex: 1;">Annuler</button>
                <button id="confirm-ok" class="btn btn-primary" style="flex: 1;">Confirmer</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById('confirm-cancel').onclick = () => {
        overlay.remove();
        if (onCancel) onCancel();
    };

    document.getElementById('confirm-ok').onclick = () => {
        overlay.remove();
        if (onConfirm) onConfirm();
    };

    // Close on overlay click
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.remove();
            if (onCancel) onCancel();
        }
    });
}

// Fetch with auth
async function fetchWithAuth(url, options = {}) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, { ...options, headers });

    // Handle 401 - redirect to login
    if (response.status === 401) {
        logout();
        throw new Error('Session expirée');
    }

    return response;
}

// Format date
function formatDate(dateString, options = {}) {
    const defaultOptions = {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        ...options
    };
    return new Date(dateString).toLocaleDateString('fr-CH', defaultOptions);
}

// Format date with time
function formatDateTime(dateString) {
    return new Date(dateString).toLocaleDateString('fr-CH', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Get initials from name
function getInitials(firstName, lastName) {
    return ((firstName?.[0] || '') + (lastName?.[0] || '')).toUpperCase();
}

// Create header bar HTML
function createHeaderBar(title, subtitle = '', showLogout = true) {
    return `
        <header class="header-bar">
            <div class="brand">
                <div class="brand-icon">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                    </svg>
                </div>
                <div>
                    <div class="brand-text">${title}</div>
                    ${subtitle ? `<div class="brand-subtitle">${subtitle}</div>` : ''}
                </div>
            </div>
            ${showLogout ? `
                <button class="btn btn-ghost" onclick="logout()" style="padding: 10px 16px;">
                    <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 18px; height: 18px;">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                        <polyline points="16 17 21 12 16 7"/>
                        <line x1="21" x2="9" y1="12" y2="12"/>
                    </svg>
                    Déconnexion
                </button>
            ` : ''}
        </header>
    `;
}

// Create back button HTML
function createBackLink(href, text = 'Retour') {
    return `
        <a href="${href}" style="
            display: inline-flex;
            align-items: center;
            gap: 6px;
            color: var(--text-muted);
            text-decoration: none;
            font-size: 0.9rem;
            padding: 8px 0;
            transition: color 0.2s;
        ">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px;">
                <path d="m15 18-6-6 6-6"/>
            </svg>
            ${text}
        </a>
    `;
}

// Responsable mode helpers
function getResponsableContext() {
    return {
        mode: localStorage.getItem("mode"),
        eventId: localStorage.getItem("event_id"),
        eventName: localStorage.getItem("event_name"),
        buvetteId: localStorage.getItem("buvette_id"),
        buvetteName: localStorage.getItem("buvette_name")
    };
}

function requireResponsableMode() {
    const ctx = getResponsableContext();
    if (ctx.mode !== "RESPONSABLE" || !ctx.buvetteId || !ctx.eventId) {
        window.location.href = "index.html";
        return false;
    }
    return ctx;
}

function exitResponsableMode() {
    localStorage.removeItem("mode");
    localStorage.removeItem("event_id");
    localStorage.removeItem("event_name");
    localStorage.removeItem("buvette_id");
    localStorage.removeItem("buvette_name");
    window.location.href = "index.html";
}

// Export for modules (if using ES modules in future)
if (typeof window !== 'undefined') {
    window.PrimeCo = {
        API_URL,
        getToken,
        getCurrentUser,
        isAuthenticated,
        logout,
        showToast,
        showConfirm,
        fetchWithAuth,
        formatDate,
        formatDateTime,
        getInitials,
        createHeaderBar,
        createBackLink,
        getResponsableContext,
        requireResponsableMode,
        exitResponsableMode
    };
}

/**
 * Prime&Co Ops - Configuration
 * 
 * Pour le déploiement :
 * 1. Remplacez API_URL par l'URL de votre backend Render.com
 * 2. Exemple : https://primeco-api.onrender.com/api
 */

// === CONFIGURATION À MODIFIER POUR LE DÉPLOIEMENT ===

// URL de l'API backend
// - Développement local : "http://localhost:4000/api"
// - Production Render.com : "https://votre-app.onrender.com/api"
const CONFIG = {
    API_URL: "http://localhost:4000/api",

    // Passez à true une fois déployé sur Render
    IS_PRODUCTION: false
};

// Auto-détection de l'environnement
if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;

    // Si on n'est pas en localhost, on est en production
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
        CONFIG.IS_PRODUCTION = true;
        // Décommentez et modifiez cette ligne avec votre URL Render une fois déployé :
        // CONFIG.API_URL = "https://primeco-api.onrender.com/api";
    }

    window.CONFIG = CONFIG;
}

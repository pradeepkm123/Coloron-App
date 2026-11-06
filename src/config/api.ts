/**
 * Global API Configuration
 * 
 * Cloud Production Backend on Render: https://coloron-app.onrender.com
 * Accessible from Wi-Fi, 5G, 4G, and any network globally.
 */

export const RENDER_BACKEND_URL = 'https://coloron-app.onrender.com';

// Primary Production Backend URL
export const BASE_URL = RENDER_BACKEND_URL;
export const API_URL = `${BASE_URL}/api`;

// Local backend fallback (for local debugging if ever needed)
export const BACKEND_IP = 'coloron-app.onrender.com';
export const BACKEND_PORT = '443';

// Google Web Client ID for OAuth (verify with Google Console)
export const GOOGLE_WEB_CLIENT_ID = '104567894523123-yourgooglewebclientid.apps.googleusercontent.com';

export default {
    BACKEND_IP,
    BACKEND_PORT,
    BASE_URL,
    API_URL,
    GOOGLE_WEB_CLIENT_ID,
};

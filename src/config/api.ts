/**
 * Global API Configuration
 * Replace the BASE_URL with your local machine's LAN IP address.
 * 
 * To find your IP:
 * Windows: ipconfig (look for IPv4 Address)
 * Mac/Linux: ifconfig or ip addr
 */

// Host machine's LAN IP address (accessible by mobile devices on same Wi-Fi and emulators)
export const BACKEND_IP = '192.168.1.12'; // Local backend IP
export const BACKEND_PORT = '5000';
export const BASE_URL = `http://${BACKEND_IP}:${BACKEND_PORT}`;
export const API_URL = `${BASE_URL}/api`;

// Google Web Client ID for OAuth (verify with Google Console)
export const GOOGLE_WEB_CLIENT_ID = '104567894523123-yourgooglewebclientid.apps.googleusercontent.com';

export default {
    BACKEND_IP,
    BACKEND_PORT,
    BASE_URL,
    API_URL,
    GOOGLE_WEB_CLIENT_ID,
};

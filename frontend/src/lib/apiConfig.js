/**
 * Centralized API Configuration
 * 
 * All fetch calls across the application use this single base URL.
 * To change the backend server address for production deployment,
 * edit NEXT_PUBLIC_API_URL in .env.local (no code changes needed).
 */
let API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

if (typeof window !== 'undefined' && window.location.hostname) {
  const protocol = window.location.protocol || 'http:';
  const hostname = window.location.hostname;
  API_BASE = `${protocol}//${hostname}:8000`;
}

export default API_BASE;

/**
 * Address of this web app as the user opened it (e.g. http://192.168.1.14:3000).
 * Used in printed QR codes so they follow whichever PC / LAN IP runs the project.
 */
export function getAppOrigin() {
  if (typeof window !== 'undefined' && window.location.origin) return window.location.origin;
  return 'http://localhost:3000';
}


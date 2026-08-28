/**
 * Centralized API Configuration
 * 
 * All fetch calls across the application use this single base URL.
 * To change the backend server address for production deployment,
 * edit NEXT_PUBLIC_API_URL in .env.local (no code changes needed).
 */
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export default API_BASE;

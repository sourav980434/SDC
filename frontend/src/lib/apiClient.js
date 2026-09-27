import API_BASE from './apiConfig';

/**
 * Sends the signed-in user with every API call.
 *
 * The backend records who did what (tbl_web_audit_logs, created_by / result_entered_by ... columns)
 * from the `X-User-Code` and `X-User-Name` headers. Instead of adding them to every fetch in every
 * page, window.fetch is wrapped once here, so any request to the API carries them automatically.
 * Headers a call sets itself are never overwritten.
 */

const SESSION_KEY = 'sdcp_user_session';
let installed = false;

function currentUser() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function installApiUserHeaders() {
  if (installed || typeof window === 'undefined' || typeof window.fetch !== 'function') return;
  installed = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = (input, init) => {
    try {
      const url = typeof input === 'string' ? input : (input && input.url) || '';
      const isApiCall = url.startsWith(`${API_BASE}/api/`) || url.startsWith('/api/');

      if (isApiCall) {
        const user = currentUser();
        if (user) {
          const headers = new Headers(
            (init && init.headers) || (typeof input !== 'string' && input ? input.headers : undefined) || {}
          );
          if (!headers.has('X-User-Code')) headers.set('X-User-Code', user.user_code || '');
          if (!headers.has('X-User-Name')) headers.set('X-User-Name', user.username || user.full_name || '');
          init = { ...(init || {}), headers };
        }
      }
    } catch (e) {
      // never block the request because of this
    }

    return originalFetch(input, init);
  };
}

export default installApiUserHeaders;

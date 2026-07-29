/**
 * Helper to set a persistent cookie that survives browser restarts and site redeployments.
 * Default expiration: 3650 days (10 years).
 */
export function setCookie(name, value, days = 3650) {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

/**
 * Helper to read a cookie value by name.
 */
export function getCookie(name) {
  if (typeof document === 'undefined') return '';
  return document.cookie.split('; ').reduce((r, v) => {
    const parts = v.split('=');
    return parts[0] === name ? decodeURIComponent(parts.slice(1).join('=')) : r;
  }, '');
}

/**
 * Helper to remove a cookie.
 */
export function removeCookie(name) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
}

/**
 * Saves user identity in persistent cookies and localStorage.
 */
export function saveUserSession(userObj) {
  if (!userObj) return;
  const serialized = JSON.stringify(userObj);
  setCookie('ithink_user', serialized, 3650);
  try {
    localStorage.setItem('ithink_user', serialized);
  } catch (e) {
    console.warn('LocalStorage save warning:', e);
  }
}

/**
 * Restores user identity from persistent cookie or localStorage fallback.
 */
export function getUserSession() {
  const cookieData = getCookie('ithink_user');
  if (cookieData) {
    try {
      return JSON.parse(cookieData);
    } catch (e) {
      console.warn('Cookie parse error:', e);
    }
  }

  try {
    const localData = localStorage.getItem('ithink_user');
    if (localData) {
      const parsed = JSON.parse(localData);
      // Re-sync to cookie
      setCookie('ithink_user', localData, 3650);
      return parsed;
    }
  } catch (e) {
    console.warn('LocalStorage parse error:', e);
  }

  return null;
}

/**
 * Clears stored user session.
 */
export function clearUserSession() {
  removeCookie('ithink_user');
  removeCookie('ithink_admin_user');
  try {
    localStorage.removeItem('ithink_user');
    localStorage.removeItem('ithink_admin_user');
  } catch (e) {}
}

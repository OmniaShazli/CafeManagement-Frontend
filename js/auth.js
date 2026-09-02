const AUTH_STORAGE_KEY = 'terra_auth_session';

 
function saveSession(authResponse) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authResponse));
}

 
function getSession() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getToken() {
  const session = getSession();
  return session && session.token ? session.token : null;
}

function getCurrentUser() {
  const session = getSession();
  return session && session.user ? session.user : null;
}

function isLoggedIn() {
  return getToken() !== null;
}

 
function isAdmin() {
  const user = getCurrentUser();
  return !!user && user.role === 'Admin';
}

 
function logout() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  window.location.href = 'login.html';
}

 
function redirectToLogin() {
  const next = encodeURIComponent(window.location.pathname.split('/').pop() || 'index.html');
  window.location.href = `login.html?next=${next}`;
}

function requireAuth(role) {
  const user = getCurrentUser();

  if (!isLoggedIn() || !user) {
    redirectToLogin();
    return null;
  }

  if (role && user.role !== role) {
    window.location.href = 'index.html';
    return null;
  }

  return user;
}

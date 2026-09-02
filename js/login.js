document.addEventListener('DOMContentLoaded', () => {
    if (isLoggedIn()) {
        window.location.href = isAdmin() ? 'admin.html' : 'index.html';
        return;
    }

    $('#login-form').addEventListener('submit', handleLogin);
});

async function handleLogin(event) {
    event.preventDefault();

    const form = event.target;
    const button = $('#login-submit');

    const email = $('#login-email').value.trim();
    const password = $('#login-password').value;

    if (!email || !password) {
        showToast('Please enter your email and password.', 'info');
        return;
    }

    setLoading(button, true, 'Signing in…');

    try {
        const authResponse = await AuthAPI.login({
            email,
            password
        });

        if (!authResponse || !authResponse.token) {
            throw new ApiError(
                'The server did not return a token. Please try again.',
                0
            );
        }

        const role = getRoleFromToken(authResponse.token);

        const user = {
            email: authResponse.email,
            fullName: authResponse.fullName,
            role: role
        };

        const session = {
            token: authResponse.token,
            expiration: authResponse.expiration,
            user: user
        };

        saveSession(session);

        showToast(
            `Welcome back, ${user.fullName || user.email}!`
        );

        const next =
            new URLSearchParams(window.location.search).get('next');

        const destination =
            user.role === 'Admin'
                ? 'admin.html'
                : (next || 'index.html');

        setTimeout(() => {
            window.location.href = destination;
        }, 700);

    } catch (error) {
        console.error('LOGIN ERROR:', error);

        showToast(error.message, 'error');

        setLoading(button, false, 'Sign in');
    }
}


/**
 * The backend JWT contains:
 * http://schemas.microsoft.com/ws/2008/06/identity/claims/role
 */
function getRoleFromToken(token) {
    try {
        const parts = token.split('.');

        if (parts.length !== 3) {
            return null;
        }

        const payload = parts[1];

        const base64 = payload
            .replace(/-/g, '+')
            .replace(/_/g, '/');

        const padded = base64
            .padEnd(base64.length + (4 - base64.length % 4) % 4, '=');

        const decoded = atob(padded);

        const jsonPayload = decodeURIComponent(
            decoded
                .split('')
                .map(
                    c =>
                        '%' +
                        ('00' + c.charCodeAt(0).toString(16)).slice(-2)
                )
                .join('')
        );

        const payloadObject = JSON.parse(jsonPayload);

        return (
            payloadObject[
            'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'
            ] || null
        );

    } catch (error) {
        console.error('Could not read role from token:', error);
        return null;
    }
}


function setLoading(button, isLoading, label) {
    button.disabled = isLoading;

    button.innerHTML = isLoading
        ? `<span class="btn-spinner"></span> ${label}`
        : `${label} <i data-lucide="arrow-right"></i>`;

    refreshIcons();
}
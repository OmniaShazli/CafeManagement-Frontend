function $(selector, root = document) {
    return root.querySelector(selector);
}

function $$(selector, root = document) {
    return Array.from(root.querySelectorAll(selector));
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function refreshIcons() {
    if (
        window.lucide &&
        typeof window.lucide.createIcons === 'function'
    ) {
        window.lucide.createIcons();
    }
}

function formatMoney(value) {
    const number = Number(value || 0);

    return `EGP ${number.toFixed(2)}`;
}


function formatDate(value) {

    if (!value) {
        return '—';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return escapeHtml(value);
    }

    return date.toLocaleDateString(
        'en-GB',
        {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        }
    );
}


function formatDateTime(value) {

    if (!value) {
        return '—';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return '—';
    }

    return (
        date.toLocaleDateString(
            'en-GB',
            {
                day: 'numeric',
                month: 'short'
            }
        )
        +
        ' · ' +
        date.toLocaleTimeString(
            'en-GB',
            {
                hour: '2-digit',
                minute: '2-digit'
            }
        )
    );
}


function formatTime(value) {

    if (!value) {
        return '—';
    }

    return String(value).slice(0, 5);
}


function statusChip(status) {

    const key =
        String(status || '').toLowerCase();

    return `
        <span class="chip chip--${escapeHtml(key)}">
            ${escapeHtml(status ?? '—')}
        </span>
    `;
}

function resolveImageUrl(url) {

    if (!url) {
        return null;
    }

    if (/^https?:\/\//i.test(url)) {
        return url;
    }

    if (
        typeof API_ORIGIN !== 'undefined' &&
        API_ORIGIN
    ) {
        return `${API_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`;
    }

    return url;
}

function ensureToastRoot() {

    let root = $('#toast-root');

    if (!root) {

        root = document.createElement('div');

        root.id = 'toast-root';

        root.className = 'toast-root';

        document.body.appendChild(root);
    }

    return root;
}


function showToast(
    message,
    type = 'success',
    timeout = 4200
) {

    const root = ensureToastRoot();

    const icons = {
        success: 'check',
        error: 'alert-circle',
        info: 'info'
    };

    const toast =
        document.createElement('div');

    toast.className =
        `toast toast--${type}`;

    toast.innerHTML = `
        <span class="toast-icon">

            <i
                data-lucide="${icons[type] || 'info'}">
            </i>

        </span>

        <p>
            ${escapeHtml(message)}
        </p>

        <button
            type="button"
            class="toast-close"
            aria-label="Dismiss">

            <i data-lucide="x"></i>

        </button>
    `;

    const dismiss = () => {

        if (!toast.isConnected) {
            return;
        }

        toast.classList.add(
            'toast--leaving'
        );

        setTimeout(
            () => toast.remove(),
            260
        );
    };

    const closeButton =
        toast.querySelector(
            '.toast-close'
        );

    if (closeButton) {

        closeButton.addEventListener(
            'click',
            dismiss
        );

    }

    root.appendChild(toast);

    refreshIcons();

    setTimeout(
        dismiss,
        timeout
    );
}
function confirmDialog({
    title = 'Are you sure?',
    message = '',
    confirmText = 'Delete',
    danger = true
} = {}) {

    return new Promise((resolve) => {

        const overlay =
            document.createElement('div');

        overlay.className = 'overlay';

        overlay.innerHTML = `
            <div
                class="dialog"
                role="dialog"
                aria-modal="true">

                <div
                    class="dialog-mark ${danger
                ? 'dialog-mark--danger'
                : ''
            }">

                    <i
                        data-lucide="${danger
                ? 'trash-2'
                : 'info'
            }">
                    </i>

                </div>

                <h3 class="dialog-title">

                    ${escapeHtml(title)}

                </h3>

                ${message
                ? `
                            <p class="dialog-text">
                                ${escapeHtml(message)}
                            </p>
                        `
                : ''
            }

                <div class="dialog-actions">

                    <button
                        type="button"
                        class="btn btn--ghost"
                        data-action="cancel">

                        Cancel

                    </button>

                    <button
                        type="button"
                        class="btn ${danger
                ? 'btn--danger'
                : 'btn--primary'
            }"
                        data-action="confirm">

                        ${escapeHtml(confirmText)}

                    </button>

                </div>

            </div>
        `;

        let finished = false;

        const close = (result) => {

            if (finished) {
                return;
            }

            finished = true;

            overlay.classList.remove(
                'is-open'
            );

            setTimeout(
                () => overlay.remove(),
                220
            );

            resolve(result);
        };


        overlay.addEventListener(
            'click',
            (event) => {

                if (
                    event.target === overlay
                ) {

                    close(false);

                }

            }
        );


        const cancel =
            overlay.querySelector(
                '[data-action="cancel"]'
            );

        const confirm =
            overlay.querySelector(
                '[data-action="confirm"]'
            );


        if (cancel) {

            cancel.addEventListener(
                'click',
                () => close(false)
            );

        }


        if (confirm) {

            confirm.addEventListener(
                'click',
                () => close(true)
            );

        }


        document.body.appendChild(
            overlay
        );


        requestAnimationFrame(() => {

            overlay.classList.add(
                'is-open'
            );

        });


        refreshIcons();

    });
}

function userInitials(name) {

    const text =
        String(name || '?').trim();

    if (!text) {
        return '?';
    }

    return text
        .split(/\s+/)
        .slice(0, 2)
        .map(
            part => part.charAt(0)
        )
        .join('')
        .toUpperCase();
}

function getSafeCurrentUser() {

    try {

        if (
            typeof getCurrentUser === 'function'
        ) {

            return getCurrentUser() || null;

        }

    } catch (error) {

        console.warn(
            'getCurrentUser failed:',
            error
        );

    }

    return null;
}


function renderNavbar() {

    const mount =
        document.getElementById(
            'site-nav'
        );

    if (!mount) {

        console.error(
            'Navbar mount #site-nav was not found.'
        );

        return;
    }


    const user =
        getSafeCurrentUser();


    const page =
        document.body.dataset.page || '';
        
    const links = [

        {
            href: 'index.html',
            label: 'Home',
            key: 'home'
        },

        {
            href: 'menu.html',
            label: 'Menu',
            key: 'menu'
        },

        {
            href: 'reserve.html',
            label: 'Reservations',
            key: 'reserve'
        }

    ];
    
    if (
        user &&
        String(user.role || '').toLowerCase() !== 'admin'
    ) {

        links.push({

            href: 'orders.html',

            label: 'My Orders',

            key: 'orders'

        });

    }

    
    links.push({

        href: 'about.html',

        label: 'About Us',

        key: 'about'

    });


    links.push({

        href: 'services.html',

        label: 'Services',

        key: 'services'

    });


    links.push({

        href: 'contact.html',

        label: 'Contact',

        key: 'contact'

    });
    

    if (
        user &&
        String(user.role || '').toLowerCase() === 'admin'
    ) {

        links.push({

            href: 'admin.html',

            label: 'Admin',

            key: 'admin'

        });

    }
    
    const linksHtml =
        links
            .map(link => {

                const active =
                    page === link.key
                        ? 'is-active'
                        : '';

                return `
                    <a
                        href="${link.href}"
                        class="nav-link ${active}">

                        ${escapeHtml(
                    link.label
                )}

                    </a>
                `;

            })
            .join('');
            

    let accountHtml = '';


    if (user) {

        const displayName =
            user.fullName ||
            user.email ||
            'User';


        accountHtml = `

            <div class="nav-user">

                <span class="nav-avatar">

                    ${escapeHtml(
            userInitials(
                displayName
            )
        )}

                </span>

                <span class="nav-username">

                    ${escapeHtml(
            String(displayName)
                .split(' ')[0]
        )}

                </span>

            </div>


            <button
                type="button"
                class="icon-btn"
                id="nav-logout"
                title="Sign out"
                aria-label="Sign out">

                <i data-lucide="log-out"></i>

            </button>

        `;

    } else {

        accountHtml = `

            <a
                href="login.html"
                class="nav-link">

                Sign in

            </a>


            <a
                href="register.html"
                class="btn btn--primary btn--sm">

                Join us

            </a>

        `;

    }

    mount.innerHTML = `

        <div class="container nav-inner">


             

            <a
                href="index.html"
                class="brand">

                <span class="brand-mark">

                    <i data-lucide="coffee"></i>

                </span>

                <span class="brand-name">

                    KAYAN

                    <em>
                        coffee house
                    </em>

                </span>

            </a>


             

            <nav
                class="nav-links"
                id="nav-links">

                ${linksHtml}

            </nav>


             

            <div class="nav-actions">

                ${accountHtml}

            </div>


             

            <button
                type="button"
                class="icon-btn nav-burger"
                id="nav-burger"
                aria-label="Menu"
                aria-expanded="false">

                <i data-lucide="menu"></i>

            </button>


        </div>

    `;
    
    const logoutBtn =
        document.getElementById(
            'nav-logout'
        );


    if (logoutBtn) {

        logoutBtn.addEventListener(
            'click',
            () => {

                try {

                    if (
                        typeof logout === 'function'
                    ) {

                        logout();

                    } else {

                        console.error(
                            'logout() is not available.'
                        );

                    }

                } catch (error) {

                    console.error(
                        'Logout failed:',
                        error
                    );

                }

            }
        );

    }
    
    const burger =
        document.getElementById(
            'nav-burger'
        );


    const navLinks =
        document.getElementById(
            'nav-links'
        );


    if (
        burger &&
        navLinks
    ) {

        burger.addEventListener(
            'click',
            () => {

                const isOpen =
                    navLinks.classList.toggle(
                        'is-open'
                    );


                burger.setAttribute(
                    'aria-expanded',
                    isOpen
                        ? 'true'
                        : 'false'
                );

            }
        );


        $$('.nav-link', navLinks)
            .forEach(link => {

                link.addEventListener(
                    'click',
                    () => {

                        navLinks.classList.remove(
                            'is-open'
                        );

                        burger.setAttribute(
                            'aria-expanded',
                            'false'
                        );

                    }
                );

            });

    }
    
    refreshIcons();


    console.log(
        'KAYAN navbar rendered successfully.'
    );

}
function initReveal() {

    const targets =
        $$('.reveal');


    if (
        !('IntersectionObserver' in window) ||
        targets.length === 0
    ) {

        targets.forEach(el => {

            el.classList.add(
                'is-visible'
            );

        });

        return;
    }


    const observer =
        new IntersectionObserver(
            entries => {

                entries.forEach(entry => {

                    if (
                        entry.isIntersecting
                    ) {

                        entry.target.classList.add(
                            'is-visible'
                        );

                        observer.unobserve(
                            entry.target
                        );

                    }

                });

            },
            {
                threshold: 0.12
            }
        );


    targets.forEach(
        el => observer.observe(el)
    );

}
function emptyState(
    icon,
    title,
    text
) {

    return `

        <div class="empty-state">

            <span class="empty-icon">

                <i
                    data-lucide="${escapeHtml(icon)}">
                </i>

            </span>


            <h3>

                ${escapeHtml(title)}

            </h3>


            ${text
            ? `
                        <p>
                            ${escapeHtml(text)}
                        </p>
                    `
            : ''
        }

        </div>

    `;
}


function skeletonCards(count = 6) {

    return Array.from(
        { length: count },
        () =>
            '<div class="skeleton-card"></div>'
    ).join('');

}

function initializeSharedUI() {

    console.log(
        'KAYAN UI initialization started...'
    );


    try {

        renderNavbar();

    } catch (error) {

        console.error(
            'Navbar rendering failed:',
            error
        );

    }


    try {

        initReveal();

    } catch (error) {

        console.error(
            'Reveal initialization failed:',
            error
        );

    }


    try {

        refreshIcons();

    } catch (error) {

        console.error(
            'Icon initialization failed:',
            error
        );

    }

}

if (
    document.readyState === 'loading'
) {

    document.addEventListener(
        'DOMContentLoaded',
        initializeSharedUI,
        {
            once: true
        }
    );

} else {

    initializeSharedUI();

}
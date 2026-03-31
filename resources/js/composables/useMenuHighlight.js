const isBrowser = () => typeof window !== 'undefined';

const getNavElement = () => (isBrowser() ? document.getElementById('navbar-nav') : null);

const toPath = (href) => {
    if (!href) return null;
    try {
        if (href.startsWith('http://') || href.startsWith('https://')) {
            return new URL(href).pathname;
        }
        return href;
    } catch {
        return href;
    }
};

const clearActive = () => {
    if (!isBrowser()) return;
    document
        .querySelectorAll('#navbar-nav .nav-item.active, #navbar-nav .nav-link.active')
        .forEach((el) => el.classList.remove('active'));
    document
        .querySelectorAll('#navbar-nav .collapse.menu-dropdown.show')
        .forEach((el) => el.classList.remove('show'));
};

const activateParents = (link) => {
    if (!link) return;
    let parentCollapse = link.closest('.collapse.menu-dropdown');
    while (parentCollapse) {
        parentCollapse.classList.add('show');
        const parentTrigger = parentCollapse.previousElementSibling;
        if (parentTrigger) {
            parentTrigger.classList.add('active');
            parentTrigger.setAttribute('aria-expanded', 'true');
        }
        parentCollapse = parentCollapse.parentElement?.closest('.collapse.menu-dropdown') ?? null;
    }
};

const highlightLink = (path) => {
    if (!isBrowser()) return;
    const nav = getNavElement();
    if (!nav) return;

    const normalized = (path || '/').replace(/\/$/, '') || '/';
    const links = nav.querySelectorAll('a.nav-link');
    let matchedLink = null;

    links.forEach((link) => {
        const href = toPath(link.getAttribute('href') || link.getAttribute('data-href'));
        if (!href) {
            return;
        }
        const normalizedHref = href.replace(/\/$/, '') || '/';
        if (
            normalized === normalizedHref ||
            (normalizedHref !== '/' && normalized.startsWith(`${normalizedHref}/`))
        ) {
            matchedLink = link;
        }
    });

    if (matchedLink) {
        matchedLink.classList.add('active');
        matchedLink.closest('.nav-item')?.classList.add('active');
        activateParents(matchedLink);
    }
};

const scrollIntoViewIfNeeded = () => {
    if (!isBrowser()) return;
    const nav = getNavElement();
    if (!nav) return;

    const activeLink = nav.querySelector('a.nav-link.active');
    if (!activeLink) return;

    const position = activeLink.offsetTop;
    const viewportHeight = document.documentElement.clientHeight;
    if (position > viewportHeight) {
        const wrapper = document.querySelector('#scrollbar .simplebar-content-wrapper');
        if (wrapper) {
            wrapper.scrollTop = position - viewportHeight / 2;
        }
    }
};

export function useMenuHighlight() {
    const updateActiveMenu = () => {
        if (!isBrowser()) return;
        const currentPath = window.location.pathname;
        clearActive();
        highlightLink(currentPath);
        scrollIntoViewIfNeeded();
    };

    return {
        updateActiveMenu,
    };
}


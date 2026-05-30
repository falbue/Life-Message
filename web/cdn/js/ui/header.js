export function initNavigation() {
    const path = window.location.pathname;

    function processNav() {
        const nav = document.querySelector('nav');
        if (!nav) return false;

        let found = false;
        nav.querySelectorAll('a').forEach(a => {
            const href = a.getAttribute('href');
            if (href === path || (path === '/' && href === '/')) {
                a.classList.add('active');
                a.classList.add('hidden-text');
                a.removeAttribute('href');
                a.style.pointerEvents = 'none';
                found = true;
            }
        });

        return found;
    }

    if (processNav()) return;

    const observer = new MutationObserver(() => {
        if (processNav()) {
            observer.disconnect();
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
}
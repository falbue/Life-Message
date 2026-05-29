export function initNavigation() {
    const path = window.location.pathname;

    function processNav() {
        const nav = document.querySelector('nav');
        if (!nav) return false;

        let found = false;
        nav.querySelectorAll('a').forEach(a => {
            const href = a.getAttribute('href');
            if (href === path || (path === '/' && href === '/')) {
                a.textContent = '';
                a.removeAttribute('href');
                a.style.pointerEvents = 'none';
                a.classList.add('active');
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
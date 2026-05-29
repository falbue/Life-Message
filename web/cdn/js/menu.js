(() => {
    const templateCache = new Map();
    let overlay = null;
    let activeMenuName = null;

    function ensureOverlay() {
        if (overlay) {
            return overlay;
        }

        overlay = document.createElement("div");
        overlay.className = "overlay";
        overlay.setAttribute("aria-hidden", "true");

        overlay.addEventListener("click", (event) => {
            if (event.target === overlay) {
                closeMenu();
            }
        });

        overlay.addEventListener("submit", (event) => {
            if (overlay.contains(event.target)) {
                setTimeout(() => {
                    closeMenu();
                }, 100);
            }
        }, true);

        document.body.appendChild(overlay);
        return overlay;
    }

    function closeMenu() {
        if (!overlay) {
            return;
        }

        overlay.classList.remove("is-open");
        overlay.setAttribute("aria-hidden", "true");
        document.body.classList.remove("menu-opened");
        activeMenuName = null;
        overlay.replaceChildren();
    }

    async function loadMenuTemplate(menuName) {
        if (templateCache.has(menuName)) {
            return templateCache.get(menuName);
        }

        const fileName = menuName.endsWith(".html") ? menuName : `${menuName}.html`;
        const response = await fetch(`/static/menus/${fileName}`);
        if (!response.ok) {
            throw new Error(`Не удалось загрузить меню: ${menuName}`);
        }

        const html = await response.text();
        templateCache.set(menuName, html);
        return html;
    }

    async function openMenu(menuName) {
        if (!menuName) {
            return;
        }

        const currentOverlay = ensureOverlay();

        if (activeMenuName === menuName && currentOverlay.classList.contains("is-open")) {
            return;
        }

        try {
            const html = await loadMenuTemplate(menuName);
            const template = document.createElement("template");
            template.innerHTML = html;
            const scripts = Array.from(template.content.querySelectorAll("script"));

            for (const script of scripts) {
                script.remove();
            }

            currentOverlay.replaceChildren();
            currentOverlay.appendChild(template.content.cloneNode(true));

            // Scripts inserted through HTML strings are inert, so re-create them to execute.
            for (const sourceScript of scripts) {
                const runnableScript = document.createElement("script");

                for (const { name, value } of sourceScript.attributes) {
                    runnableScript.setAttribute(name, value);
                }

                if (sourceScript.textContent) {
                    runnableScript.textContent = sourceScript.textContent;
                }

                currentOverlay.appendChild(runnableScript);
            }

            currentOverlay.classList.add("is-open");
            currentOverlay.setAttribute("aria-hidden", "false");
            document.body.classList.add("menu-opened");
            activeMenuName = menuName;
        } catch (error) {
            console.error(error);
        }
    }

    document.addEventListener("click", (event) => {
        const target = event.target;

        const closeTrigger = target.closest("[close='true'], [close='true']");
        if (closeTrigger) {
            closeMenu();
            return;
        }

        const openTrigger = target.closest("[menu]");
        if (openTrigger) {
            event.preventDefault();
            const menuName = openTrigger.getAttribute("menu");
            openMenu(menuName);
        }
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeMenu();
        }
    });
})();

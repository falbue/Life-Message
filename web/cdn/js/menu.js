(() => {
    const templateCache = new Map();
    let activeDialog = null;

    function closeMenu() {
        if (!activeDialog) return;

        activeDialog.close();
        activeDialog = null;
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
        if (!menuName) return;

        if (activeDialog && activeDialog.dataset.menuName === menuName) {
            return;
        }

        if (activeDialog) {
            closeMenu();
        }

        try {
            const html = await loadMenuTemplate(menuName);

            const dialog = document.createElement("dialog");
            dialog.dataset.menuName = menuName;

            const template = document.createElement("template");
            template.innerHTML = html;
            const scripts = Array.from(template.content.querySelectorAll("script"));

            dialog.appendChild(template.content.cloneNode(true));

            for (const sourceScript of scripts) {
                const runnableScript = document.createElement("script");
                for (const { name, value } of sourceScript.attributes) {
                    runnableScript.setAttribute(name, value);
                }
                if (sourceScript.textContent) {
                    runnableScript.textContent = sourceScript.textContent;
                }
                dialog.appendChild(runnableScript);
            }

            document.body.appendChild(dialog);

            dialog.addEventListener("close", () => {
                dialog.remove();
                if (activeDialog === dialog) {
                    activeDialog = null;
                }
            });

            dialog.addEventListener("click", (event) => {
                if (event.target === dialog) {
                    closeMenu();
                }
            });

            dialog.showModal();
            activeDialog = dialog;

        } catch (error) {
            console.error(error);
        }
    }

    document.addEventListener("click", (event) => {
        const target = event.target;

        const closeTrigger = target.closest("[close='true']");
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
})();
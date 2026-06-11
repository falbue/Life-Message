const templateCache = new Map();
async function loadSingleTemplate(element) {
    if (element.dataset.templateLoaded === 'true' || element.dataset.templateLoaded === 'loading') {
        return;
    }
    const templateName = element.dataset.template;
    const url = `templates/${templateName}.html`;
    element.dataset.templateLoaded = 'loading';

    try {
        let html = templateCache.get(templateName);
        if (!html) {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            html = await response.text();
            templateCache.set(templateName, html);
        }

        element.insertAdjacentHTML('beforebegin', html);
        element.remove();

    } catch (error) {
        console.error(`Ошибка загрузки шаблона "${templateName}":`, error);
        element.dataset.templateLoaded = 'error';
    }
}

export async function loadTemplates(container = document) {
    const elements = container.querySelectorAll('[data-template]');
    if (container.nodeType === Node.ELEMENT_NODE && container.hasAttribute('data-template')) {
        await loadSingleTemplate(container);
    }

    const promises = Array.from(elements).map(el => loadSingleTemplate(el));
    await Promise.all(promises);
}

export function initTemplateLoader() {
    loadTemplates(document);
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    if (node.hasAttribute('data-template') || node.querySelector('[data-template]')) {
                        loadTemplates(node);
                    }
                }
            }
        }
    });
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    return observer;
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTemplateLoader);
} else {
    initTemplateLoader();
}
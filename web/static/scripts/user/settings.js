class LocalStorageFieldManager {
    constructor() {
        this.isUpdating = false;
        this.pendingUpdate = false;
        this.init();
    }

    init() {
        this.updateFieldsFromLocalStorage();
        this.setupMutationObserver();

        window.addEventListener('storage', (event) => {
            if (event.key && document.querySelector(`[data-field="${event.key}"]`)) {
                this.updateSpecificField(event.key);
            }
        });
        this.interceptLocalStorage();
        this.setupInputListeners();
    }

    updateSpecificField(fieldName) {
        const element = document.querySelector(`[data-field="${fieldName}"]`);
        if (!element) return;

        const value = localStorage.getItem(fieldName);
        this.setElementValue(element, value || '');
    }

    updateFieldsFromLocalStorage() {
        const elements = document.querySelectorAll('[data-field]');

        elements.forEach(element => {
            const fieldName = element.getAttribute('data-field');
            if (!fieldName) return;

            const value = localStorage.getItem(fieldName);
            this.setElementValue(element, value || '');
        });
    }

    setElementValue(element, value) {
        const isReadonly = element.hasAttribute('data-readonly');

        switch (element.tagName) {
            case 'INPUT':
            case 'TEXTAREA':
            case 'SELECT':
                if (isReadonly && element.value) return;
                element.value = value;
                break;
            default:
                if (isReadonly && element.textContent) return;
                element.textContent = value;
        }
    }

    setupMutationObserver() {
        const observer = new MutationObserver((mutations) => {
            let newElementsWithField = false;

            for (const mutation of mutations) {
                // Проверяем добавленные узлы
                if (mutation.addedNodes.length > 0) {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            // Проверяем сам элемент и его descendants
                            if (node.hasAttribute?.('data-field') ||
                                node.querySelector?.('[data-field]')) {
                                newElementsWithField = true;
                                break;
                            }
                        }
                    }
                }

                if (newElementsWithField) break;
            }

            if (newElementsWithField && !this.pendingUpdate) {
                this.pendingUpdate = true;
                requestAnimationFrame(() => {
                    this.updateFieldsFromLocalStorage();
                    this.pendingUpdate = false;
                });
            }
        });

        if (document.body) {
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        }
    }

    interceptLocalStorage() {
        const methods = ['setItem', 'removeItem', 'clear'];
        const originalMethods = {};

        methods.forEach(method => {
            originalMethods[method] = localStorage[method];

            localStorage[method] = (...args) => {
                const result = originalMethods[method].apply(localStorage, args);
                let key = null;
                if (method === 'setItem') key = args[0];
                else if (method === 'removeItem') key = args[0];

                if (key) {
                    this.updateSpecificField(key);
                } else {
                    this.updateFieldsFromLocalStorage();
                }
                return result;
            };
        });
    }

    setupInputListeners() {
        // Используем делегирование событий
        document.addEventListener('input', (event) => {
            this.handleFieldChange(event.target);
        });

        document.addEventListener('change', (event) => {
            this.handleFieldChange(event.target);
        });
    }

    handleFieldChange(element) {
        const fieldName = element.getAttribute('data-field');
        if (!fieldName || element.hasAttribute('data-readonly')) return;

        let value;
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName)) {
            value = element.value;
        } else {
            value = element.textContent;
        }

        localStorage.setItem(fieldName, value);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.fieldManager = new LocalStorageFieldManager();
    });
} else {
    window.fieldManager = new LocalStorageFieldManager();
}

window.updateAllFields = () => {
    if (window.fieldManager) {
        window.fieldManager.updateFieldsFromLocalStorage();
    }
};
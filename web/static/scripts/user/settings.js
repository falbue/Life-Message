function updateFieldsFromLocalStorage() {
    const elements = document.querySelectorAll('[data-field]');

    elements.forEach(element => {
        const fieldName = element.getAttribute('data-field');

        if (fieldName) {
            const value = localStorage.getItem(fieldName);
            if (value !== null && value !== undefined) {
                let currentValue;
                if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.tagName === 'SELECT') {
                    currentValue = element.value;
                } else {
                    currentValue = element.textContent;
                }

                if (currentValue !== value) {
                    if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                        element.value = value;
                    } else if (element.tagName === 'SELECT') {
                        element.value = value;
                    } else {
                        element.textContent = value;
                    }
                }
            }
        }
    });
}

let isUpdating = false;

const observer = new MutationObserver((mutations) => {
    if (isUpdating) return;

    let shouldUpdate = false;

    mutations.forEach((mutation) => {
        if (mutation.addedNodes.length > 0) {
            shouldUpdate = true;
        }
        if (mutation.type === 'attributes' &&
            mutation.attributeName === 'data-field') {
            shouldUpdate = true;
        }
    });

    if (shouldUpdate) {
        isUpdating = true;
        requestAnimationFrame(() => {
            updateFieldsFromLocalStorage();
            isUpdating = false;
        });
    }
});

function initFieldUpdater() {
    updateFieldsFromLocalStorage();

    if (document.body) {
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['data-field']
        });
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFieldUpdater);
} else {
    initFieldUpdater();
}
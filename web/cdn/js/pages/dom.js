export const dom = {
    create(tag, attrs = {}, content = '') {
        const el = document.createElement(tag);
        Object.entries(attrs).forEach(([key, value]) => {
            el.setAttribute(key, value);
        });
        if (content) el.innerHTML = content;
        return el;
    },

    remove(selector) {
        document.querySelectorAll(selector).forEach(el => el.remove());
    },

    exists(selector) {
        return document.querySelector(selector) !== null;
    }
};
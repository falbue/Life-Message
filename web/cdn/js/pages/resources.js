import { dom } from './dom.js';

export class ResourceManager {
    constructor() {
        this.loadedResources = new Set();
    }

    loadStyles(styles) {
        const currentStyleIds = new Set();

        styles.forEach(styleEl => {
            const id = this.getResourceId(styleEl);
            currentStyleIds.add(id);
            if (styleEl.tagName === 'LINK') {
                const href = styleEl.getAttribute('href');
                if (dom.exists(`link[href="${href}"][data-spa-resource="style"]`)) {
                    return;
                }
            } else if (styleEl.tagName === 'STYLE') {
                if (dom.exists(`style[data-resource-id="${id}"][data-spa-resource="style"]`)) {
                    return;
                }
            }

            if (styleEl.tagName === 'LINK') {
                const href = styleEl.getAttribute('href');
                const link = dom.create('link', {
                    rel: 'stylesheet',
                    href: href,
                    'data-spa-resource': 'style',
                    'data-resource-id': id
                });
                document.head.appendChild(link);
            } else if (styleEl.tagName === 'STYLE') {
                const style = dom.create('style', {
                    'data-spa-resource': 'style',
                    'data-resource-id': id
                }, styleEl.textContent);
                document.head.appendChild(style);
            }

            this.loadedResources.add(id);
        });

        document.querySelectorAll('[data-spa-resource="style"]').forEach(el => {
            const resourceId = el.getAttribute('data-resource-id');
            if (!currentStyleIds.has(resourceId)) {
                el.remove();
            }
        });
    }

    loadScripts(scripts, target = 'head') {
        scripts.forEach(oldScript => {
            const id = this.getResourceId(oldScript);

            if (this.loadedResources.has(id)) return;

            const newScript = dom.create('script');
            Array.from(oldScript.attributes).forEach(attr => {
                newScript.setAttribute(attr.name, attr.value);
            });
            newScript.textContent = oldScript.textContent;
            newScript.setAttribute('data-spa-resource', 'script');
            newScript.setAttribute('data-resource-id', id);

            if (newScript.src) newScript.async = false;

            (target === 'head' ? document.head : document.body).appendChild(newScript);
            this.loadedResources.add(id);
        });
    }
    getResourceId(element) {
        if (element.src) return `script:${element.src}`;
        if (element.href) return `link:${element.href}`;
        if (element.textContent) {
            return `inline:${this.simpleHash(element.textContent)}`;
        }
        return `unknown:${Math.random()}`;
    }

    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(36);
    }
}
export class SEOManager {
    constructor() {
        this.defaults = this.captureDefaults();
    }

    captureDefaults() {
        return {
            title: document.title,
            description: document.querySelector('meta[name="description"]')?.content || '',
            keywords: document.querySelector('meta[name="keywords"]')?.content || '',
            author: document.querySelector('meta[name="author"]')?.content || '',
            robots: document.querySelector('meta[name="robots"]')?.content || ''
        };
    }

    update(seo) {
        if (seo.title) document.title = seo.title;
        else document.title = this.defaults.title;

        this.updateMeta('description', seo.description || this.defaults.description);
        this.updateMeta('keywords', seo.keywords || this.defaults.keywords);
        this.updateMeta('author', seo.author || this.defaults.author);
        this.updateMeta('robots', seo.robots || this.defaults.robots);

        // Open Graph
        if (seo.ogTitle) this.updateMeta('og:title', seo.ogTitle, 'property');
        if (seo.ogDescription) this.updateMeta('og:description', seo.ogDescription, 'property');
        if (seo.ogImage) this.updateMeta('og:image', seo.ogImage, 'property');
    }

    updateMeta(name, content, attr = 'name') {
        if (!content) return;

        let meta = document.querySelector(`meta[${attr}="${name}"]`);
        if (!meta) {
            meta = document.createElement('meta');
            meta.setAttribute(attr, name);
            document.head.appendChild(meta);
        }
        meta.content = content;
    }
}
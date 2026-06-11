import page from 'https://cdn.jsdelivr.net/npm/page@1.11.6/+esm';
import { SEOManager } from './seo.js';
import { ResourceManager } from './resources.js';

class SPARouter {
    constructor() {
        this.pagesDir = './pages';
        this.routesConfig = null;
        this.cache = new Map();
        this.seoManager = new SEOManager();
        this.resourceManager = new ResourceManager();
    }

    async init() {
        await this.loadRoutesConfig();

        page('*', async (ctx) => await this.loadPage(ctx.path));
        page.start();
    }

    async loadRoutesConfig() {
        try {
            const res = await fetch('./routes.json');
            this.routesConfig = res.ok ? await res.json() : { routes: [] };
        } catch {
            this.routesConfig = { routes: [] };
        }
    }

    getRouteConfig(path) {
        return this.routesConfig?.routes?.find(r => r.path === path);
    }

    getPageNameFromPath(path) {
        return path === '/' ? 'home' : path.replace(/^\//, '').split('/')[0];
    }

    async loadPage(path) {
        try {
            const routeConfig = this.getRouteConfig(path);
            const pageName = routeConfig?.page || this.getPageNameFromPath(path);
            const pageData = await this.getPageData(pageName, routeConfig);

            this.seoManager.update(pageData.seo);
            document.body.innerHTML = pageData.bodyContent;

            this.resourceManager.loadStyles(pageData.styles);
            this.resourceManager.loadScripts(pageData.headScripts, 'head');
            this.resourceManager.loadScripts(pageData.bodyScripts, 'body');

        } catch (error) {
            console.error('Error loading page:', error);
            this.show404(path);
        }
    }

    async getPageData(pageName, routeConfig) {
        if (this.cache.has(pageName)) return this.cache.get(pageName);

        const res = await fetch(`${this.pagesDir}/${pageName}.html`);
        if (!res.ok) throw new Error(`Page not found: ${pageName}`);

        const html = await res.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');

        const pageData = {
            bodyContent: doc.body.innerHTML,
            styles: Array.from(doc.head.querySelectorAll('link[rel="stylesheet"], style')),
            headScripts: Array.from(doc.head.querySelectorAll('script')),
            bodyScripts: Array.from(doc.body.querySelectorAll('script')),
            seo: routeConfig?.seo || this.extractSEO(doc.head)
        };

        this.cache.set(pageName, pageData);
        return pageData;
    }

    extractSEO(head) {
        const seo = {
            title: head.querySelector('title')?.textContent || '',
            description: head.querySelector('meta[name="description"]')?.content || '',
            keywords: head.querySelector('meta[name="keywords"]')?.content || '',
            author: head.querySelector('meta[name="author"]')?.content || '',
            robots: head.querySelector('meta[name="robots"]')?.content || ''
        };

        const ogTitle = head.querySelector('meta[property="og:title"]');
        const ogDesc = head.querySelector('meta[property="og:description"]');
        const ogImg = head.querySelector('meta[property="og:image"]');

        if (ogTitle) seo.ogTitle = ogTitle.content;
        if (ogDesc) seo.ogDescription = ogDesc.content;
        if (ogImg) seo.ogImage = ogImg.content;

        return seo;
    }

    show404(path) {
        document.title = '404 - Page Not Found';
        document.body.innerHTML = `
      <div style="text-align: center; padding: 50px;">
        <h1>❌ 404 - Page Not Found</h1>
        <p>Страница <strong>${path}</strong> не существует.</p>
        <a href="/" onclick="page('/'); return false;">На главную</a>
      </div>
    `;
    }
}

const router = new SPARouter();
router.init();
window.page = page;
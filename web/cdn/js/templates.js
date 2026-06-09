async function loadTemplates() {
    const elements = document.querySelectorAll('[data-template]');

    const promises = Array.from(elements).map(async (element) => {
        const templateName = element.dataset.template;
        const url = `templates/${templateName}.html`;

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const html = await response.text();

            element.insertAdjacentHTML('beforebegin', html);
            element.remove();

        } catch (error) {
            console.error(`Ошибка загрузки "${templateName}":`, error);
        }
    });

    await Promise.all(promises);
}

document.addEventListener('DOMContentLoaded', loadTemplates);

export { loadTemplates };
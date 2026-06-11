import { getAllContacts, toggleFavoriteStatus, saveContact } from './db.js';

let isUpdating = false;
let contactsCache = [];
let isDataLoaded = false;
let domObserver = null;
let renderTimeout = null;

function createCardHTML(contact) {
    const isFavClass = contact.isFavorite ? 'iconoir-star-solid' : 'iconoir-star';

    const headerHtml = `
        <header>
            <nav>
                <h3>${escapeHtml(contact.name)}</h3>
                <nav>
                    <button class="btn-edit" aria-label="Редактировать">
                        <i class="iconoir-edit-pencil"></i>
                    </button>
                    <button class="btn-fav" aria-label="В избранное" data-id="${contact.id}">
                        <i class="${isFavClass}"></i>
                    </button>
                </nav>
            </nav>
        </header>
    `;

    let bodyHtml = '';
    if (contact.type === 'group') {
        const membersList = (contact.members || [])
            .map(m => `<li><h4>${escapeHtml(m)}</h4></li>`)
            .join('');
        bodyHtml = `
            <header>
                <nav>
                    <div class="popover">
                        <h4 class="iconoir-user"><b>${contact.members ? contact.members.length : 0}</b></h4>
                        <ul role="menu">${membersList}</ul>
                    </div>
                    <code>${escapeHtml(contact.id.slice(0, 8))}...</code>
                </nav>
            </header>
        `;
    } else {
        bodyHtml = `
            <nav>
                <h4><b>${escapeHtml(contact.username || 'Unknown')}</b></h4>
                <code>${escapeHtml(contact.id.slice(0, 8))}...</code>
            </nav>
        `;
    }

    return `
        <a href="/chat#${contact.id}" class="contact-card" data-type="${contact.type}" data-id="${contact.id}">
            <article>
                ${headerHtml}
                ${bodyHtml}
            </article>
        </a>
    `;
}

function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

async function renderSection(selector, contacts) {
    const container = document.querySelector(selector);
    if (!container) return;
    container.innerHTML = contacts.map(createCardHTML).join('');
}

function setupGlobalEvents() {
    document.addEventListener('click', async (e) => {
        const favBtn = e.target.closest('.btn-fav');
        if (favBtn) {
            e.preventDefault();
            if (isUpdating) return;
            isUpdating = true;

            const id = favBtn.dataset.id;
            const icon = favBtn.querySelector('i');
            const willBeFavorite = !icon.classList.contains('iconoir-star-solid');
            icon.className = willBeFavorite ? 'iconoir-star-solid' : 'iconoir-star';

            try {
                await toggleFavoriteStatus(id);
                await initContacts();
            } catch (err) {
                console.error("Ошибка обновления:", err);
                icon.className = willBeFavorite ? 'iconoir-star' : 'iconoir-star-solid';
            } finally {
                isUpdating = false;
            }
        }

        const editBtn = e.target.closest('.btn-edit');
        if (editBtn) {
            e.preventDefault();
            const id = editBtn.closest('.contact-card').dataset.id;
            console.log("Редактирование:", id);
        }
    });
}

function renderContacts() {
    if (!isDataLoaded) return;

    const favorites = contactsCache.filter(c => c.isFavorite);
    const nonFavorites = contactsCache.filter(c => !c.isFavorite);

    renderSection('#favorite-section', favorites);
    renderSection('#all-section', nonFavorites);
}

export async function initContacts() {
    if (isUpdating) return;
    try {
        const allContacts = await getAllContacts();
        contactsCache = allContacts;
        isDataLoaded = true;
        renderContacts();
    } catch (err) {
        console.error("Ошибка инициализации контактов:", err);
    }
}

export async function addNewContact(contactData) {
    if (contactData.isFavorite === undefined) contactData.isFavorite = false;
    await saveContact(contactData);
    await initContacts();
}

function setupDOMObserver() {
    if (domObserver) domObserver.disconnect();

    domObserver = new MutationObserver((mutations) => {
        let shouldRender = false;

        for (const mutation of mutations) {
            if (mutation.addedNodes.length > 0) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === 1) {
                        if (
                            node.id === 'favorite-section' ||
                            node.id === 'all-section' ||
                            node.querySelector('#favorite-section') ||
                            node.querySelector('#all-section')
                        ) {
                            shouldRender = true;
                            break;
                        }
                    }
                }
            }
            if (shouldRender) break;
        }

        if (shouldRender) {
            clearTimeout(renderTimeout);
            renderTimeout = setTimeout(() => {
                if (document.querySelector('#favorite-section') || document.querySelector('#all-section')) {
                    renderContacts();
                }
            }, 50);
        }
    });

    domObserver.observe(document.body, { childList: true, subtree: true });
}

function bootstrap() {
    setupGlobalEvents();
    initContacts();
    setupDOMObserver();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
} else {
    bootstrap();
}
import { getAllContacts, toggleFavoriteStatus, saveContact } from './db.js';

let isUpdating = false;
let contactsCache = [];

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

export async function initContacts() {
    try {
        const allContacts = await getAllContacts();
        contactsCache = allContacts;

        const favorites = allContacts.filter(c => c.isFavorite);
        const nonFavorites = allContacts.filter(c => !c.isFavorite);

        await renderSection('#favorite-section', favorites);
        await renderSection('#all-section', nonFavorites);
    } catch (err) {
        console.error("Ошибка инициализации контактов:", err);
    }
}

export async function addNewContact(contactData) {
    if (contactData.isFavorite === undefined) contactData.isFavorite = false;
    await saveContact(contactData);
    await initContacts();
}

document.addEventListener('DOMContentLoaded', () => {
    setupGlobalEvents();
    initContacts();
});
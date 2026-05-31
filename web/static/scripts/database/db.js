import { openDB } from 'https://cdn.jsdelivr.net/npm/idb@8/+esm';

const DB_NAME = 'chat_app_db';
const DB_VERSION = 1;
const STORE_NAME = 'contacts';

export const dbPromise = openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
            const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            store.createIndex('type', 'type', { unique: false });
            store.createIndex('isFavorite', 'isFavorite', { unique: false });
        }
    },
});

export async function getAllContacts() {
    const db = await dbPromise;
    return db.getAll(STORE_NAME);
}

export async function getFavorites() {
    const db = await dbPromise;
    return db.getAllFromIndex(STORE_NAME, 'isFavorite', true);
}

export async function saveContact(contact) {
    const db = await dbPromise;
    return db.put(STORE_NAME, contact);
}

export async function deleteContact(id) {
    const db = await dbPromise;
    return db.delete(STORE_NAME, id);
}

export async function toggleFavoriteStatus(id) {
    const db = await dbPromise;
    const contact = await db.get(STORE_NAME, id);
    if (contact) {
        contact.isFavorite = !contact.isFavorite;
        await db.put(STORE_NAME, contact);
        return contact.isFavorite;
    }
    return false;
}
import notification from './notification.js';
import './menu.js';
import './templates.js';
import { initNavigation } from './ui/header.js';

globalThis.notification = notification;

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
});

export { notification };
export default notification;
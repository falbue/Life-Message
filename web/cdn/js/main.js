import './pages/menu.js';
import './pages/templates.js';
import notification from './notification.js';
import { initNavigation } from './ui/header.js';
import './ui/color.js';
import './utils/field-sync.js.js';

globalThis.notification = notification;

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
});

export { notification };
export default notification;
export default {
    name: '/exit',
    desc: 'Закончить сеанс и вернуться на главную страницу',
    execute(context) {
        const username = (typeof localStorage !== 'undefined') ? (localStorage.getItem('username') || 'Пользователь') : 'Пользователь';
        sendMessage(`${username} отключился...`);
        try { window.location.href = '/'; } catch (e) {
            Notification('Не удалось перейти на главную страницу');
        }
    }
};
import { sendMessage } from '../message/main.js';

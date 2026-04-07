import { formatMessage } from './helpers.js';
import socketClient from '../socket-client.js';
import { server_command } from './server-command.js';
import { adjustFontSize } from '../ui/auto-fonts.js';

const chatId = window.location.pathname.split('/').pop();
const inputMessage = document.getElementById('inputMessage');
const displayMessage = document.getElementById('displayMessage');
const getUsername = () => localStorage.getItem('username') || '';

let senderId = null;
try {
    senderId = localStorage.getItem('senderId');
} catch (e) {
    senderId = null;
}
if (!senderId) {
    senderId = Math.random().toString(36).substr(2, 9);
    try { localStorage.setItem('senderId', senderId); } catch (e) { /* ignore */ }
}



const sc = socketClient;
export function sendMessage(text) {
    const messageText = String(text ?? '');
    if (typeof sc?.emitUpdate !== 'function') return;
    sc.emitUpdate({ chat_id: chatId, text: messageText, sender_id: senderId });
}

sendMessage(`Пользователь ${getUsername()} подключился`);

inputMessage?.addEventListener('input', () => {
    let messageText = inputMessage.value.trim() || '...';
    const username = getUsername();
    if (username) {
        messageText = `**${username}:** ` + messageText;
    }
    sendMessage(messageText);
});

sc.onReceive((data) => {
    if (data.sender_id === senderId) return;
    displayMessage.innerHTML = formatMessage(data.text);
    adjustFontSize();
    const codeBlocks = displayMessage.querySelectorAll('pre code');
    if (window.hljs && codeBlocks.length) {
        codeBlocks.forEach((block) => {
            try { hljs.highlightElement(block); } catch (e) { /* ignore */ }
        });
    }
});

document.addEventListener('DOMContentLoaded', () => {
    server_command('Поделитесь ссылкой, что бы начать общение!');
    const copyEl = document.querySelector('.copy');
    if (copyEl && chatId) {
        const mask = (id => {
            if (!id) return '';
            if (id.length < 10) return id;
            return id.slice(0, 3) + '***' + id.slice(-3);
        })(chatId);
        copyEl.textContent = mask;
        copyEl.setAttribute('data-full', chatId);
    }
});
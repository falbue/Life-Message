import { formatMessage } from './helpers.js';
import socketClient from '../socket-client.js';
import { server_command } from './server-command.js';
import { adjustFontSize } from '../ui/auto-fonts.js';

const getUsername = () => localStorage.getItem('username') || '';

let senderId = null;
try {
    senderId = localStorage.getItem('senderId');
} catch (e) {
    senderId = null;
}
if (!senderId) {
    senderId = Math.random().toString(36).substr(2, 9);
    try { localStorage.setItem('senderId', senderId); } catch (e) { }
}

export function sendMessage(text) {
    const messageText = String(text ?? '');
    socketClient.emitUpdate({
        chat_id: window.CHAT_ID || window.location.pathname.split('/').pop(),
        text: messageText,
        sender_id: senderId
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const chatId = window.location.pathname.split('/').pop() || window.CHAT_ID;
    const inputMessage = document.getElementById('inputMessage');
    const displayMessage = document.getElementById('displayMessage');

    inputMessage?.addEventListener('input', () => {
        const rawText = inputMessage.value;
        if (!rawText) return;

        let messageText = rawText;
        const username = getUsername();

        if (username && messageText !== '...') {
            messageText = `**${username}:** ${rawText}`;
        }

        sendMessage(messageText);
    });

    const unsubscribe = socketClient.onReceive((data) => {
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

    if (chatId && typeof unsubscribe === 'function') {
        unsubscribe(chatId);
    }

    sendMessage(`Пользователь ${getUsername()} подключился`);
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

    inputMessage?.focus();
});

window.addEventListener('beforeunload', () => {
    sendMessage(`Пользователь ${getUsername()} отключился`);
    socketClient.disconnect();
});
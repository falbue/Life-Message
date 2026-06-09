document.addEventListener('DOMContentLoaded', () => {
    const room_id = window.location.hash.slice(1) || 'default';
    const wsUrl = `ws://127.0.0.1:8080/ws/${room_id}`;
    const ws = new WebSocket(wsUrl);

    const display = document.getElementById('displayMessage');
    const textarea = document.querySelector('textarea');
    const resetBtn = document.getElementById('reset');

    const userData = {
        avatar: localStorage.getItem('avatar') || '(つ✧ω✧)つ',
        senderId: localStorage.getItem('senderId') || 'on9sy9xkg',
        uid: localStorage.getItem('uid') || 'uid_jfxgdqxo4mpw84yz6',
        username: localStorage.getItem('username') || 'falbue'
    };

    // Инициализируем менеджер пользователей
    if (window.UsersManager) {
        window.UsersManager.init(userData.senderId);
    }

    ws.onopen = () => {
        ws.send(JSON.stringify({ ...userData, type: 'join' }));
    };

    ws.onmessage = (event) => {
        try {
            const msg = JSON.parse(event.data);

            // Список всех пользователей в комнате
            if (msg.type === 'users_list') {
                if (window.UsersManager) {
                    window.UsersManager.clear();
                    msg.users.forEach(user => {
                        window.UsersManager.add(user);
                    });
                }
                return;
            }

            // Новый пользователь подключился
            if (msg.type === 'user_joined') {
                if (window.UsersManager) {
                    window.UsersManager.add(msg);
                }
                display.textContent = `${msg.avatar} ${msg.username} подключился`;
                return;
            }

            // Пользователь отключился
            if (msg.type === 'user_left') {
                if (window.UsersManager && msg.senderId) {
                    window.UsersManager.remove(msg.senderId);
                }
                display.textContent = `${msg.avatar} ${msg.username} отключился`;
                return;
            }

            // Обычное сообщение
            if (msg.username !== undefined && msg.text !== undefined) {
                display.textContent = `${msg.username}: ${msg.text}`;
            }
        } catch (error) { }
    };

    textarea.addEventListener('input', () => {
        const text = textarea.value;
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ ...userData, text: text }));
        }
    });

    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            textarea.value = '';
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ ...userData, text: '' }));
            }
        });
    }
});
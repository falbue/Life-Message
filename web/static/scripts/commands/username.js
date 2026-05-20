export default {
    name: '/username',
    desc: 'Сменить имя пользователя',
    execute(context) {
        const { el, notification, server_command } = context;
        const raw = (el.input && el.input.value) ? el.input.value.trim() : '';
        const parts = raw.split(/\s+/);
        const name = parts.slice(1).join(' ').trim();
        if (!name) {
            const msg = 'Укажите имя пользователя после команды, например: /username Иван \nТекущее имя: ' + (localStorage.getItem('username') || '(не установлено)');
            server_command(msg, 10);
            return;
        }
        try {
            localStorage.setItem('username', name);
            const msg = `Имя пользователя установлено: ${name}`;
            notification(msg);
            if (el.input) el.input.value = '';
        } catch (e) {
            console.error(e);
            const err = 'Не удалось сохранить имя пользователя';
            notification(err);
        }
    }
};

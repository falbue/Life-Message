import { server_command } from '../message/server-command.js';
import commands from './index.js';

(function () {
    // `commands` imported from `./commands/index.js`

    const el = {
        commandsWrap: document.querySelector('.commands'),
        list: document.querySelector('.commands .list'),
        input: document.getElementById('inputMessage'),
        resetBtn: document.getElementById('reset'),
        execBtn: document.getElementById('exec'),
    };

    if (!el.input || !el.commandsWrap || !el.list) return;

    let filtered = commands.slice();
    let selected = -1;
    let lastMouseIndex = -1;

    window.LMCommands = {
        add(cmd) {
            if (!cmd || !cmd.name) return;
            commands.push(cmd);
        },
        list() {
            return commands.slice();
        }
    };

    function renderList() {
        el.list.innerHTML = '';
        if (filtered.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'item empty';
            empty.innerHTML = '<p class="desc">Команды отсутствуют</p>';
            el.list.appendChild(empty);
            return;
        }

        filtered.forEach((cmd, idx) => {
            const item = document.createElement('div');
            item.className = 'command item align-center';
            item.tabIndex = 0;
            item.dataset.index = idx;
            item.innerHTML = `<h4 class="name">${escapeHtml(cmd.name)}</h4>
            <p class="placeholder">${escapeHtml(cmd.desc || '')}</p>`;
            item.addEventListener('click', () => selectAndInsert(idx));

            item.addEventListener('mouseenter', () => {
                lastMouseIndex = idx;
                selected = idx;
                updateSelection();
            });
            item.addEventListener('mouseleave', () => {
                if (lastMouseIndex === idx) {
                    lastMouseIndex = -1;
                    selected = -1;
                    updateSelection();
                }
            });
            el.list.appendChild(item);
        });
        updateSelection();
    }

    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, c => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[c]));
    }

    function updateSelection() {
        const items = el.list.querySelectorAll('.item');
        items.forEach(it => it.classList.remove('active'));
        if (selected >= 0 && items[selected]) {
            items[selected].classList.add('active');
            items[selected].scrollIntoView({ block: 'nearest', inline: 'nearest' });
        }
    }

    function selectAndInsert(idx) {
        const cmd = filtered[idx];
        if (!cmd) return;
        el.input.value = cmd.name + ' ';
        filterCommands(cmd.name);
        showCommands();
        selected = idx;
        updateSelection();
        el.input.focus();
        try { el.input.selectionStart = el.input.selectionEnd = el.input.value.length; } catch (e) { /* ignore */ }
    }

    function showCommands() {
        el.commandsWrap.classList.remove('hidden');
        el.resetBtn?.classList.add('hidden');
        el.execBtn?.classList.remove('hidden');
    }

    function hideCommands() {
        el.commandsWrap.classList.add('hidden');
        el.resetBtn?.classList.remove('hidden');
        el.execBtn?.classList.add('hidden');
        selected = -1;
    }

    function filterCommands(text) {
        const q = (text || '').trim();
        if (!q || q === '/') {
            filtered = commands.slice();
        } else {
            filtered = commands.filter(c => c.name.startsWith(q) || c.name.includes(q));
        }
        selected = filtered.length ? 0 : -1;
        renderList();
    }

    // Команды реализуются в отдельных модулях в `./commands/`

    function executeCurrent() {
        const value = (el.input.value || '').trim();
        const token = value.split(/\s+/)[0] || '';
        if (!token.startsWith('/')) return false;
        const cmd = (commands || []).find(c => c && c.name === token);
        if (cmd && typeof cmd.execute === 'function') {
            try {
                cmd.execute({ el, notification, server_command, commands });
            } catch (e) {
                console.error(e);
                notification('Ошибка при выполнении команды');
            }
            el.input.value = '';
            hideCommands();
            return true;
        } else {
            notification('Неизвестная команда: ' + token);
            return false;
        }
    }

    el.input.addEventListener('input', () => {
        const v = el.input.value || '';
        if (v.startsWith('/')) {
            filterCommands(v.split(/\s+/)[0]);
            showCommands();
        } else {
            hideCommands();
        }
    });

    el.input.addEventListener('keydown', (ev) => {
        if (el.commandsWrap.classList.contains('hidden')) return;

        if (ev.key === 'ArrowDown') {
            ev.preventDefault();
            if (filtered.length === 0) return;
            selected = Math.min(filtered.length - 1, Math.max(0, selected + 1));
            updateSelection();
            return;
        }
        if (ev.key === 'Tab') {
            ev.preventDefault();
            if (filtered.length === 0) return;
            if (selected >= 0 && filtered[selected]) {
                const cmdName = filtered[selected].name;
                el.input.value = cmdName + ' ';
                filterCommands(cmdName);
                showCommands();
                el.input.focus();
                try { el.input.selectionStart = el.input.selectionEnd = el.input.value.length; } catch (e) { /* ignore */ }
            }
            return;
        }
        if (ev.key === 'ArrowUp') {
            ev.preventDefault();
            if (filtered.length === 0) return;
            selected = Math.max(0, selected - 1);
            updateSelection();
            return;
        }
        if (ev.key === 'Enter') {
            ev.preventDefault();
            executeCurrent();
            return;
        }
    });

    el.execBtn?.addEventListener('click', (ev) => {
        ev.preventDefault();
        executeCurrent();
    });

    // Initialize render
    filterCommands('/');

})();

export default {
    name: '/help',
    desc: 'Помощь',
    execute(context) {
        const { commands, server_command } = context;
        const lines = (commands || []).map(c => `${c.name} — ${c.desc || ''}`).join('\n');
        server_command(lines, 10);
    }
};

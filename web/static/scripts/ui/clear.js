// Простая логика очистки поля ввода при нажатии на кнопку сброса
document.addEventListener('DOMContentLoaded', () => {
    const resetBtn = document.getElementById('reset');
    const input = document.getElementById('inputMessage');

    if (!resetBtn || !input) return;

    resetBtn.type = 'button';

    resetBtn.addEventListener('click', (e) => {
        e.preventDefault();
        input.value = '';
        input.focus();
    });
});

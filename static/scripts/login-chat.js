function generateRandomString(length) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    const array = new Uint32Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, n => chars[n % chars.length]).join('');
}

(function initChatId() {
    const tryInit = () => {
        const input = document.getElementById("chat-id");
        if (!input) return false;

        if (!input.value) {
            input.placeholder = generateRandomString(64);
        }

        const container = input.closest('.card-list');
        if (container) {
            const btn = container.querySelector('#open-chat');
            if (btn && !btn.dataset.handlerAttached) {
                btn.addEventListener('click', () => {
                    let chatId = input.value.trim();
                    if (!chatId) chatId = input.placeholder;

                    if (chatId) {
                        window.location.href = `/chat/${chatId}`;
                    }
                });
                btn.dataset.handlerAttached = "true";
            }
        }

        return true;
    };

    if (tryInit()) return;

    const observer = new MutationObserver(() => {
        if (tryInit()) {
            observer.disconnect();
        }
    });

    observer.observe(document.documentElement, { childList: true, subtree: true });
})();
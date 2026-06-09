const chat = document.getElementById('displayMessage');

function adjustFontSize() {
    const text = chat.innerText.trim();
    const length = text.length;

    const minSize = 1.25;
    const maxSize = 2.5;
    const startShrinking = 10;
    const endShrinking = 150;

    let newSize;

    if (length <= startShrinking) {
        newSize = maxSize;
    } else if (length >= endShrinking) {
        newSize = minSize;
    } else {
        const ratio = (length - startShrinking) / (endShrinking - startShrinking);
        newSize = maxSize - ratio * (maxSize - minSize);
    }

    // Исправлено: правильное использование clamp(min, preferred, max)
    chat.style.fontSize = `${newSize}rem`;
}

// Вызываем функцию при загрузке страницы
document.addEventListener('DOMContentLoaded', adjustFontSize);

// Если текст меняется динамически, используйте MutationObserver
const observer = new MutationObserver(adjustFontSize);
observer.observe(chat, {
    childList: true,
    characterData: true,
    subtree: true
});
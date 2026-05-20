const chat = document.getElementById('displayMessage');

export function adjustFontSize() {
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
    chat.style.fontSize = `clamp(${newSize - 0.125}rem, 3vw, 1rem)`;
}
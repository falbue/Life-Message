import { adjustFontSize } from '../ui/auto-fonts.js';


export function server_command(text, speed = 50, elementId = "displayMessage") {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.innerHTML = '<b></b>';
    const b = el.querySelector('b');
    if (!b) return;
    b.style.whiteSpace = 'pre-wrap';
    b.classList.add('accent');
    b.textContent = '';
    let i = 0;
    const interval = setInterval(() => {
        if (i < text.length) {
            b.textContent += text.charAt(i++);
            adjustFontSize();
        } else {
            clearInterval(interval);
        }
    }, speed);
}
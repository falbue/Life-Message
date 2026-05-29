export default function notification(message, isError = false) {
    const notification = document.createElement("div");
    notification.id = "notification";
    notification.className = "notification";
    if (isError) notification.classList.add("error");
    notification.textContent = message;

    const appendNow = () => document.body.appendChild(notification);
    if (document.body) {
        appendNow();
    } else {
        document.addEventListener("DOMContentLoaded", appendNow, { once: true });
    }

    const removeAfterMs = 3000;
    setTimeout(() => { notification.classList.add("show"); }, 1)
    setTimeout(() => { notification.classList.remove("show"); }, removeAfterMs - 300)

    setTimeout(() => {
        if (notification.parentNode) notification.parentNode.removeChild(notification);
    }, removeAfterMs);
}
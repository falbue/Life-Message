const publicVapidKey = 'BDaCqX17zVgL0BX4N-3gL-T8K2D4zyoV72VtuYXM_U1vF0__q0-CCBTig2oAc77uFopLvl3E4wxxSNprGiy8iuk';

async function initPWA(chatId, userId) {
    if ('serviceWorker' in navigator) {
        try {
            // 2. Регистрируем воркер
            const register = await navigator.serviceWorker.register('/sw.js');
            console.log('Service Worker зарегистрирован');

            // 3. Запрашиваем разрешение на уведомления
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                console.error('Разрешение на уведомления не получено');
                return;
            }

            // 4. Подписываемся на Push-сервис браузера
            const subscription = await register.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
            });

            // 5. Отправляем подписку на ваш Flask-бэкенд
            await fetch('/subscribe', {
                method: 'POST',
                body: JSON.stringify({
                    chat_id: chatId,
                    user_id: userId,
                    subscription: subscription
                }),
                headers: { 'Content-Type': 'application/json' }
            });

            console.log('Подписка успешно отправлена на сервер');
        } catch (error) {
            console.error('Ошибка при настройке PWA:', error);
        }
    }
    else {
        console.warn('Service Worker не поддерживается в этом браузере');
    }
}

// Вспомогательная функция для конвертации ключа (нужна для Push API)
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}
self.addEventListener('push', (event) => {
    const data = event.data ? event.data.json() : { title: 'Новое сообщение', body: '...' };

    event.waitUntil(
        self.registration.showNotification(data.title, {
            body: data.body,
            icon: '/static/icon.png', // замените на свою иконку
            badge: '/static/badge.png',
            data: { url: '/chat' } // можно добавить id чата
        })
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow(event.notification.data.url)
    );
});
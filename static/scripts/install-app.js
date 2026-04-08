let deferredPrompt;
const installBtn = document.getElementById('install-app');

if (window.matchMedia('(display-mode: standalone)').matches || navigator.standalone) {
    installBtn.classList.add('hidden');
}

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.classList.remove('hidden');
});

installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();

    const { outcome } = await deferredPrompt.userChoice;
    console.log(`Результат установки: ${outcome}`);

    deferredPrompt = null;

    if (outcome === 'accepted') {
        installBtn.classList.add('hidden');
    }
});

window.addEventListener('appinstalled', () => {
    installBtn.classList.add('hidden');
    deferredPrompt = null;
});

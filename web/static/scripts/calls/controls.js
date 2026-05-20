import * as callManager from './callManager.js';

function notify(text) {
    if (typeof window.notification === 'function') {
        window.notification(text);
        return;
    }
    console.warn(text);
}

const audioBtn = document.getElementById('audioCallButton');
if (audioBtn) {
    audioBtn.addEventListener('click', async () => {
        if (!callManager.isJoined()) await callManager.joinCall();
        else callManager.leaveCall();
    });
}

const videoBtnEl = document.getElementById('videoButton');
if (videoBtnEl) {
    videoBtnEl.addEventListener('click', async () => {
        try {
            await callManager.toggleCamera();
        } catch (err) {
            console.error('Ошибка при попытке подключить камеру', err);
            notify('Камера недоступна');
        }
    });
}

const screenBtnEl = document.getElementById('screenButton');
if (screenBtnEl) {
    screenBtnEl.addEventListener('click', async () => {
        try {
            await callManager.toggleScreenShare();
        } catch (err) {
            console.error('Ошибка при попытке подключить экран', err);
            notify('Демонстрация экрана недоступна');
        }
    });
}

const muteBtnEl = document.getElementById('muteButton');
if (muteBtnEl) {
    muteBtnEl.addEventListener('click', async () => {
        try {
            const state = await callManager.toggleMute();
            if (!state.available) {
                notify('Микрофон недоступен');
            }
        } catch (err) {
            console.error('Ошибка при переключении микрофона', err);
            notify('Микрофон недоступен');
        }
    });
}

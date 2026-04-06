// controls.js — обработчики кнопок (вызов, микрофон)
import * as callManager from './callManager.js';
import * as media from './media.js';
import * as rtc from './rtc.js';
import * as ui from './ui.js';
import * as video from './video.js';

function refreshUI() {
    ui.updateUI(callManager.isJoined(), callManager.getCurrentCount(), media.getLocalStream(), video.getVideoState());
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
            await video.toggleCamera();
            refreshUI();
        } catch (err) {
            console.error('Ошибка при попытке подключить камеру', err);
            notification('Камера недоступна');
        }
    });
}

const screenBtnEl = document.getElementById('screenButton');
if (screenBtnEl) {
    screenBtnEl.addEventListener('click', async () => {
        try {
            await video.toggleScreenShare();
            refreshUI();
        } catch (err) {
            console.error('Ошибка при попытке подключить экран', err);
            notification('Демонстрация экрана недоступна');
        }
    });
}

const muteBtnEl = document.getElementById('muteButton');
if (muteBtnEl) {
    muteBtnEl.addEventListener('click', async () => {
        if (!media.getLocalStream()) {
            try {
                const stream = await media.ensureLocalStream();
                if (stream) {
                    rtc.addLocalTracksToAll(stream);
                }
            } catch (err) {
                console.error('Ошибка при попытке получить микрофон', err);
            }
        }

        const localStream = media.getLocalStream();
        if (localStream) {
            const tracks = localStream.getAudioTracks();
            const anyEnabled = tracks.some((t) => t.enabled);
            for (const t of tracks) t.enabled = !anyEnabled;
            refreshUI();
        } else {
            notification('Микрофон не доступен');
        }
    });
}

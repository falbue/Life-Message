// controls.js — обработчики кнопок (вызов, микрофон, видео)
import * as callManager from './callManager.js';
import * as media from './media.js';
import * as rtc from './rtc.js';
import * as ui from './ui.js';

function refreshUI() {
    ui.updateUI(
        callManager.isJoined(),
        callManager.getCurrentCount(),
        media.getLocalStream(),
        media.isVideoActive(),
        media.isScreenShareActive()
    );
}

// ── Audio call ────────────────────────────────────────────────────────────────
const audioBtn = document.getElementById('audioCallButton');
if (audioBtn) {
    audioBtn.addEventListener('click', async () => {
        if (!callManager.isJoined()) await callManager.joinCall();
        else callManager.leaveCall();
    });
}

// ── Mute ─────────────────────────────────────────────────────────────────────
const muteBtnEl = document.getElementById('muteButton');
if (muteBtnEl) {
    muteBtnEl.addEventListener('click', async () => {
        if (!media.getLocalStream()) {
            try {
                const stream = await media.ensureLocalStream();
                if (stream) rtc.addLocalTracksToAll(stream);
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

// ── Video ─────────────────────────────────────────────────────────────────────
const videoBtn = document.getElementById('videoButton');
if (videoBtn) {
    videoBtn.addEventListener('click', async () => {
        if (!callManager.isJoined()) return;

        if (media.isVideoActive()) {
            // Disable video
            media.disableVideo();
            rtc.removeVideoTrackFromAll();
            ui.updateLocalVideo(null);
            refreshUI();
        } else {
            // Show options: camera or screen share
            const panel = document.getElementById('videoSourcePanel');
            if (panel) panel.classList.toggle('hidden');
        }
    });
}

// ── Video source panel buttons ─────────────────────────────────────────────
const cameraBtn = document.getElementById('startCameraButton');
if (cameraBtn) {
    cameraBtn.addEventListener('click', async () => {
        const panel = document.getElementById('videoSourcePanel');
        if (panel) panel.classList.add('hidden');

        const track = await media.enableCamera();
        if (!track) { notification('Камера не доступна'); return; }

        // Set callback for when the user stops the stream externally
        media.setOnVideoStopped(() => {
            media.disableVideo();
            rtc.removeVideoTrackFromAll();
            ui.updateLocalVideo(null);
            refreshUI();
        });

        ui.updateLocalVideo(track);
        const ls = media.getLocalStream();
        rtc.replaceVideoTrackInAll(track, ls);
        refreshUI();
    });
}

const screenBtn = document.getElementById('startScreenButton');
if (screenBtn) {
    screenBtn.addEventListener('click', async () => {
        const panel = document.getElementById('videoSourcePanel');
        if (panel) panel.classList.add('hidden');

        const track = await media.startScreenShare();
        if (!track) { notification('Трансляция экрана не доступна'); return; }

        media.setOnVideoStopped(() => {
            media.disableVideo();
            rtc.removeVideoTrackFromAll();
            ui.updateLocalVideo(null);
            refreshUI();
        });

        ui.updateLocalVideo(track);
        const ls = media.getLocalStream();
        rtc.replaceVideoTrackInAll(track, ls);
        refreshUI();
    });
}

// ── Switch camera ──────────────────────────────────────────────────────────
const switchCameraBtn = document.getElementById('switchCameraButton');
if (switchCameraBtn) {
    switchCameraBtn.addEventListener('click', async () => {
        if (!media.isVideoActive() || media.isScreenShareActive()) return;

        const track = await media.switchCamera();
        if (!track) { notification('Не удалось переключить камеру'); return; }

        ui.updateLocalVideo(track);
        const ls = media.getLocalStream();
        rtc.replaceVideoTrackInAll(track, ls);
        refreshUI();
    });
}


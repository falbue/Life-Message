// ui.js — DOM-операции и обновление интерфейса
const audioBtn = document.getElementById('audioCallButton');
const muteBtn = document.getElementById('muteButton');
const videoBtn = document.getElementById('videoButton');
const screenBtn = document.getElementById('screenButton');
const observedRemoteStreams = new WeakSet();

function ensureCallMediaRoot() {
    let root = document.getElementById('callMedia');
    if (root) {
        return root;
    }

    root = document.createElement('div');
    root.id = 'callMedia';
    root.className = 'hidden';

    const localHost = document.createElement('div');
    localHost.id = 'callLocalMedia';

    const remoteHost = document.createElement('div');
    remoteHost.id = 'callRemoteMedia';

    root.append(remoteHost, localHost);

    const textarea = document.getElementById('textarea');
    if (textarea) {
        textarea.prepend(root);
    }

    return root;
}
function upsertRemoteStreamElement(stream, peerId, preferredKind = null) {
    const root = ensureCallMediaRoot();
    if (!root) return null;

    const remoteHost = document.getElementById('callRemoteMedia');
    if (!remoteHost) return null;

    const selector = `[data-peer-id="${peerId}"][data-stream-id="${stream.id}"]`;
    const existing = remoteHost.querySelector(selector);
    const hasVideo = preferredKind === 'video'
        || stream.getVideoTracks().some((track) => track.readyState === 'live');

    if (hasVideo) {
        let item = existing;
        if (!item || item.tagName !== 'DIV') {
            if (item) item.remove();
            item = document.createElement('div');
            item.dataset.peerId = peerId;
            item.dataset.streamId = stream.id;
            remoteHost.appendChild(item);
        }

        let video = item.querySelector('video');

        if (!video) {
            video = document.createElement('video');
            video.autoplay = true;
            video.playsInline = true;
            video.muted = true;
            item.innerHTML = '';
            item.appendChild(video);
        }

        if (video.srcObject !== stream) {
            video.srcObject = stream;
        }
        return item;
    }

    let audio = existing;
    if (!audio || audio.tagName !== 'AUDIO') {
        if (audio) audio.remove();
        audio = document.createElement('audio');
        audio.autoplay = true;
        audio.playsInline = true;
        audio.dataset.peerId = peerId;
        audio.dataset.streamId = stream.id;
        remoteHost.appendChild(audio);
    }

    if (audio.srcObject !== stream) {
        audio.srcObject = stream;
    }

    return audio;
}

function observeRemoteStream(stream, peerId) {
    if (observedRemoteStreams.has(stream)) return;
    observedRemoteStreams.add(stream);

    const sync = () => {
        upsertRemoteStreamElement(stream, peerId);
    };

    stream.addEventListener('addtrack', (event) => {
        const track = event && event.track;
        if (track) {
            track.addEventListener('ended', sync);
            track.addEventListener('mute', sync);
            track.addEventListener('unmute', sync);
        }
        sync();
    });
    stream.addEventListener('removetrack', sync);

    for (const track of stream.getTracks()) {
        track.addEventListener('ended', sync);
        track.addEventListener('mute', sync);
        track.addEventListener('unmute', sync);
    }
}

export function renderLocalMedia(streamEntries = []) {
    const root = ensureCallMediaRoot();
    if (!root) return;

    const localHost = document.getElementById('callLocalMedia');
    if (!localHost) return;

    localHost.innerHTML = '';

    for (const entry of streamEntries) {
        if (!entry || !entry.stream) continue;

        const item = document.createElement('div');
        item.dataset.mediaKind = entry.kind || 'video';

        const video = document.createElement('video');
        video.autoplay = true;
        video.playsInline = true;
        video.muted = true;
        video.srcObject = entry.stream;

        item.appendChild(video);
        localHost.appendChild(item);
    }
}

export function createMediaElementForStream(stream, peerId, incomingTrackKind = null) {
    if (!stream) return null;
    observeRemoteStream(stream, peerId);
    return upsertRemoteStreamElement(stream, peerId, incomingTrackKind);
}

export function removeMediaElementsForPeer(peerId) {
    const els = document.querySelectorAll(`[data-peer-id="${peerId}"]`);
    els.forEach((el) => el.remove());
}

export const createAudioElementForStream = createMediaElementForStream;
export const removeAudioElementsForPeer = removeMediaElementsForPeer;

export function updateUI(joined, currentCount, localStream, mediaState = {}) {
    if (audioBtn) {
        if (joined) {
            audioBtn.title = 'Выйти из звонка';
            audioBtn.className = 'red';
            audioBtn.innerHTML = '<i class="iconoir-phone-disabled"></i>';
        } else {
            const root = document.getElementById('callMedia');
            if (root) {
                root.classList.add('hidden');
            }
            audioBtn.className = '';
            audioBtn.title = 'Войти в звонок';
            audioBtn.innerHTML = '<i class="iconoir-phone"></i>';
        }
    }

    if (muteBtn) {
        muteBtn.classList.toggle('hidden', !joined);

        const hasStream = !!localStream;
        const enabled = hasStream && localStream.getAudioTracks().some((t) => t.enabled);
        if (!hasStream) {
            muteBtn.title = 'Включить микрофон (попробовать подключить)';
            muteBtn.innerHTML = '<i class="iconoir-microphone-mute-solid"></i>';
        } else if (enabled) {
            muteBtn.title = 'Выключить микрофон';
            muteBtn.innerHTML = '<i class="iconoir-microphone"></i>';
        } else {
            muteBtn.title = 'Включить микрофон';
            muteBtn.innerHTML = '<i class="iconoir-microphone-mute-solid"></i>';
        }
    }

    if (videoBtn) {
        videoBtn.classList.toggle('hidden', !joined);
        const active = !!mediaState.cameraActive;
        videoBtn.classList.toggle('red', active);
        videoBtn.title = active ? 'Выключить камеру' : 'Включить камеру';
        videoBtn.innerHTML = '<i class="iconoir-camera"></i>';
    }

    if (screenBtn) {
        screenBtn.classList.toggle('hidden', !joined);
        const active = !!mediaState.screenActive;
        screenBtn.classList.toggle('red', active);
        screenBtn.title = active ? 'Остановить демонстрацию экрана' : 'Поделиться экраном';
        screenBtn.innerHTML = '<i class="iconoir-chromecast"></i>';
    }
}

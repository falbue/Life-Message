const audioBtn = document.getElementById('audioCallButton');
const muteBtn = document.getElementById('muteButton');
const videoBtn = document.getElementById('videoButton');
const screenBtn = document.getElementById('screenButton');

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

    updateCallMediaVisibility();
    return root;
}

function updateCallMediaVisibility() {
    const root = document.getElementById('callMedia');
    if (!root) return;

    const localHost = document.getElementById('callLocalMedia');
    const remoteHost = document.getElementById('callRemoteMedia');
    const hasLocal = !!localHost && localHost.childElementCount > 0;
    const hasRemote = !!remoteHost && remoteHost.childElementCount > 0;

    root.classList.toggle('hidden', !hasLocal && !hasRemote);
}

function getTrackContainer(peerId, trackId, kind) {
    const root = ensureCallMediaRoot();
    if (!root) return null;

    const remoteHost = document.getElementById('callRemoteMedia');
    if (!remoteHost) return null;

    const selector = `[data-peer-id="${peerId}"][data-track-id="${trackId}"]`;
    let item = remoteHost.querySelector(selector);

    if (!item) {
        item = document.createElement(kind === 'audio' ? 'audio' : 'video');
        item.autoplay = true;
        item.playsInline = true;
        item.dataset.peerId = peerId;
        item.dataset.trackId = trackId;
        item.dataset.mediaKind = kind;
        remoteHost.appendChild(item);
    }

    return item;
}

function bindRemoteTrackElement(element, track, stream) {
    if (!element || !track) return;

    const mediaStream = new MediaStream([track]);
    if (element.srcObject !== mediaStream) {
        element.srcObject = mediaStream;
    }

    const remove = () => {
        try {
            element.remove();
        } catch (e) {
            // ignore remove errors
        }
        updateCallMediaVisibility();
    };

    track.onended = remove;
    if (stream) {
        stream.addEventListener('removetrack', (event) => {
            if (event && event.track && event.track.id === track.id) {
                remove();
            }
        });
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
        // Добавляем класс для стилизации локального видео
        item.className = 'local-media-item';

        const video = document.createElement('video');
        video.autoplay = true;
        video.playsInline = true;
        video.muted = true;
        video.srcObject = entry.stream;

        if (entry.label === 'Камера') {
            video.style.transform = 'scaleX(-1)';
        }

        item.appendChild(video);
        localHost.appendChild(item);
    }
    updateCallMediaVisibility();
}

export function createMediaElementForStream(stream, peerId, incomingTrackKind = null, incomingTrack = null) {
    if (!stream) return null;

    if (incomingTrack) {
        const trackKind = incomingTrack.kind || incomingTrackKind || 'video';
        const element = getTrackContainer(peerId, incomingTrack.id, trackKind);
        bindRemoteTrackElement(element, incomingTrack, stream);
        updateCallMediaVisibility();
        return element;
    }

    const tracks = stream.getTracks();
    const elements = [];

    for (const track of tracks) {
        const trackKind = track.kind || incomingTrackKind || 'video';
        const element = getTrackContainer(peerId, track.id, trackKind);
        bindRemoteTrackElement(element, track, stream);
        elements.push(element);
    }

    updateCallMediaVisibility();
    return elements;
}

export function removeMediaElementsForPeer(peerId) {
    const els = document.querySelectorAll(`[data-peer-id="${peerId}"]`);
    els.forEach((el) => el.remove());
    updateCallMediaVisibility();
}

export function clearRemoteMedia() {
    const remoteHost = document.getElementById('callRemoteMedia');
    if (remoteHost) {
        remoteHost.innerHTML = '';
    }
    updateCallMediaVisibility();
}

export function updateUI(joined, currentCount, localStream, mediaState = {}) {
    if (audioBtn) {
        if (joined) {
            updateCallMediaVisibility();
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

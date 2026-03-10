// ui.js — DOM-операции и обновление интерфейса
const audioBtn = document.getElementById('audioCallButton');

// ── Media elements for remote peers ──────────────────────────────────────────

// Keep track of which streams are already attached per peer to avoid duplicates
const _peerStreams = {}; // peerId → { audio?: HTMLElement, video?: HTMLElement }

export function createMediaElementsForPeer(stream, peerId, kind) {
    if (!_peerStreams[peerId]) _peerStreams[peerId] = {};

    if (kind === 'audio') {
        if (_peerStreams[peerId].audio) {
            _peerStreams[peerId].audio.srcObject = stream;
            return;
        }
        const audio = document.createElement('audio');
        audio.autoplay = true;
        audio.playsInline = true;
        audio.dataset.peerId = peerId;
        audio.srcObject = stream;
        document.body.appendChild(audio);
        _peerStreams[peerId].audio = audio;
    } else if (kind === 'video') {
        const grid = document.getElementById('videoGrid');
        if (!grid) return;

        if (_peerStreams[peerId].video) {
            _peerStreams[peerId].video.srcObject = stream;
            return;
        }

        const wrapper = document.createElement('div');
        wrapper.className = 'video-tile';
        wrapper.dataset.peerId = peerId;

        const video = document.createElement('video');
        video.autoplay = true;
        video.playsInline = true;
        video.muted = false;
        video.srcObject = stream;

        wrapper.appendChild(video);
        grid.appendChild(wrapper);
        _peerStreams[peerId].video = video;

        grid.classList.remove('hidden');
    }
}

// Legacy alias used by controls.js mute handler
export function createAudioElementForStream(stream, peerId) {
    createMediaElementsForPeer(stream, peerId, 'audio');
}

export function removeMediaElementsForPeer(peerId) {
    const els = _peerStreams[peerId];
    if (els) {
        if (els.audio) { try { els.audio.remove(); } catch (e) { /* ignore */ } }
        if (els.video) { try { els.video.closest('.video-tile')?.remove(); } catch (e) { /* ignore */ } }
        delete _peerStreams[peerId];
    }
    // Also clean up by data attribute (legacy)
    document.querySelectorAll(`audio[data-peer-id="${peerId}"]`).forEach(el => el.remove());
    document.querySelectorAll(`.video-tile[data-peer-id="${peerId}"]`).forEach(el => el.remove());

    // Hide grid if empty
    const grid = document.getElementById('videoGrid');
    if (grid && grid.querySelectorAll('.video-tile:not(#localVideoWrapper)').length === 0) {
        const hasLocal = document.getElementById('localVideoWrapper') &&
            !document.getElementById('localVideoWrapper').classList.contains('hidden');
        if (!hasLocal) grid.classList.add('hidden');
    }
}

// Legacy alias
export function removeAudioElementsForPeer(peerId) {
    removeMediaElementsForPeer(peerId);
}

// ── Local video preview ───────────────────────────────────────────────────────

export function updateLocalVideo(track) {
    const grid = document.getElementById('videoGrid');
    if (!grid) return;

    if (!track) {
        // Hide local video
        const wrapper = document.getElementById('localVideoWrapper');
        if (wrapper) wrapper.classList.add('hidden');
        // Hide grid if no remote videos either
        const hasRemote = grid.querySelectorAll('.video-tile:not(#localVideoWrapper)').length > 0;
        if (!hasRemote) grid.classList.add('hidden');
        return;
    }

    grid.classList.remove('hidden');
    let wrapper = document.getElementById('localVideoWrapper');
    if (!wrapper) {
        wrapper = document.createElement('div');
        wrapper.id = 'localVideoWrapper';
        wrapper.className = 'video-tile video-tile--local';

        const video = document.createElement('video');
        video.id = 'localVideo';
        video.autoplay = true;
        video.playsInline = true;
        video.muted = true; // always mute local to avoid echo
        wrapper.appendChild(video);
        grid.appendChild(wrapper);
    }

    const video = wrapper.querySelector('video');
    const stream = new MediaStream([track]);
    video.srcObject = stream;
    wrapper.classList.remove('hidden');
}

// ── Button state ──────────────────────────────────────────────────────────────

export function updateUI(joined, currentCount, localStream, isVideoActive, isScreenShare) {
    if (!audioBtn) return;
    if (joined) {
        audioBtn.title = 'Выйти из звонка';
        audioBtn.innerHTML = '<i class="iconoir-phone-disabled"></i>';
    } else {
        audioBtn.title = 'Войти в звонок';
        audioBtn.innerHTML = '<i class="iconoir-phone"></i>';
    }

    const muteBtn = document.getElementById('muteButton');
    if (muteBtn) {
        if (joined) muteBtn.classList.remove('hidden');
        else muteBtn.classList.add('hidden');

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

    const videoBtn = document.getElementById('videoButton');
    if (videoBtn) {
        if (joined) {
            videoBtn.classList.remove('hidden');
            if (isVideoActive) {
                videoBtn.title = isScreenShare ? 'Остановить трансляцию экрана' : 'Выключить камеру';
                videoBtn.innerHTML = isScreenShare
                    ? '<i class="iconoir-screen-share-off"></i>'
                    : '<i class="iconoir-video-camera-off"></i>';
                videoBtn.classList.add('active');
            } else {
                videoBtn.title = 'Включить камеру';
                videoBtn.innerHTML = '<i class="iconoir-video-camera"></i>';
                videoBtn.classList.remove('active');
            }
        } else {
            videoBtn.classList.add('hidden');
            videoBtn.classList.remove('active');
        }
    }

    const switchBtn = document.getElementById('switchCameraButton');
    if (switchBtn) {
        if (joined && isVideoActive && !isScreenShare) switchBtn.classList.remove('hidden');
        else switchBtn.classList.add('hidden');
    }
}

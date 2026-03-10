// media.js — управление локальным медиапотоком
let localStream = null;
let videoTrack = null;       // active camera or screen track
let currentFacingMode = 'user';
let _usingScreen = false;

// Callback invoked when a video/screen track ends externally (e.g. browser "stop sharing")
let _onVideoStopped = null;
export function setOnVideoStopped(cb) { _onVideoStopped = cb; }

export async function ensureLocalStream() {
    if (localStream) return localStream;
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        for (const t of stream.getAudioTracks()) t.enabled = true;
        localStream = stream;
        return localStream;
    } catch (err) {
        console.warn('Не удалось получить доступ к микрофону — останемся без микрофона', err);
        localStream = null;
        return null;
    }
}

export function getLocalStream() {
    return localStream;
}

export function setLocalStream(stream) {
    localStream = stream;
}

export function isVideoActive() {
    return videoTrack !== null;
}

export function isScreenShareActive() {
    return _usingScreen;
}

export function getVideoTrack() {
    return videoTrack;
}

export async function enableCamera() {
    await _stopCurrentVideo();
    _usingScreen = false;
    try {
        const s = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: currentFacingMode }
        });
        const track = s.getVideoTracks()[0];
        if (!track) return null;
        videoTrack = track;
        _attachToLocalStream(track);
        _bindEndedHandler(track);
        return track;
    } catch (err) {
        console.warn('Не удалось получить камеру', err);
        return null;
    }
}

export async function switchCamera() {
    if (!isVideoActive() || _usingScreen) return null;
    currentFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
    return enableCamera();
}

export async function startScreenShare() {
    await _stopCurrentVideo();
    _usingScreen = true;
    try {
        const s = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
        const track = s.getVideoTracks()[0];
        if (!track) { _usingScreen = false; return null; }
        videoTrack = track;
        _attachToLocalStream(track);
        _bindEndedHandler(track);
        return track;
    } catch (err) {
        console.warn('Не удалось начать трансляцию экрана', err);
        _usingScreen = false;
        return null;
    }
}

export function disableVideo() {
    _stopCurrentVideo();
}

// ── helpers ──────────────────────────────────────────────────────────────────

function _bindEndedHandler(track) {
    track.onended = () => { if (_onVideoStopped) _onVideoStopped(); };
}

function _attachToLocalStream(track) {
    if (!localStream) {
        localStream = new MediaStream([track]);
    } else {
        for (const t of localStream.getVideoTracks()) {
            localStream.removeTrack(t);
        }
        localStream.addTrack(track);
    }
}

function _stopCurrentVideo() {
    if (videoTrack) {
        try { videoTrack.stop(); } catch (e) { /* ignore */ }
        if (localStream) {
            try { localStream.removeTrack(videoTrack); } catch (e) { /* ignore */ }
        }
        videoTrack = null;
    }
    _usingScreen = false;
}

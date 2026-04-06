// video.js — подключение камеры и демонстрации экрана
import socketClient from '../socket-client.js';
import * as media from './media.js';
import * as rtc from './rtc.js';
import * as ui from './ui.js';

let cameraStream = null;
let screenStream = null;

function getSocket() {
    return socketClient.socket;
}

function getCompositeStream() {
    let localStream = media.getLocalStream();
    if (!localStream) {
        localStream = new MediaStream();
        media.setLocalStream(localStream);
    }
    return localStream;
}

function renderPreview() {
    ui.renderLocalMedia([
        cameraStream ? { label: 'Камера', kind: 'video', stream: cameraStream } : null,
        screenStream ? { label: 'Экран', kind: 'video', stream: screenStream } : null,
    ].filter(Boolean));
}

function pushStreamToPeers(stream) {
    rtc.addLocalTracksToAll(stream);
    const socket = getSocket();
    if (socket) {
        void rtc.renegotiateAllPeers(socket);
    }
}

function removeStreamFromPeers(stream) {
    rtc.removeLocalTracksFromAll(stream);
    const socket = getSocket();
    if (socket) {
        void rtc.renegotiateAllPeers(socket);
    }
}

export function getVideoState() {
    return {
        cameraActive: !!cameraStream,
        screenActive: !!screenStream,
    };
}

export async function startCamera() {
    if (cameraStream) return cameraStream;

    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    cameraStream = stream;

    const localStream = getCompositeStream();
    for (const track of stream.getVideoTracks()) {
        localStream.addTrack(track);
    }

    pushStreamToPeers(stream);
    renderPreview();
    return cameraStream;
}

export function stopCamera() {
    if (!cameraStream) {
        renderPreview();
        return;
    }

    const stream = cameraStream;
    cameraStream = null;

    const localStream = media.getLocalStream();
    if (localStream) {
        for (const track of stream.getVideoTracks()) {
            localStream.removeTrack(track);
        }
    }

    removeStreamFromPeers(stream);

    for (const track of stream.getTracks()) {
        try {
            track.stop();
        } catch (e) { }
    }

    renderPreview();
}

export async function toggleCamera() {
    if (cameraStream) {
        stopCamera();
        return false;
    }

    await startCamera();
    return true;
}

export async function startScreenShare() {
    if (screenStream) return screenStream;

    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
    screenStream = stream;

    const localStream = getCompositeStream();
    for (const track of stream.getVideoTracks()) {
        localStream.addTrack(track);
    }

    const [screenTrack] = stream.getVideoTracks();
    if (screenTrack) {
        screenTrack.onended = () => {
            stopScreenShare();
        };
    }

    pushStreamToPeers(stream);
    renderPreview();
    return screenStream;
}

export function stopScreenShare() {
    if (!screenStream) {
        renderPreview();
        return;
    }

    const stream = screenStream;
    screenStream = null;

    const localStream = media.getLocalStream();
    if (localStream) {
        for (const track of stream.getVideoTracks()) {
            localStream.removeTrack(track);
        }
    }

    for (const track of stream.getVideoTracks()) {
        track.onended = null;
    }

    removeStreamFromPeers(stream);

    for (const track of stream.getTracks()) {
        try {
            track.stop();
        } catch (e) { }
    }

    renderPreview();
}

export async function toggleScreenShare() {
    if (screenStream) {
        stopScreenShare();
        return false;
    }

    await startScreenShare();
    return true;
}

export function resetVideoMedia() {
    if (screenStream) {
        for (const track of screenStream.getVideoTracks()) {
            track.onended = null;
        }
    }

    cameraStream = null;
    screenStream = null;
    ui.renderLocalMedia([]);
}
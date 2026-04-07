import * as media from './media.js';
import * as rtc from './rtc.js';

let cameraStream = null;
let screenStream = null;

async function syncAfterTrackChange() {
    rtc.syncLocalTracksToAll(media.getLocalStream());
    await rtc.renegotiateAllPeers();
    await rtc.optimizeVideoQuality();
}

export function getVideoState() {
    return {
        cameraActive: !!cameraStream,
        screenActive: !!screenStream,
    };
}

export function getLocalPreviewEntries() {
    return [
        cameraStream ? { label: 'Камера', kind: 'video', stream: cameraStream, mirror: true } : null,
        screenStream ? { label: 'Экран', kind: 'video', stream: screenStream, mirror: false } : null,
    ].filter(Boolean);
}

export async function startCamera() {
    if (cameraStream) return cameraStream;
    const videoConstraints = {
        video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user',
        },
        audio: false,
    };

    const stream = await navigator.mediaDevices.getUserMedia(videoConstraints);
    cameraStream = stream;

    media.ensureLocalStream();
    media.addTracksToLocalStream(stream.getVideoTracks());
    await syncAfterTrackChange();
    return cameraStream;
}

export function stopCamera() {
    if (!cameraStream) return;

    const stream = cameraStream;
    cameraStream = null;

    media.removeTracksFromLocalStream(stream.getVideoTracks());

    for (const track of stream.getVideoTracks()) {
        try {
            track.stop();
        } catch (e) {
            // ignore stop errors
        }
    }

    void syncAfterTrackChange();
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

    media.ensureLocalStream();
    media.addTracksToLocalStream(stream.getVideoTracks());

    const [screenTrack] = stream.getVideoTracks();
    if (screenTrack) {
        screenTrack.onended = () => {
            stopScreenShare();
        };
    }

    await syncAfterTrackChange();
    return screenStream;
}

export function stopScreenShare() {
    if (!screenStream) return;

    const stream = screenStream;
    screenStream = null;

    media.removeTracksFromLocalStream(stream.getVideoTracks());

    for (const track of stream.getVideoTracks()) {
        track.onended = null;
    }

    for (const track of stream.getVideoTracks()) {
        try {
            track.stop();
        } catch (e) {
            // ignore stop errors
        }
    }

    void syncAfterTrackChange();
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
}

export function stopAllVideo() {
    if (screenStream) {
        stopScreenShare();
    }
    if (cameraStream) {
        stopCamera();
    }
    resetVideoMedia();
}

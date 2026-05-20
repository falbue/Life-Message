import socketClient from '../socket-client.js';
import * as media from './media.js';
import * as rtc from './rtc.js';
import * as ui from './ui.js';
import * as video from './video.js';

const socket = socketClient.socket;

let joined = false;
let currentCount = 0;
let initialized = false;
let shouldStayInCall = false;
let reconnectInProgress = false;

function getUIState() {
    return {
        joined,
        currentCount,
        localStream: media.getLocalStream(),
        videoState: video.getVideoState(),
    };
}

export function isJoined() { return joined; }
export function getCurrentCount() { return currentCount; }

function refreshUI() {
    ui.renderLocalMedia(video.getLocalPreviewEntries());
    const state = getUIState();
    ui.updateUI(state.joined, state.currentCount, state.localStream, state.videoState);
}

async function rejoinAfterReconnect(reason = 'reconnect') {
    if (!socket || !shouldStayInCall || reconnectInProgress) return;

    const chat_id = window.CHAT_ID;
    if (!chat_id) return;

    reconnectInProgress = true;
    try {
        rtc.closeAllPeerConnections();
        ui.clearRemoteMedia();

        if (!socket.connected && typeof socket.connect === 'function') {
            socket.connect();
        }

        if (socket.connected) {
            socket.emit('join_call', { chat_id });
        }

        currentCount = 1;
        joined = true;
        refreshUI();
        console.info(`Восстановление звонка: ${reason}`);
    } finally {
        reconnectInProgress = false;
    }
}

export function initCallManager() {
    if (!socket || initialized) return;
    initialized = true;

    rtc.initRtc({
        socket,
        getLocalStream: media.getLocalStream,
        onRemoteStream: (stream, peerId, trackKind, track) => {
            ui.createMediaElementForStream(stream, peerId, trackKind, track);
        },
    });

    socket.on('call_joined', (data) => {
        joined = true;
        shouldStayInCall = true;
        currentCount = data.count || currentCount;
        refreshUI();
    });

    socket.on('peers', async (data) => {
        const peers = data && Array.isArray(data.peers) ? data.peers : [];
        await rtc.connectToPeers(peers);
        await rtc.optimizeVideoQuality();
    });

    socket.on('signal', async (data) => {
        await rtc.handleSignal(data);
    });

    socket.on('participant_joined', (data) => {
        currentCount = data.count || currentCount;
        refreshUI();
        void rtc.optimizeVideoQuality();
    });

    socket.on('peer_left', (data) => {
        const peerId = data && data.peer_id;
        if (peerId) {
            rtc.removePeer(peerId);
            ui.removeMediaElementsForPeer(peerId);
        }
        currentCount = data.count || 0;
        refreshUI();
    });

    socket.on('call_left', (data) => {
        currentCount = data.count || 0;
        if (data && data.chat_id === window.CHAT_ID && currentCount === 0) {
            joined = false;
            rtc.closeAllPeerConnections();
            ui.clearRemoteMedia();
        }
        refreshUI();
    });

    socket.on('disconnect', () => {
        if (!shouldStayInCall) return;
        joined = false;
        currentCount = 0;
        rtc.closeAllPeerConnections();
        ui.clearRemoteMedia();
        refreshUI();
    });

    socket.on('connect', async () => {
        if (!shouldStayInCall) return;
        await rejoinAfterReconnect('socket-connect');
    });

    window.addEventListener('online', () => {
        if (!shouldStayInCall) return;
        if (socket && !socket.connected && typeof socket.connect === 'function') {
            socket.connect();
        }
        void rejoinAfterReconnect('browser-online');
    });

    window.addEventListener('offline', () => {
        if (!shouldStayInCall) return;
        joined = false;
        currentCount = 0;
        rtc.closeAllPeerConnections();
        ui.clearRemoteMedia();
        refreshUI();
    });

    window.addEventListener('beforeunload', () => {
        if (joined) {
            leaveCall();
        }
    });
}

export async function joinCall() {
    if (!socket) return;
    const chat_id = window.CHAT_ID;
    if (!chat_id) return;

    shouldStayInCall = true;
    await media.ensureMicrophone();

    if (!socket.connected && typeof socket.connect === 'function') {
        socket.connect();
    }

    socket.emit('join_call', { chat_id });
    refreshUI();
}

export function leaveCall() {
    if (!socket) return;
    const chat_id = window.CHAT_ID;
    if (!chat_id) return;
    shouldStayInCall = false;
    socket.emit('leave_call', { chat_id });

    rtc.closeAllPeerConnections();
    ui.clearRemoteMedia();
    video.stopAllVideo();
    media.stopAndClearLocalStream();

    ui.renderLocalMedia([]);

    joined = false;
    currentCount = 0;
    refreshUI();
}

export async function toggleMute() {
    const result = await media.toggleMicrophone();

    if (result.addedTrack) {
        rtc.syncLocalTracksToAll(media.getLocalStream());
        await rtc.renegotiateAllPeers();
    }

    refreshUI();
    return result;
}

export async function toggleCamera() {
    const active = await video.toggleCamera();
    refreshUI();
    return active;
}

export async function toggleScreenShare() {
    const active = await video.toggleScreenShare();
    refreshUI();
    return active;
}

// rtc.js — работа с RTCPeerConnection и треками
import { createMediaElementForStream, removeMediaElementsForPeer } from './ui.js';

export const pcs = {}; // RTCPeerConnections by peer id (sid)
const trackSenders = {};

function ensureRecvTransceiver(pc, kind) {
    try {
        const hasKind = pc.getTransceivers().some((t) => t.receiver && t.receiver.track && t.receiver.track.kind === kind);
        if (!hasKind) {
            pc.addTransceiver(kind, { direction: 'recvonly' });
        }
    } catch (e) {
        console.warn(`Не удалось добавить ${kind} transceiver`, e);
    }
}

function getSenderMap(peerId) {
    if (!trackSenders[peerId]) trackSenders[peerId] = {};
    return trackSenders[peerId];
}

export function addLocalTracksToPeer(peerId, stream) {
    const pc = pcs[peerId];
    if (!pc || !stream) return;

    const senderMap = getSenderMap(peerId);
    for (const track of stream.getTracks()) {
        if (senderMap[track.id]) continue;
        senderMap[track.id] = pc.addTrack(track, stream);
    }
}

export function createPeerConnection(peerId, socket) {
    if (pcs[peerId]) return pcs[peerId];
    const iceServers = [
        { urls: "stun:stun.l.google.com:19302" },
        {
            urls: ["turn:turn.falbue.ru:1501"],
            username: "turnuser",
            credential: "StrongPass123"
        }
    ];

    const pc = new RTCPeerConnection({ iceServers });

    // Всегда объявляем готовность принимать audio/video даже без локальных треков.
    ensureRecvTransceiver(pc, 'audio');
    ensureRecvTransceiver(pc, 'video');

    pc.ontrack = (ev) => {
        if (ev.streams && ev.streams[0]) {
            const trackKind = ev.track ? ev.track.kind : null;
            createMediaElementForStream(ev.streams[0], peerId, trackKind);

            const refresh = () => createMediaElementForStream(ev.streams[0], peerId, trackKind);
            if (ev.track) {
                ev.track.onended = refresh;
                ev.track.onmute = refresh;
                ev.track.onunmute = refresh;
            }
        }
    };

    pc.onicecandidate = (ev) => {
        if (ev.candidate && socket) {
            socket.emit('signal', { to: peerId, payload: { type: 'ice', candidate: ev.candidate } });
        }
    };

    pcs[peerId] = pc;
    return pc;
}

export async function renegotiatePeer(peerId, socket) {
    const pc = pcs[peerId];
    if (!pc || !socket) return;

    try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('signal', { to: peerId, payload: { type: 'offer', sdp: pc.localDescription } });
    } catch (err) {
        console.error('Ошибка повторного предложения', err);
    }
}

export async function renegotiateAllPeers(socket) {
    for (const peerId of Object.keys(pcs)) {
        await renegotiatePeer(peerId, socket);
    }
}

export function addLocalTracksToAll(stream) {
    if (!stream) return;
    for (const pid of Object.keys(pcs)) {
        addLocalTracksToPeer(pid, stream);
    }
}

export function removeLocalTracksFromPeer(peerId, stream) {
    const pc = pcs[peerId];
    if (!pc || !stream) return;

    const senderMap = trackSenders[peerId];
    if (!senderMap) return;

    for (const track of stream.getTracks()) {
        const sender = senderMap[track.id];
        if (!sender) continue;
        try {
            pc.removeTrack(sender);
        } catch (e) { }
        delete senderMap[track.id];
    }

    if (Object.keys(senderMap).length === 0) {
        delete trackSenders[peerId];
    }
}

export function closeAllPeerConnections() {
    Object.keys(pcs).forEach((pid) => {
        try {
            pcs[pid].close();
        } catch (e) { }
        delete pcs[pid];
        delete trackSenders[pid];
        removeMediaElementsForPeer(pid);
    });
}

export function removePeer(peerId) {
    if (pcs[peerId]) {
        try { pcs[peerId].close(); } catch (e) { }
        delete pcs[peerId];
        delete trackSenders[peerId];
        removeMediaElementsForPeer(peerId);
    }
}

export function removeLocalTracksFromAll(stream) {
    if (!stream) return;
    for (const pid of Object.keys(pcs)) {
        removeLocalTracksFromPeer(pid, stream);
    }
}

// rtc.js — работа с RTCPeerConnection и треками
import { createAudioElementForStream, removeAudioElementsForPeer } from './ui.js';

export const pcs = {}; // RTCPeerConnections by peer id (sid)

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

    pc.ontrack = (ev) => {
        if (ev.streams && ev.streams[0]) {
            createAudioElementForStream(ev.streams[0], peerId);
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

export function closeAllPeerConnections() {
    Object.keys(pcs).forEach((pid) => {
        try {
            pcs[pid].close();
        } catch (e) { }
        delete pcs[pid];
        removeAudioElementsForPeer(pid);
    });
}

export function removePeer(peerId) {
    if (pcs[peerId]) {
        try { pcs[peerId].close(); } catch (e) { }
        delete pcs[peerId];
        removeAudioElementsForPeer(peerId);
    }
}

export function addLocalTracksToAll(stream) {
    if (!stream) return;
    for (const pid of Object.keys(pcs)) {
        const pc = pcs[pid];
        for (const t of stream.getTracks()) pc.addTrack(t, stream);
    }
}

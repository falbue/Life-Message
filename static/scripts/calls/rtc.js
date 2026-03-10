// rtc.js — работа с RTCPeerConnection и треками
import { createMediaElementsForPeer, removeMediaElementsForPeer } from './ui.js';
import { setupDataChannel } from '../files/fileShare.js';

export const pcs = {};         // RTCPeerConnections by peer id (sid)
export const fileChannels = {}; // DataChannels by peer id

const ICE_SERVERS = [
    { urls: "stun:stun.l.google.com:19302" },
    {
        urls: ["turn:turn.falbue.ru:3478"],
        username: "turnuser",
        credential: "StrongPass123"
    },
    {
        urls: ["turns:turn.falbue.ru:5349"],
        username: "turnuser",
        credential: "StrongPass123"
    }
];

export function createPeerConnection(peerId, socket) {
    if (pcs[peerId]) return pcs[peerId];

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    // Receive remote tracks
    pc.ontrack = (ev) => {
        if (ev.streams && ev.streams[0]) {
            createMediaElementsForPeer(ev.streams[0], peerId, ev.track.kind);
        }
    };

    pc.onicecandidate = (ev) => {
        if (ev.candidate && socket) {
            socket.emit('signal', { to: peerId, payload: { type: 'ice', candidate: ev.candidate } });
        }
    };

    // Renegotiation — triggered automatically when tracks are added/removed
    pc.onnegotiationneeded = async () => {
        try {
            if (pc.signalingState !== 'stable') return;
            const offer = await pc.createOffer();
            if (pc.signalingState !== 'stable') return;
            await pc.setLocalDescription(offer);
            socket.emit('signal', { to: peerId, payload: { type: 'offer', sdp: pc.localDescription } });
        } catch (err) {
            console.error('Ошибка renegotiation', err);
        }
    };

    // Offer side creates the file data channel
    const dc = pc.createDataChannel('files', { ordered: true });
    fileChannels[peerId] = dc;
    setupDataChannel(dc, peerId);

    // Answer side receives the data channel
    pc.ondatachannel = (ev) => {
        if (ev.channel.name === 'files') {
            fileChannels[peerId] = ev.channel;
            setupDataChannel(ev.channel, peerId);
        }
    };

    pcs[peerId] = pc;
    return pc;
}

export function closeAllPeerConnections() {
    Object.keys(pcs).forEach((pid) => {
        try { pcs[pid].close(); } catch (e) { }
        delete pcs[pid];
        delete fileChannels[pid];
        removeMediaElementsForPeer(pid);
    });
}

export function removePeer(peerId) {
    if (pcs[peerId]) {
        try { pcs[peerId].close(); } catch (e) { }
        delete pcs[peerId];
        delete fileChannels[peerId];
        removeMediaElementsForPeer(peerId);
    }
}

// Add all tracks from a stream to all existing peer connections
export function addLocalTracksToAll(stream) {
    if (!stream) return;
    for (const pid of Object.keys(pcs)) {
        const pc = pcs[pid];
        for (const t of stream.getTracks()) {
            const alreadySending = pc.getSenders().some(s => s.track === t);
            if (!alreadySending) pc.addTrack(t, stream);
        }
    }
}

// Replace or add a specific video track in all peer connections
export function replaceVideoTrackInAll(newTrack, stream) {
    for (const pid of Object.keys(pcs)) {
        const pc = pcs[pid];
        const videoSender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
        if (videoSender) {
            videoSender.replaceTrack(newTrack).catch(err =>
                console.warn('replaceTrack failed', err)
            );
        } else if (newTrack && stream) {
            pc.addTrack(newTrack, stream);
        }
    }
}

// Remove all video senders from all peer connections
export function removeVideoTrackFromAll() {
    for (const pid of Object.keys(pcs)) {
        const pc = pcs[pid];
        const videoSender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
        if (videoSender) {
            try { pc.removeTrack(videoSender); } catch (e) { /* ignore */ }
        }
    }
}

export const pcs = {};

let socketRef = null;
let onRemoteStreamRef = null;
let getLocalStreamRef = null;

const trackSenders = {};

function getIceServers() {
    return [
        { urls: 'stun:stun.l.google.com:19302' },
        {
            urls: ['turn:turn.falbue.ru:1501'],
            username: 'turnuser',
            credential: 'StrongPass123',
        },
    ];
}

function ensureRecvTransceiver(pc, kind) {
    try {
        const exists = pc.getTransceivers().some((transceiver) => {
            return transceiver.receiver && transceiver.receiver.track && transceiver.receiver.track.kind === kind;
        });
        if (!exists) {
            pc.addTransceiver(kind, { direction: 'recvonly' });
        }
    } catch (err) {
        console.warn(`Не удалось добавить transceiver ${kind}`, err);
    }
}

function getSenderMap(peerId) {
    if (!trackSenders[peerId]) {
        trackSenders[peerId] = {};
    }
    return trackSenders[peerId];
}

function emitSignal(to, payload) {
    if (!socketRef) return;
    socketRef.emit('signal', { to, payload });
}

export function initRtc({ socket, onRemoteStream, getLocalStream }) {
    socketRef = socket || null;
    onRemoteStreamRef = onRemoteStream || null;
    getLocalStreamRef = getLocalStream || null;
}

export function createPeerConnection(peerId) {
    if (pcs[peerId]) return pcs[peerId];

    const pc = new RTCPeerConnection({ iceServers: getIceServers() });
    ensureRecvTransceiver(pc, 'audio');
    ensureRecvTransceiver(pc, 'video');

    pc.ontrack = (event) => {
        const stream = event.streams && event.streams[0] ? event.streams[0] : null;
        if (!stream || !onRemoteStreamRef) return;
        const kind = event.track ? event.track.kind : null;
        onRemoteStreamRef(stream, peerId, kind, event.track || null);
    };

    pc.onicecandidate = (event) => {
        if (!event.candidate) return;
        emitSignal(peerId, { type: 'ice', candidate: event.candidate });
    };

    pcs[peerId] = pc;
    return pc;
}

export function syncLocalTracksToPeer(peerId, stream = null) {
    const pc = pcs[peerId];
    if (!pc) return;

    const senderMap = getSenderMap(peerId);
    const localStream = stream || (getLocalStreamRef ? getLocalStreamRef() : null);
    const nextTracks = localStream ? localStream.getTracks() : [];
    const nextTrackIds = new Set(nextTracks.map((track) => track.id));

    for (const trackId of Object.keys(senderMap)) {
        if (nextTrackIds.has(trackId)) continue;
        try {
            pc.removeTrack(senderMap[trackId]);
        } catch (err) {
            // ignore removeTrack errors
        }
        delete senderMap[trackId];
    }

    for (const track of nextTracks) {
        if (senderMap[track.id]) continue;
        senderMap[track.id] = pc.addTrack(track, localStream);
    }

    if (Object.keys(senderMap).length === 0) {
        delete trackSenders[peerId];
    }
}

export function syncLocalTracksToAll(stream = null) {
    for (const peerId of Object.keys(pcs)) {
        syncLocalTracksToPeer(peerId, stream);
    }
}

export async function renegotiatePeer(peerId) {
    const pc = pcs[peerId];
    if (!pc || !socketRef) return;

    try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        emitSignal(peerId, { type: 'offer', sdp: pc.localDescription });
    } catch (err) {
        console.error('Ошибка при renegotiate peer', err);
    }
}

export async function renegotiateAllPeers() {
    for (const peerId of Object.keys(pcs)) {
        await renegotiatePeer(peerId);
    }
}

export async function connectToPeer(peerId) {
    const pc = createPeerConnection(peerId);
    syncLocalTracksToPeer(peerId);
    await renegotiatePeer(peerId);
}

export async function connectToPeers(peerIds = []) {
    for (const peerId of peerIds) {
        try {
            await connectToPeer(peerId);
        } catch (err) {
            console.error('Ошибка подключения к peer', peerId, err);
        }
    }
}

export async function handleSignal(data) {
    const from = data && data.from;
    const payload = data && data.payload;
    if (!from || !payload) return;

    const pc = createPeerConnection(from);

    if (payload.type === 'offer') {
        try {
            await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
            syncLocalTracksToPeer(from);
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            emitSignal(from, { type: 'answer', sdp: pc.localDescription });
        } catch (err) {
            console.error('Ошибка обработки offer', err);
        }
        return;
    }

    if (payload.type === 'answer') {
        try {
            await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        } catch (err) {
            console.error('Ошибка обработки answer', err);
        }
        return;
    }

    if (payload.type === 'ice' && payload.candidate) {
        try {
            await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
        } catch (err) {
            console.error('Ошибка добавления ICE кандидата', err);
        }
    }
}

export function removePeer(peerId) {
    const pc = pcs[peerId];
    if (pc) {
        try {
            pc.close();
        } catch (err) {
            // ignore close errors
        }
        delete pcs[peerId];
    }
    delete trackSenders[peerId];
}

export function closeAllPeerConnections() {
    for (const peerId of Object.keys(pcs)) {
        removePeer(peerId);
    }
}

export async function optimizeVideoQuality() {
    const peerCount = Object.keys(pcs).length;

    for (const peerId of Object.keys(pcs)) {
        const pc = pcs[peerId];
        if (!pc) continue;

        try {
            const senders = pc.getSenders();
            for (const sender of senders) {
                if (!sender.track || sender.track.kind !== 'video') continue;

                const parameters = sender.getParameters();
                if (!parameters.encodings || parameters.encodings.length === 0) {
                    parameters.encodings = [{}];
                }

                if (peerCount > 4) {
                    parameters.encodings[0].maxBitrate = 300000;
                    parameters.encodings[0].maxFramerate = 15;
                } else if (peerCount > 2) {
                    parameters.encodings[0].maxBitrate = 600000;
                    parameters.encodings[0].maxFramerate = 24;
                } else {
                    delete parameters.encodings[0].maxBitrate;
                    delete parameters.encodings[0].maxFramerate;
                }

                await sender.setParameters(parameters);
            }
        } catch (err) {
            console.warn(`Не удалось оптимизировать видео для ${peerId}`, err);
        }
    }
}

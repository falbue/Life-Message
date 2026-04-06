// rtc.js — работа с RTCPeerConnection и треками
import { createMediaElementForStream, removeMediaElementsForPeer } from './ui.js';

export const pcs = {}; // RTCPeerConnections by peer id (sid)
const trackSenders = {};
const reconnectTimers = {};

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

                // Убедимся что аудиотреки всегда активны (unless explicitly disabled)
                if (ev.track.kind === 'audio' && !ev.track.enabled) {
                    ev.track.enabled = true;
                }
            }
        }
    };

    pc.onicecandidate = (ev) => {
        if (ev.candidate && socket) {
            socket.emit('signal', { to: peerId, payload: { type: 'ice', candidate: ev.candidate } });
        }
    };

    // Мониторим состояние соединения для автоматического переподключения
    pc.onconnectionstatechange = () => {
        console.log(`Соединение с ${peerId}: ${pc.connectionState}`);

        if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
            // Планируем переподключение
            scheduleReconnect(peerId, socket);
        }
    };

    pc.oniceconnectionstatechange = () => {
        console.log(`ICE соединение с ${peerId}: ${pc.iceConnectionState}`);

        if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
            scheduleReconnect(peerId, socket);
        }
    };

    pcs[peerId] = pc;
    return pc;
}

    }, 2000);
}

function scheduleReconnect(peerId, socket) {
    // Избегаем множественных переподключений одновременно
    if (reconnectTimers[peerId]) return;

    reconnectTimers[peerId] = setTimeout(async () => {
        delete reconnectTimers[peerId];

        if (!pcs[peerId] || !socket) return;

        try {
            // Закрываем старое соединение
            try { pcs[peerId].close(); } catch (e) { }
            delete pcs[peerId];
            delete trackSenders[peerId];

            // Создаем новое соединение
            const pc = createPeerConnection(peerId, socket);

            // Переотправляем локальные треки
            const localStream = (await import('./media.js')).getLocalStream();
            if (localStream) {
                addLocalTracksToPeer(peerId, localStream);
            }

            // Отправляем новый offer
            await renegotiatePeer(peerId, socket);
        } catch (err) {
            console.error('Ошибка переподключения с', peerId, err);
        }
    }, 2000);
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

// Оптимизируем качество видео при количестве участников
export async function optimizeVideoQuality(socket) {
    const peerCount = Object.keys(pcs).length;

    // Если много участников, уменьшаем качество
    for (const peerId of Object.keys(pcs)) {
        const pc = pcs[peerId];
        if (!pc) continue;

        try {
            const senders = pc.getSenders();
            for (const sender of senders) {
                if (sender.track && sender.track.kind === 'video') {
                    const params = sender.getParameters();

                    if (!params.encodings) {
                        params.encodings = [{}];
                    }

                    // Разные качества для разного количества участников
                    if (peerCount > 4) {
                        params.encodings[0].maxBitrate = 300000; // 300kbps
                        params.encodings[0].maxFramerate = 15;
                    } else if (peerCount > 2) {
                        params.encodings[0].maxBitrate = 600000; // 600kbps
                        params.encodings[0].maxFramerate = 24;
                    }

                    await sender.setParameters(params);
                }
            }
        } catch (err) {
            console.warn(`Не удалось оптимизировать видео для ${peerId}:`, err);
        }
    }
}

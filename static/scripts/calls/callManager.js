// callManager.js — сигнализация, состояние звонка и обработчики сокета
import socketClient from '../socket-client.js';
import * as media from './media.js';
import * as rtc from './rtc.js';
import * as ui from './ui.js';
import * as video from './video.js';

const socket = socketClient.socket;
let joined = false;
let currentCount = 0;

function hasActiveVideoMedia() {
    const state = video.getVideoState();
    return !!state.cameraActive || !!state.screenActive;
}

export function isJoined() { return joined; }
export function getCurrentCount() { return currentCount; }

export function initCallManager() {
    if (!socket) return;

    socket.on('call_joined', (data) => {
        joined = true;
        currentCount = data.count || currentCount;
        ui.updateUI(joined, currentCount, media.getLocalStream(), video.getVideoState());
    });

    socket.on('peers', async (data) => {
        const peers = data && data.peers ? data.peers : [];
        for (const pid of peers) {
            try {
                const pc = rtc.createPeerConnection(pid, socket);
                if (media.getLocalStream()) {
                    rtc.addLocalTracksToPeer(pid, media.getLocalStream());
                }
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                socket.emit('signal', { to: pid, payload: { type: 'offer', sdp: pc.localDescription } });
            } catch (err) {
                console.error('Ошибка создания offer', err);
            }
        }
    });

    socket.on('signal', async (data) => {
        const from = data.from;
        const payload = data.payload || {};
        if (!from || !payload) return;

        let pc = rtc.pcs[from];
        if (payload.type === 'offer') {
            pc = rtc.createPeerConnection(from, socket);
            if (media.getLocalStream()) {
                rtc.addLocalTracksToPeer(from, media.getLocalStream());
            }
            try {
                await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                socket.emit('signal', { to: from, payload: { type: 'answer', sdp: pc.localDescription } });

                if (hasActiveVideoMedia()) {
                    setTimeout(() => {
                        if (rtc.pcs[from]) {
                            rtc.renegotiatePeer(from, socket);
                        }
                    }, 0);
                }
            } catch (err) {
                console.error('Ошибка при обработке offer', err);
            }
        } else if (payload.type === 'answer') {
            if (!pc) pc = rtc.createPeerConnection(from, socket);
            try {
                await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
            } catch (err) {
                console.error('Ошибка установки answer', err);
            }
        } else if (payload.type === 'ice') {
            if (!pc) pc = rtc.createPeerConnection(from, socket);
            try {
                await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
            } catch (err) {
                console.error('Ошибка добавления ICE', err);
            }
        }
    });

    socket.on('participant_joined', (data) => {
        currentCount = data.count || currentCount;
        ui.updateUI(joined, currentCount, media.getLocalStream(), video.getVideoState());
    });

    socket.on('peer_left', (data) => {
        const peerId = data && data.peer_id;
        if (peerId) rtc.removePeer(peerId);
        currentCount = data.count || 0;
        ui.updateUI(joined, currentCount, media.getLocalStream(), video.getVideoState());
    });

    socket.on('call_left', (data) => {
        currentCount = data.count || 0;
        if (data && data.chat_id === window.CHAT_ID && currentCount === 0) {
            joined = false;
            rtc.closeAllPeerConnections();
        }
        ui.updateUI(joined, currentCount, media.getLocalStream(), video.getVideoState());
    });
}

export async function joinCall() {
    if (!socket) return;
    const chat_id = window.CHAT_ID;
    if (!chat_id) return;

    await media.ensureLocalStream();
    socket.emit('join_call', { chat_id });
    ui.updateUI(joined, currentCount, media.getLocalStream(), video.getVideoState());
}

export function leaveCall() {
    if (!socket) return;
    const chat_id = window.CHAT_ID;
    if (!chat_id) return;
    socket.emit('leave_call', { chat_id });
    // Закрываем peer-соединения
    rtc.closeAllPeerConnections();
    video.resetVideoMedia();

    // Останавливаем локальные медиатреки (микрофон/камера) и очищаем поток
    try {
        const localStream = media.getLocalStream();
        if (localStream) {
            for (const t of localStream.getTracks()) {
                try { t.stop(); } catch (e) { /* ignore */ }
            }
            // Сбрасываем ссылку в модуле media
            media.setLocalStream(null);
        }
    } catch (e) {
        console.warn('Ошибка при остановке локального потока', e);
    }

    joined = false;
    currentCount = 0;
    ui.updateUI(joined, currentCount, media.getLocalStream(), video.getVideoState());
}

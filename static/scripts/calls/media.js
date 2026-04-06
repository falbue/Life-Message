// media.js — управление локальным медиапотоком
let localStream = null;

export async function ensureLocalStream() {
    if (localStream) {
        if (localStream.getAudioTracks().length > 0) return localStream;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            for (const t of stream.getAudioTracks()) {
                t.enabled = true;
                localStream.addTrack(t);
            }
            return localStream;
        } catch (err) {
            console.warn('Не удалось добавить доступ к микрофону', err);
            return localStream;
        }
    }
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // По умолчанию микрофон включен
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

let localStream = null;

function ensureCompositeStream() {
    if (!localStream) {
        localStream = new MediaStream();
    }
    return localStream;
}

export async function ensureMicrophone() {
    const stream = ensureCompositeStream();
    const liveAudioTracks = stream.getAudioTracks().filter((track) => track.readyState === 'live');

    if (liveAudioTracks.length > 0) {
        for (const track of liveAudioTracks) {
            track.enabled = true;
        }
        return stream;
    }

    try {
        const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        for (const track of micStream.getAudioTracks()) {
            track.enabled = true;
            stream.addTrack(track);
        }
        return stream;
    } catch (err) {
        console.warn('Не удалось получить доступ к микрофону', err);
        return stream;
    }
}

export async function toggleMicrophone() {
    const stream = ensureCompositeStream();
    let tracks = stream.getAudioTracks().filter((track) => track.readyState === 'live');

    if (tracks.length === 0) {
        try {
            const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            for (const track of micStream.getAudioTracks()) {
                track.enabled = true;
                stream.addTrack(track);
            }
            return { available: true, enabled: true, addedTrack: true };
        } catch (err) {
            console.warn('Не удалось получить доступ к микрофону', err);
            return { available: false, enabled: false, addedTrack: false };
        }
    }

    const currentlyEnabled = tracks.some((track) => track.enabled);
    const nextEnabled = !currentlyEnabled;
    for (const track of tracks) {
        track.enabled = nextEnabled;
    }

    return { available: true, enabled: nextEnabled, addedTrack: false };
}

export function addTracksToLocalStream(tracks = []) {
    const stream = ensureCompositeStream();
    const existingIds = new Set(stream.getTracks().map((track) => track.id));

    for (const track of tracks) {
        if (!track || existingIds.has(track.id)) continue;
        stream.addTrack(track);
    }

    return stream;
}

export function removeTracksFromLocalStream(tracks = []) {
    if (!localStream) return;
    for (const track of tracks) {
        try {
            localStream.removeTrack(track);
        } catch (e) {
            // ignore remove errors
        }
    }
}

export function ensureLocalStream() {
    return ensureCompositeStream();
}

export function getLocalStream() {
    return localStream;
}

export function setLocalStream(stream) {
    localStream = stream;
}

export function stopAndClearLocalStream() {
    if (!localStream) return;

    for (const track of localStream.getTracks()) {
        try {
            track.stop();
        } catch (e) {
            // ignore stop errors
        }
    }

    localStream = null;
}

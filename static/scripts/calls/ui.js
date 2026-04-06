// ui.js — DOM-операции и обновление интерфейса
const audioBtn = document.getElementById('audioCallButton');

export function createAudioElementForStream(stream, peerId) {
    const audio = document.createElement('audio');
    audio.autoplay = true;
    audio.playsInline = true;
    audio.dataset.peerId = peerId;
    audio.srcObject = stream;
    document.body.appendChild(audio);
}

export function removeAudioElementsForPeer(peerId) {
    const els = document.querySelectorAll(`audio[data-peer-id="${peerId}"]`);
    els.forEach((el) => el.remove());
}

export function updateUI(joined, currentCount, localStream) {
    if (!audioBtn) return;
    if (joined) {
        audioBtn.title = 'Выйти из звонка';
        audioBtn.className = "red"
        audioBtn.innerHTML = '<i class="iconoir-phone-disabled"></i>';
    } else {
        audioBtn.className = "";
        audioBtn.title = 'Войти в звонок';
        audioBtn.innerHTML = '<i class="iconoir-phone"></i>';
    }

    const muteBtn = document.getElementById('muteButton');
    if (muteBtn) {
        if (joined) muteBtn.classList.remove('hidden');
        else muteBtn.classList.add('hidden');

        const hasStream = !!localStream;
        const enabled = hasStream && localStream.getAudioTracks().some((t) => t.enabled);
        if (!hasStream) {
            muteBtn.title = 'Включить микрофон (попробовать подключить)';
            muteBtn.innerHTML = '<i class="iconoir-microphone-mute-solid"></i>';
        } else if (enabled) {
            muteBtn.title = 'Выключить микрофон';
            muteBtn.innerHTML = '<i class="iconoir-microphone"></i>';
        } else {
            muteBtn.title = 'Включить микрофон';
            muteBtn.innerHTML = '<i class="iconoir-microphone-mute-solid"></i>';
        }
    }
}

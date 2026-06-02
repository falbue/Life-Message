import { AVATARS } from './avatars.js';

function getRandomAvatar() {
    const randomIndex = Math.floor(Math.random() * AVATARS.length);
    return AVATARS[randomIndex];
}

function generateUID() {
    return 'uid_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

function checkAndInitializeLocalStorage() {
    if (!localStorage.getItem('uid')) {
        localStorage.setItem('uid', generateUID());
    }

    const currentAvatar = localStorage.getItem('avatar');
    if (!currentAvatar || currentAvatar.trim() === '') {
        localStorage.setItem('avatar', getRandomAvatar());
    }

    if (!localStorage.getItem('username')) {
        localStorage.setItem('username', 'Гость');
    }
}

checkAndInitializeLocalStorage();
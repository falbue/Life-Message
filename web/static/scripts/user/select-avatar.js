import { AVATARS } from './avatars.js';

document.addEventListener('DOMContentLoaded', () => {
    const observer = new MutationObserver(() => {
        const container = document.getElementById('select-avatars');

        if (container && !container.dataset.initialized) {
            container.dataset.initialized = 'true';

            container.innerHTML = '';

            const currentAvatar = localStorage.getItem('avatar');

            AVATARS.forEach((avatar) => {
                const button = document.createElement('button');
                button.className = 'avatar';
                button.textContent = avatar;

                if (avatar === currentAvatar) {
                    button.classList.add('active');
                }

                container.appendChild(button);
            });

            container.addEventListener('click', (event) => {
                const button = event.target.closest('.avatar');

                if (button) {
                    const selectedAvatar = button.textContent;

                    localStorage.setItem('avatar', selectedAvatar);

                    document.querySelectorAll('#select-avatars .avatar').forEach(el => el.classList.remove('active'));
                    button.classList.add('active');
                }
            });
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
});
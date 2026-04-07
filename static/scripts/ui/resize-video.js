document.addEventListener('click', (e) => {
    const video = e.target.closest('video');

    if (video && !video.classList.contains('big')) {
        const hadMirror = !!(video.parentElement && video.parentElement.classList.contains('mirror'));

        video._parent = video.parentElement;
        video._nextSibling = video.nextSibling;
        video._hadMirror = hadMirror;

        video.classList.add('big');
        if (hadMirror) {
            video.classList.add('mirror');
        }
        document.body.appendChild(video);

        history.pushState({ videoOpen: true }, "");

        const closeBtn = document.createElement('button');
        closeBtn.className = 'iconoir-xmark-circle video-close';

        const closeVideo = () => {
            video.classList.remove('big');
            if (video._hadMirror) {
                video.classList.remove('mirror');
            }
            if (video._nextSibling) {
                video._parent.insertBefore(video, video._nextSibling);
            } else {
                video._parent.appendChild(video);
            }
            delete video._hadMirror;
            closeBtn.remove();
            window.removeEventListener('popstate', onBack);
        };

        const onBack = () => closeVideo();
        window.addEventListener('popstate', onBack, { once: true });

        closeBtn.onclick = (event) => {
            event.stopPropagation();
            history.back();
        };

        document.body.appendChild(closeBtn);
    }
});
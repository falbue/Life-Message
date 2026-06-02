const HUE_KEY = 'color';

const updateActiveState = (deg) => {
    const currentDeg = parseInt(deg, 10);
    document.querySelectorAll('[data-hue-adaptive]').forEach(btn => {
        const btnDeg = parseInt(btn.dataset.hueAdaptive, 10);
        if (btnDeg === currentDeg) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
};

const setHue = (deg) => {
    document.documentElement.style.setProperty('--hue-offset', `${deg}deg`);
    localStorage.setItem(HUE_KEY, deg);
    updateActiveState(deg);
};

const getHue = () => {
    const saved = localStorage.getItem(HUE_KEY);
    return saved ? parseInt(saved, 10) : 0;
};

document.addEventListener('DOMContentLoaded', () => {
    const hue = getHue();
    setHue(hue);

    const slider = document.getElementById('hue-slider');
    if (slider) {
        slider.value = hue;
        slider.addEventListener('input', e => {
            setHue(e.target.value);
        });
    }

    document.querySelectorAll('[data-hue-adaptive]').forEach(btn => {
        const targetDeg = btn.dataset.hueAdaptive;
        btn.style.setProperty('--hue-target', `${targetDeg}deg`);

        btn.addEventListener('click', () => {
            setHue(targetDeg);
            if (slider) slider.value = targetDeg;
        });
    });
});

const HUE_KEY = 'lm-hue-offset'; // префикс для изоляции

const setHue = (deg) => {
    document.documentElement.style.setProperty('--hue-offset', `${deg}deg`);
    localStorage.setItem(HUE_KEY, deg);
};

const getHue = () => {
    const saved = localStorage.getItem(HUE_KEY);
    return saved ? parseInt(saved, 10) : 0;
};

document.addEventListener('DOMContentLoaded', () => {
    const hue = getHue();
    setHue(hue); // применим сохранённое

    const slider = document.getElementById('hue-slider');
    if (slider) {
        slider.value = hue;
        slider.addEventListener('change', e => setHue(e.target.value)); // change вместо input
    }

    document.querySelectorAll('.preset').forEach(btn => {
        btn.addEventListener('click', () => {
            const hue = btn.dataset.hue;
            setHue(hue);
            if (slider) slider.value = hue;
        });
    });
});
(function () {
    'use strict';

    function copy(text) {
        return navigator.clipboard.writeText(text);
    }

    function findPre(node) {
        while (node) {
            if (node.nodeType === 1) {
                if (node.matches) {
                    if (node.matches('pre.copy') || node.matches('.copy')) return node;
                } else if (node.classList && node.classList.contains('copy')) {
                    return node;
                }
            }
            node = node.parentNode;
        }
    }

    function handleEvent(e) {
        var pre = findPre(e.target);
        if (!pre) return;
        e.preventDefault();
        var code = pre.querySelector('code');
        var text = (pre.dataset && pre.dataset.full) ? pre.dataset.full : (code ? code.innerText : pre.innerText || '');
        text = (text || '').trim();
        if (!text) return;
        copy(text);
        notification('Скопировано');
    }

    document.addEventListener('click', handleEvent, true);
    document.addEventListener('touchend', handleEvent, true);

})();
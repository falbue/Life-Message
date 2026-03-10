// filePanel.js — UI для файлового обмена
import * as fileShare from './fileShare.js';
import { fileChannels } from '../calls/rtc.js';

const fileToggleBtn = document.getElementById('fileButton');
const filePanel = document.getElementById('filePanel');
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const localFileList = document.getElementById('localFileList');
const remoteFileList = document.getElementById('remoteFileList');

// Register change callback
fileShare.setOnChanged(renderFileLists);

// ── Toggle panel ──────────────────────────────────────────────────────────────
if (fileToggleBtn) {
    fileToggleBtn.addEventListener('click', () => {
        filePanel?.classList.toggle('hidden');
    });
}

// ── File input ────────────────────────────────────────────────────────────────
if (fileInput) {
    fileInput.addEventListener('change', () => {
        for (const f of fileInput.files) {
            fileShare.addLocalFile(f, fileChannels);
        }
        fileInput.value = '';
    });
}

// ── Drag and drop ─────────────────────────────────────────────────────────────
if (dropZone) {
    dropZone.addEventListener('click', () => fileInput?.click());

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        for (const f of e.dataTransfer.files) {
            fileShare.addLocalFile(f, fileChannels);
        }
    });
}

// Also accept drops on the whole page for convenience
document.addEventListener('dragover', (e) => e.preventDefault());
document.addEventListener('drop', (e) => {
    e.preventDefault();
    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;
    // Only handle if filePanel is visible
    if (filePanel && filePanel.classList.contains('hidden')) return;
    for (const f of files) {
        fileShare.addLocalFile(f, fileChannels);
    }
});

// ── Render ────────────────────────────────────────────────────────────────────

function renderFileLists() {
    renderLocal();
    renderRemote();
}

function renderLocal() {
    if (!localFileList) return;
    localFileList.innerHTML = '';
    const files = fileShare.getLocalFiles();
    if (files.length === 0) {
        localFileList.innerHTML = '<p class="file-empty">Нет файлов</p>';
        return;
    }
    for (const f of files) {
        const item = document.createElement('div');
        item.className = 'file-item';
        item.innerHTML = `
            <div class="file-info">
                <span class="file-name" title="${_esc(f.name)}">${_esc(f.name)}</span>
                <span class="file-size">${_fmtSize(f.size)}</span>
            </div>
            <button class="ghost file-remove-btn" title="Убрать файл" data-id="${f.id}">
                <i class="iconoir-xmark"></i>
            </button>
        `;
        item.querySelector('.file-remove-btn').addEventListener('click', () => {
            fileShare.removeLocalFile(f.id, fileChannels);
        });
        localFileList.appendChild(item);
    }
}

function renderRemote() {
    if (!remoteFileList) return;
    remoteFileList.innerHTML = '';
    const files = fileShare.getRemoteFiles();
    if (files.length === 0) {
        remoteFileList.innerHTML = '<p class="file-empty">Нет доступных файлов</p>';
        return;
    }
    for (const f of files) {
        const item = document.createElement('div');
        item.className = 'file-item';

        let statusHtml;
        if (f.status === 'downloading') {
            const pct = f.totalBytes > 0 ? Math.round((f.receivedBytes || 0) / f.totalBytes * 100) : 0;
            statusHtml = `<span class="file-progress">${pct}%</span>`;
        } else {
            statusHtml = `
                <button class="ghost file-download-btn" title="Скачать файл" data-id="${f.id}">
                    <i class="iconoir-download"></i>
                </button>
            `;
        }

        item.innerHTML = `
            <div class="file-info">
                <span class="file-name" title="${_esc(f.name)}">${_esc(f.name)}</span>
                <span class="file-size">${_fmtSize(f.size)}</span>
            </div>
            ${statusHtml}
        `;

        const dlBtn = item.querySelector('.file-download-btn');
        if (dlBtn) {
            dlBtn.addEventListener('click', () => {
                fileShare.requestDownload(f.id, fileChannels);
            });
        }

        remoteFileList.appendChild(item);
    }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function _esc(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function _fmtSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

// Initial render
renderFileLists();

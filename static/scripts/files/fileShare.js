// fileShare.js — файлообмен через WebRTC DataChannel (без хранения на сервере)
import socketClient from '../socket-client.js';

const socket = socketClient.socket;

// ── State ─────────────────────────────────────────────────────────────────────

// Files this user is sharing: Map<id, { id, file, name, size, mime }>
const localFiles = new Map();

// Files shared by remote peers: Map<id, { id, name, size, mime, senderId, status }>
const remoteFiles = new Map();

// Active incoming transfers: Map<transferId, { fileId, receivedBytes, totalBytes, chunks[] }>
const incomingTransfers = new Map();

// Pending chunk header for the next binary message on each DataChannel
// Map<channelId, { transferId }>  (we use channel label+remote as key, but peerId is simpler)
const pendingChunkMeta = new Map(); // peerId → transferId

let _onChanged = null;
export function setOnChanged(cb) { _onChanged = cb; }
function _notify() { if (_onChanged) _onChanged(); }

const CHUNK_SIZE = 16 * 1024;           // 16 KB — keeps buffering manageable on slow connections
const BUFFER_HIGH_WATERMARK = 512 * 1024; // 512 KB — back-pressure threshold
const BUFFER_POLL_MS = 50;               // poll interval when channel buffer is full

// ── DataChannel setup ─────────────────────────────────────────────────────────

export function setupDataChannel(channel, peerId) {
    channel.binaryType = 'arraybuffer';

    channel.onopen = () => {
        // Announce all existing local files to newly connected peer
        for (const f of localFiles.values()) {
            _sendJson(channel, { type: 'file_info', id: f.id, name: f.name, size: f.size, mime: f.mime });
        }
    };

    channel.onmessage = (ev) => _handleMessage(ev, channel, peerId);

    channel.onclose = () => {
        // Peer disconnected — cancel any in-progress transfers for this peer
        for (const [tid, t] of incomingTransfers) {
            if (t.peerId === peerId) {
                incomingTransfers.delete(tid);
            }
        }
        // Remove remote files from this peer
        handlePeerLeft(peerId);
    };
}

// ── Local file management ─────────────────────────────────────────────────────

export function addLocalFile(file, allChannels) {
    const id = crypto.randomUUID();
    localFiles.set(id, { id, file, name: file.name, size: file.size, mime: file.type || 'application/octet-stream' });

    // Announce via DataChannels (direct P2P, server sees nothing)
    for (const [peerId, ch] of Object.entries(allChannels)) {
        if (ch.readyState === 'open') {
            _sendJson(ch, { type: 'file_info', id, name: file.name, size: file.size, mime: file.type || 'application/octet-stream' });
        }
    }

    // Also announce via socket so peers without DataChannel yet learn about it
    if (socket && window.CHAT_ID) {
        socket.emit('file_announce', {
            chat_id: window.CHAT_ID,
            id,
            name: file.name,
            size: file.size,
            mime: file.type || 'application/octet-stream',
        });
    }

    _notify();
    return id;
}

export function removeLocalFile(id, allChannels) {
    if (!localFiles.has(id)) return;
    localFiles.delete(id);

    for (const [, ch] of Object.entries(allChannels)) {
        if (ch.readyState === 'open') {
            _sendJson(ch, { type: 'file_remove', id });
        }
    }

    if (socket && window.CHAT_ID) {
        socket.emit('file_remove', { chat_id: window.CHAT_ID, id });
    }

    _notify();
}

export function getLocalFiles() { return [...localFiles.values()]; }
export function getRemoteFiles() { return [...remoteFiles.values()]; }

// ── Socket-based file metadata events (from server broadcast) ─────────────────

export function handleFileAnnounced(data) {
    const { id, name, size, mime, sender_id } = data;
    if (!remoteFiles.has(id)) {
        remoteFiles.set(id, { id, name, size, mime, senderId: sender_id, status: 'available' });
        _notify();
    }
}

export function handleFileRemoved(data) {
    remoteFiles.delete(data.id);
    _notify();
}

export function handlePeerLeft(peerId) {
    let changed = false;
    for (const [id, f] of remoteFiles) {
        if (f.senderId === peerId) { remoteFiles.delete(id); changed = true; }
    }
    if (changed) _notify();
}

// ── Download request ───────────────────────────────────────────────────────────

export function requestDownload(fileId, allChannels) {
    const file = remoteFiles.get(fileId);
    if (!file) return;

    // Find the DataChannel for this sender
    const ch = allChannels[file.senderId];
    if (!ch || ch.readyState !== 'open') {
        if (typeof notification === 'function') notification('Отправитель недоступен');
        return;
    }

    const transferId = crypto.randomUUID();
    incomingTransfers.set(transferId, {
        fileId,
        peerId: file.senderId,
        receivedBytes: 0,
        totalBytes: file.size,
        chunks: [],
    });

    remoteFiles.set(fileId, { ...file, status: 'downloading', transferId });
    _notify();

    _sendJson(ch, { type: 'file_request', fileId, transferId });
}

// ── Incoming DataChannel message handler ──────────────────────────────────────

function _handleMessage(ev, channel, peerId) {
    const data = ev.data;

    if (typeof data === 'string') {
        let msg;
        try { msg = JSON.parse(data); } catch { return; }

        switch (msg.type) {
            case 'file_info':
                if (!remoteFiles.has(msg.id)) {
                    remoteFiles.set(msg.id, { id: msg.id, name: msg.name, size: msg.size, mime: msg.mime, senderId: peerId, status: 'available' });
                    _notify();
                }
                break;

            case 'file_remove':
                remoteFiles.delete(msg.id);
                _notify();
                break;

            case 'file_request':
                _handleFileRequest(msg.fileId, msg.transferId, channel);
                break;

            case 'file_chunk_header':
                // Next binary message belongs to this transfer
                pendingChunkMeta.set(peerId, msg.transferId);
                break;

            case 'file_end':
                _handleFileEnd(msg.transferId, msg.name);
                break;

            case 'file_cancel':
                _handleFileCancel(msg.transferId);
                break;
        }
    } else if (data instanceof ArrayBuffer) {
        const transferId = pendingChunkMeta.get(peerId);
        pendingChunkMeta.delete(peerId);
        if (transferId) _handleBinaryChunk(transferId, data);
    }
}

// ── Outgoing transfer (sender) ────────────────────────────────────────────────

async function _handleFileRequest(fileId, transferId, channel) {
    const entry = localFiles.get(fileId);
    if (!entry) {
        _sendJson(channel, { type: 'file_cancel', transferId });
        return;
    }

    const file = entry.file;
    let offset = 0;

    while (offset < file.size) {
        if (channel.readyState !== 'open') break;

        // Back-pressure: wait until buffer drains
        while (channel.bufferedAmount > BUFFER_HIGH_WATERMARK) {
            await new Promise(r => setTimeout(r, BUFFER_POLL_MS));
        }

        const slice = file.slice(offset, offset + CHUNK_SIZE);
        const buffer = await slice.arrayBuffer();

        // Send chunk header then chunk
        _sendJson(channel, { type: 'file_chunk_header', transferId });
        channel.send(buffer);

        offset += CHUNK_SIZE;
    }

    if (channel.readyState === 'open') {
        _sendJson(channel, { type: 'file_end', transferId, name: file.name });
    }
}

// ── Incoming transfer (receiver) ──────────────────────────────────────────────

function _handleBinaryChunk(transferId, buffer) {
    const t = incomingTransfers.get(transferId);
    if (!t) return;
    t.chunks.push(buffer);
    t.receivedBytes += buffer.byteLength;

    // Update progress in UI
    const file = remoteFiles.get(t.fileId);
    if (file) {
        remoteFiles.set(t.fileId, { ...file, status: 'downloading', receivedBytes: t.receivedBytes, totalBytes: t.totalBytes });
        _notify();
    }
}

function _handleFileEnd(transferId, name) {
    const t = incomingTransfers.get(transferId);
    if (!t) return;
    incomingTransfers.delete(transferId);

    const blob = new Blob(t.chunks);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    const file = remoteFiles.get(t.fileId);
    if (file) {
        remoteFiles.set(t.fileId, { ...file, status: 'available', receivedBytes: undefined, totalBytes: undefined, transferId: undefined });
    }
    _notify();
}

function _handleFileCancel(transferId) {
    const t = incomingTransfers.get(transferId);
    if (!t) return;
    incomingTransfers.delete(transferId);
    const file = remoteFiles.get(t.fileId);
    if (file) {
        remoteFiles.set(t.fileId, { ...file, status: 'available' });
    }
    _notify();
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function _sendJson(channel, obj) {
    try { channel.send(JSON.stringify(obj)); } catch (e) { /* channel may be closing */ }
}

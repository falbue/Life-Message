const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const rooms = new Map();

const server = http.createServer((req, res) => {
    const filePath = req.url === '/' ? '/index.html' : req.url;
    const fullPath = path.join(__dirname, 'public', filePath);

    fs.readFile(fullPath, (err, content) => {
        if (err) {
            res.writeHead(404);
            res.end('Not found');
        } else {
            const contentType = filePath.endsWith('.js') ? 'application/javascript' : (filePath.endsWith('.html') ? 'text/html' : 'text/plain');
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        }
    });
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const room_id = url.pathname.split('/')[2] || 'default';

    if (!rooms.has(room_id)) rooms.set(room_id, new Set());
    rooms.get(room_id).add(ws);

    ws.on('message', (data) => {
        try {
            const msg = JSON.parse(data);

            if (msg.type === 'join' && !ws.userData) {
                ws.userData = msg;
                const joinNotification = {
                    type: 'user_joined',
                    username: msg.username,
                    avatar: msg.avatar
                };
                rooms.get(room_id).forEach(client => {
                    if (client !== ws && client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify(joinNotification));
                    }
                });
                return;
            }

            if (msg.text !== undefined) {
                rooms.get(room_id).forEach(client => {
                    if (client !== ws && client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify(msg));
                    }
                });
            }
        } catch (e) {
        }
    });

    ws.on('close', () => {
        rooms.get(room_id).delete(ws);

        if (ws.userData) {
            const leaveNotification = {
                type: 'user_left',
                username: ws.userData.username,
                avatar: ws.userData.avatar
            };
            rooms.get(room_id).forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify(leaveNotification));
                }
            });
        }
    });
});

server.listen(PORT, '0.0.0.0');
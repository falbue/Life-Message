let _client = null;
let _currentTopic = null;

const MQTT_BROKER = 'ws://localhost:9001';

function ensureMqtt() {
    if (_client && _client.connected) return _client;

    try {
        _client = mqtt.connect(MQTT_BROKER, {
            keepalive: 60,
            reconnectPeriod: 1000,
            clientId: 'chat_' + Math.random().toString(16).substr(2, 8)
        });

        _client.on('error', (err) => console.error('MQTT error:', err));
        _client.on('offline', () => console.log('MQTT offline'));
        _client.on('connect', () => console.log('MQTT connected'));

    } catch (e) {
        console.error('MQTT init failed:', e);
        _client = null;
    }
    return _client;
}

const socketClient = {
    get socket() {
        return ensureMqtt();
    },

    emitUpdate: ({ chat_id, text, sender_id }) => {
        const client = ensureMqtt();
        if (!client?.connected) return;

        const topic = `chat/${chat_id}`;
        const payload = JSON.stringify({
            text,
            sender_id,
            timestamp: Date.now()
        });

        client.publish(topic, payload, { qos: 1 });
    },

    onReceive: (cb) => {
        const client = ensureMqtt();
        if (!client) return () => { };

        const subscribeToRoom = (chat_id) => {
            if (_currentTopic) {
                client.unsubscribe(_currentTopic);
            }
            _currentTopic = `chat/${chat_id}`;
            client.subscribe(_currentTopic, { qos: 1 }, (err) => {
                if (err) console.error('Subscribe failed:', err);
            });
        };

        const messageHandler = (topic, message) => {
            if (!topic.startsWith('chat/')) return;
            try {
                const data = JSON.parse(message.toString());
                cb(data);
            } catch (e) {
                console.error('Parse error:', e);
            }
        };

        client.on('message', messageHandler);
        return subscribeToRoom;
    },

    joinRoom: (chat_id) => {
        const client = ensureMqtt();
        if (!client?.connected) return;
        if (_currentTopic) client.unsubscribe(_currentTopic);
        _currentTopic = `chat/${chat_id}`;
        client.subscribe(_currentTopic, { qos: 1 });
    },

    disconnect: () => {
        if (_client) {
            _client.end();
            _client = null;
            _currentTopic = null;
        }
    }
};

export default socketClient;
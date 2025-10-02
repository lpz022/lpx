const mqtt = require('mqtt');
const { store } = require('./store');

function startMqttBridge({ url, username, password }) {
	const opts = {};
	if (username) opts.username = username;
	if (password) opts.password = password;

	const client = mqtt.connect(url, opts);

	client.on('connect', () => {
		console.log('[MQTT] connected:', url);
		client.subscribe('seat/+/sensor', (err) => {
			if (err) console.error('[MQTT] subscribe error:', err);
			else console.log('[MQTT] subscribed seat/+/sensor');
		});
	});

	client.on('message', (topic, payloadBuf) => {
		try {
			const parts = topic.split('/'); // seat/{seatId}/sensor
			const seatId = parts[1];
			const payload = JSON.parse(payloadBuf.toString('utf8'));
			const state = payload.state;
			if (!seatId || !state) return;
			store.updateSensor({ seatId, state });
		} catch (e) {
			console.error('[MQTT] message error:', e.message);
		}
	});

	client.on('error', (e) => console.error('[MQTT] error:', e.message));
	return client;
}

module.exports = { startMqttBridge };








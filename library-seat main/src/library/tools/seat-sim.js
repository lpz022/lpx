#!/usr/bin/env node
const mqtt = require('mqtt');
const readline = require('readline');

const BROKER = process.env.BROKER_URL || 'mqtt://8.148.84.39:1883';
const STATES = ['pressure', 'card', 'static', 'none'];

const client = mqtt.connect(BROKER);
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function ask(q) {
	return new Promise(res => rl.question(q, a => res((a || '').trim())));
}

function banner() {
	console.log('--- Seat Sensor Simulator ---');
	console.log(`Broker: ${BROKER}`);
	console.log('State options: pressure | card | static | none');
	console.log('Seat ID format: S001 ~ S999');
	console.log('Press Ctrl+C to exit.');
}

client.on('connect', async () => {
	banner();
	while (true) {
		let seatId = (await ask('Seat ID: ')).toUpperCase();
		if (!/^S\d{3}$/.test(seatId)) { console.log('格式应为 S001/S002...'); continue; }
		let state = (await ask('State: ')).toLowerCase();
		if (!STATES.includes(state)) { console.log('非法状态, 允许: pressure|card|static|none'); continue; }

		const topic = `seat/${seatId}/sensor`;
		const payload = JSON.stringify({ state, ts: Date.now() });
		client.publish(topic, payload, { qos: 0 }, err => {
			if (err) console.error('发布失败:', err.message);
			else console.log(`已发布 -> ${topic} ${payload}`);
		});
	}
});

client.on('error', e => console.error('MQTT连接失败:', e.message));









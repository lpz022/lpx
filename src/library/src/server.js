require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const { ensureDataFiles, store } = require('./store');
const { startMqttBridge } = require('./mqttBridge');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

ensureDataFiles();

// Start MQTT bridge (connects to broker and subscribes seat/+/sensor)
startMqttBridge({
	url: process.env.MQTT_URL,
	username: process.env.MQTT_USERNAME,
	password: process.env.MQTT_PASSWORD
});

// Health check
app.get('/api/health', (req, res) => {
	res.json({ ok: true, ts: Date.now() });
});

// Seats: list
app.get('/api/seats', (req, res) => {
	res.json(store.getSeats());
});

// Users: list (basic, for assignment dropdown)
app.get('/api/users', (req, res) => {
	res.json(store.getUsers());
});

// Users: create
app.post('/api/users', (req, res) => {
	const { name, studentId, credit } = req.body || {};
	try {
		const user = store.createUser({ name, studentId, credit });
		res.json(user);
	} catch (e) {
		res.status(400).json({ error: e.message });
	}
});

// Users: delete
app.delete('/api/users/:userId', (req, res) => {
	const { userId } = req.params;
	try {
		const removed = store.deleteUser({ userId });
		res.json(removed);
	} catch (e) {
		res.status(400).json({ error: e.message });
	}
});

// Users: credit +/-
app.post('/api/users/:userId/credit', (req, res) => {
	const { userId } = req.params;
	const { delta } = req.body || {};
	try {
		const updated = store.updateUserCredit({ userId, delta });
		res.json(updated);
	} catch (e) {
		res.status(400).json({ error: e.message });
	}
});

// Assign seat to user
app.post('/api/seats/:seatId/assign', (req, res) => {
	const { seatId } = req.params;
	const { userId } = req.body || {};
	try {
		const result = store.assignSeat({ seatId, userId });
		res.json(result);
	} catch (e) {
		res.status(400).json({ error: e.message });
	}
});

// Release seat
app.post('/api/seats/:seatId/release', (req, res) => {
	const { seatId } = req.params;
	try {
		const result = store.releaseSeat({ seatId });
		res.json(result);
	} catch (e) {
		res.status(400).json({ error: e.message });
	}
});

// Force change seat status
app.post('/api/seats/:seatId/status', (req, res) => {
	const { seatId } = req.params;
	const { status } = req.body || {};
	try {
		const result = store.forceSeatStatus({ seatId, status });
		res.json(result);
	} catch (e) {
		res.status(400).json({ error: e.message });
	}
});

// Records: list all
app.get('/api/records', (req, res) => {
	res.json(store.getRecords());
});

// Sensors: get all sensor states
app.get('/api/sensors', (req, res) => {
	res.json(store.getSensors());
});

// Sensors: update sensor state
app.post('/api/sensors/:seatId', (req, res) => {
	const { seatId } = req.params;
	const { state } = req.body || {};
	try {
		const result = store.updateSensor({ seatId, state });
		res.json(result);
	} catch (e) {
		res.status(400).json({ error: e.message });
	}
});

// Sensors: reset all
app.post('/api/sensors/reset', (req, res) => {
	try {
		const result = store.resetAllSensors();
		res.json(result);
	} catch (e) {
		res.status(400).json({ error: e.message });
	}
});

app.listen(PORT, '0.0.0.0', () => {
	console.log(`Server running on http://localhost:${PORT}`);
});


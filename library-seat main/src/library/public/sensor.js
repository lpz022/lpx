const api = {
	sensors: '/api/sensors',
	updateSensor: (id) => `/api/sensors/${id}`,
	resetAll: '/api/sensors/reset'
};

const els = {
	refresh: document.getElementById('refreshSensors'),
	resetAll: document.getElementById('resetAll'),
	batchAction: document.getElementById('batchAction'),
	applyBatch: document.getElementById('applyBatch'),
	controls: document.getElementById('sensorControls')
};

let sensors = {};

const sensorStates = {
	pressure: { name: '有持续变化的压力', color: 'pressure', display: '有人在座' },
	card: { name: '刷了卡但无压力', color: 'card', display: '违规使用' },
	static: { name: '压力持续不变', color: 'static', display: '违规使用' },
	none: { name: '无压力无刷卡', color: 'none', display: '空闲' }
};

async function fetchJson(url, opts = {}) {
	const res = await fetch(url, { ...opts, headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) } });
	if (!res.ok) {
		const err = await res.json().catch(() => ({ error: res.statusText }));
		throw new Error(err.error || '请求失败');
	}
	return res.json();
}

async function loadSensors() {
	try {
		sensors = await fetchJson(api.sensors);
		renderControls();
	} catch (e) {
		console.error('加载传感器数据失败:', e);
		// 如果API不存在，创建默认数据
		sensors = {};
		for (let i = 1; i <= 24; i++) {
			const seatId = `S${i.toString().padStart(3, '0')}`;
			sensors[seatId] = { state: 'none', lastUpdate: Date.now() };
		}
		renderControls();
	}
}

function renderControls() {
	els.controls.innerHTML = '';
	
	Object.keys(sensors).sort().forEach(seatId => {
		const sensor = sensors[seatId];
		const control = document.createElement('div');
		control.className = 'sensor-control';
		control.innerHTML = `
			<h4>${seatId}</h4>
			<div class="sensor-status">
				<span class="status-indicator ${sensorStates[sensor.state].color}"></span>
				<span>${sensorStates[sensor.state].name}</span>
			</div>
			<div class="sensor-status">
				<span style="color: #9aa4b2; font-size: 12px;">显示为: ${sensorStates[sensor.state].display}</span>
			</div>
			<select class="select" data-seat="${seatId}">
				<option value="pressure" ${sensor.state === 'pressure' ? 'selected' : ''}>有持续变化的压力</option>
				<option value="card" ${sensor.state === 'card' ? 'selected' : ''}>刷了卡但无压力</option>
				<option value="static" ${sensor.state === 'static' ? 'selected' : ''}>压力持续不变</option>
				<option value="none" ${sensor.state === 'none' ? 'selected' : ''}>无压力无刷卡</option>
			</select>
		`;
		els.controls.appendChild(control);
	});
}

async function updateSensor(seatId, state) {
	try {
		await fetchJson(api.updateSensor(seatId), {
			method: 'POST',
			body: JSON.stringify({ state })
		});
		sensors[seatId] = { state, lastUpdate: Date.now() };
		renderControls();
	} catch (e) {
		console.error('更新传感器失败:', e);
		// 本地更新
		sensors[seatId] = { state, lastUpdate: Date.now() };
		renderControls();
	}
}

async function resetAllSensors() {
	try {
		await fetchJson(api.resetAll, { method: 'POST' });
		await loadSensors();
	} catch (e) {
		console.error('重置传感器失败:', e);
		// 本地重置
		Object.keys(sensors).forEach(seatId => {
			sensors[seatId] = { state: 'none', lastUpdate: Date.now() };
		});
		renderControls();
	}
}

async function applyBatchAction() {
	const action = els.batchAction.value;
	if (!action) return;
	
	const promises = Object.keys(sensors).map(seatId => 
		updateSensor(seatId, action)
	);
	
	await Promise.all(promises);
	els.batchAction.value = '';
}

function handleChange(e) {
	const target = e.target;
	if (target.tagName === 'SELECT' && target.hasAttribute('data-seat')) {
		const seatId = target.getAttribute('data-seat');
		const state = target.value;
		updateSensor(seatId, state);
	}
}

function main() {
	els.refresh.addEventListener('click', loadSensors);
	els.resetAll.addEventListener('click', resetAllSensors);
	els.applyBatch.addEventListener('click', applyBatchAction);
	document.body.addEventListener('change', handleChange);
	
	loadSensors();
}

main();

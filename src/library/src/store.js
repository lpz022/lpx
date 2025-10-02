const fs = require('fs');
const path = require('path');
const { nanoid } = require('nanoid');

const dataDir = path.join(__dirname, '..', 'data');
const seatsFile = path.join(dataDir, 'seats.json');
const usersFile = path.join(dataDir, 'users.json');
const recordsFile = path.join(dataDir, 'records.json');
const sensorsFile = path.join(dataDir, 'sensors.json');

function ensureDataFiles() {
	if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
	if (!fs.existsSync(seatsFile)) fs.writeFileSync(seatsFile, '[]', 'utf8');
	if (!fs.existsSync(usersFile)) fs.writeFileSync(usersFile, '[]', 'utf8');
	if (!fs.existsSync(recordsFile)) fs.writeFileSync(recordsFile, '[]', 'utf8');
	if (!fs.existsSync(sensorsFile)) fs.writeFileSync(sensorsFile, '{}', 'utf8');

	// Seed demo data if empty
	const seats = readJson(seatsFile);
	if (seats.length === 0) {
		const demoSeats = Array.from({ length: 24 }).map((_, i) => ({
			id: `S${(i + 1).toString().padStart(3, '0')}`,
			name: `座位 ${(i + 1)}`,
			status: '空闲', // 空闲/使用中/维护中
			currentUserId: null,
			updatedAt: Date.now()
		}));
		writeJson(seatsFile, demoSeats);
	}
	const users = readJson(usersFile);
	if (users.length === 0) {
		const demoUsers = [
			{ id: 'U001', name: '张三', studentId: '20230001', credit: 100 },
			{ id: 'U002', name: '李四', studentId: '20230002', credit: 100 },
			{ id: 'U003', name: '王五', studentId: '20230003', credit: 100 }
		];
		writeJson(usersFile, demoUsers);
	}
	
	// Initialize sensors if empty
	const sensors = readJson(sensorsFile);
	if (Object.keys(sensors).length === 0) {
		const initialSensors = {};
		for (let i = 1; i <= 24; i++) {
			const seatId = `S${i.toString().padStart(3, '0')}`;
			initialSensors[seatId] = { state: 'none', lastUpdate: Date.now() };
		}
		writeJson(sensorsFile, initialSensors);
	}
}

function readJson(filePath) {
	try {
		const content = fs.readFileSync(filePath, 'utf8').trim();
		if (!content) return [];
		return JSON.parse(content);
	} catch (e) {
		console.log(`Error reading ${filePath}:`, e.message);
		return [];
	}
}
function writeJson(filePath, data) {
	fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

const store = {
	getSeats() {
		return readJson(seatsFile);
	},
	getUsers() {
		return readJson(usersFile);
	},
	getRecords() {
		return readJson(recordsFile);
	},
	createUser({ name, studentId, credit }) {
		if (!name || !studentId) throw new Error('姓名与学号必填');
		const users = readJson(usersFile);
		if (users.some(u => (u.studentId || '').toLowerCase() === String(studentId).toLowerCase())) {
			throw new Error('该学号已存在');
		}
		// 生成更简洁的ID：U + 4位数字
		const existingIds = users.map(u => u.id).filter(id => id.startsWith('U') && /^U\d{4}$/.test(id));
		const maxNum = existingIds.length > 0 ? Math.max(...existingIds.map(id => parseInt(id.substring(1)))) : 0;
		const id = `U${String(maxNum + 1).padStart(4, '0')}`;
		const user = { id, name, studentId: String(studentId), credit: Number.isFinite(credit) ? Number(credit) : 100 };
		users.push(user);
		writeJson(usersFile, users);
		return user;
	},
	deleteUser({ userId }) {
		if (!userId) throw new Error('缺少 userId');
		const users = readJson(usersFile);
		const idx = users.findIndex(u => u.id === userId);
		if (idx === -1) throw new Error('用户不存在');
		// 禁止删除正在占用座位的用户
		const seats = readJson(seatsFile);
		const occupied = seats.find(s => s.currentUserId === userId);
		if (occupied) throw new Error(`该用户当前占用座位 ${occupied.id}，请先释放座位后再删除`);
		const [removed] = users.splice(idx, 1);
		writeJson(usersFile, users);
		return removed;
	},
	updateUserCredit({ userId, delta }) {
		if (!userId) throw new Error('缺少 userId');
		const n = Number(delta);
		if (!Number.isFinite(n) || Math.abs(n) > 100000) throw new Error('非法分值');
		const users = readJson(usersFile);
		const u = users.find(x => x.id === userId);
		if (!u) throw new Error('用户不存在');
		u.credit = Number(u.credit || 0) + n;
		writeJson(usersFile, users);
		const records = readJson(recordsFile);
		records.push({ id: nanoid(8), userId, action: 'credit', delta: n, ts: Date.now() });
		writeJson(recordsFile, records);
		return u;
	},
	assignSeat({ seatId, userId }) {
		if (!seatId || !userId) throw new Error('缺少 seatId 或 userId');
		const seats = readJson(seatsFile);
		const users = readJson(usersFile);
		const seat = seats.find(s => s.id === seatId);
		if (!seat) throw new Error('座位不存在');
		const user = users.find(u => u.id === userId);
		if (!user) throw new Error('用户不存在');
		if (seat.status === '维护中') throw new Error('座位维护中，无法分配');
		if (seat.status === '使用中' && seat.currentUserId) throw new Error('座位已被占用');
		seat.status = '使用中';
		seat.currentUserId = userId;
		seat.updatedAt = Date.now();
		writeJson(seatsFile, seats);
		const records = readJson(recordsFile);
		records.push({ id: nanoid(8), seatId, userId, action: 'assign', ts: Date.now() });
		writeJson(recordsFile, records);
		return seat;
	},
	releaseSeat({ seatId }) {
		if (!seatId) throw new Error('缺少 seatId');
		const seats = readJson(seatsFile);
		const seat = seats.find(s => s.id === seatId);
		if (!seat) throw new Error('座位不存在');
		if (seat.status !== '使用中') throw new Error('座位并未使用中');
		const userId = seat.currentUserId;
		seat.status = '空闲';
		seat.currentUserId = null;
		seat.updatedAt = Date.now();
		writeJson(seatsFile, seats);
		const records = readJson(recordsFile);
		records.push({ id: nanoid(8), seatId, userId, action: 'release', ts: Date.now() });
		writeJson(recordsFile, records);
		return seat;
	},
	forceSeatStatus({ seatId, status }) {
		if (!seatId || !status) throw new Error('缺少 seatId 或 status');
		if (!['空闲', '使用中', '违规使用'].includes(status)) throw new Error('非法状态');
		const seats = readJson(seatsFile);
		const seat = seats.find(s => s.id === seatId);
		if (!seat) throw new Error('座位不存在');
		seat.status = status;
		if (status !== '使用中') seat.currentUserId = null;
		seat.updatedAt = Date.now();
		writeJson(seatsFile, seats);
		const records = readJson(recordsFile);
		records.push({ id: nanoid(8), seatId, userId: seat.currentUserId, action: 'force', to: status, ts: Date.now() });
		writeJson(recordsFile, records);
		return seat;
	},
	getSensors() {
		return readJson(sensorsFile);
	},
	updateSensor({ seatId, state }) {
		if (!seatId || !state) throw new Error('缺少 seatId 或 state');
		if (!['pressure', 'card', 'static', 'none'].includes(state)) throw new Error('非法传感器状态');
		const sensors = readJson(sensorsFile);
		sensors[seatId] = { state, lastUpdate: Date.now() };
		writeJson(sensorsFile, sensors);
		
		// 根据传感器状态更新座位状态
		this.updateSeatFromSensor(seatId, state);
		
		return sensors[seatId];
	},
	resetAllSensors() {
		const sensors = {};
		for (let i = 1; i <= 24; i++) {
			const seatId = `S${i.toString().padStart(3, '0')}`;
			sensors[seatId] = { state: 'none', lastUpdate: Date.now() };
		}
		writeJson(sensorsFile, sensors);
		
		// 重置所有座位状态
		const seats = readJson(seatsFile);
		seats.forEach(seat => {
			seat.status = '空闲';
			seat.currentUserId = null;
			seat.updatedAt = Date.now();
		});
		writeJson(seatsFile, seats);
		
		return sensors;
	},
	updateSeatFromSensor(seatId, sensorState) {
		const seats = readJson(seatsFile);
		const seat = seats.find(s => s.id === seatId);
		if (!seat) return;
		
		// 根据传感器状态映射到座位状态
		let newStatus;
		switch (sensorState) {
			case 'pressure':
				newStatus = '使用中';
				break;
			case 'card':
			case 'static':
				newStatus = '违规使用'; // 违规占座显示为违规使用
				break;
			case 'none':
			default:
				newStatus = '空闲';
				break;
		}
		
		seat.status = newStatus;
		seat.updatedAt = Date.now();
		
		// 如果传感器显示空闲，清除用户占用
		if (sensorState === 'none') {
			seat.currentUserId = null;
		}
		
		writeJson(seatsFile, seats);
	}
};

module.exports = { ensureDataFiles, store };

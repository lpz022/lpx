const api = {
	seats: '/api/seats',
	users: '/api/users',
	records: '/api/records',
	assign: (id) => `/api/seats/${id}/assign`,
	release: (id) => `/api/seats/${id}/release`,
	status: (id) => `/api/seats/${id}/status`
};

const els = {
	seatsTableBody: document.querySelector('#seatsTable tbody'),
	userSelect: document.getElementById('userSelect'),
	refreshBtn: document.getElementById('refreshBtn'),
	autoRefresh: document.getElementById('autoRefresh')
};

let state = {
	seats: [],
	users: [],
	intervalId: null
};

function fmtStatus(s) {
	if (s === '空闲') return { text: '空闲', cls: 'free' };
	if (s === '使用中') return { text: '使用中', cls: 'busy' };
	return { text: '违规使用', cls: 'maintain' };
}

async function fetchJson(url, opts = {}) {
	const res = await fetch(url, {
		...opts,
		headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) }
	});
	if (!res.ok) {
		const err = await res.json().catch(() => ({ error: res.statusText }));
		throw new Error(err.error || '请求失败');
	}
	return res.json();
}

async function loadUsers() {
	state.users = await fetchJson(api.users);
	els.userSelect.innerHTML = '';
	const def = document.createElement('option');
	def.value = '';
	def.textContent = '选择用户';
	els.userSelect.appendChild(def);
	state.users.forEach(u => {
		const opt = document.createElement('option');
		opt.value = u.id;
		opt.textContent = `${u.name}（信用 ${u.credit}）`;
		els.userSelect.appendChild(opt);
	});
}

function userNameById(id) {
	const u = state.users.find(x => x.id === id);
	return u ? u.name : '';
}

function renderSeats() {
	els.seatsTableBody.innerHTML = '';
	state.seats.forEach(seat => {
		const tr = document.createElement('tr');
		const st = fmtStatus(seat.status);
		tr.innerHTML = `
			<td>${seat.id}</td>
			<td>${seat.name}</td>
			<td><span class="status"><span class="badge ${st.cls}"></span>${st.text}</span></td>
			<td>${seat.currentUserId ? userNameById(seat.currentUserId) : '-'}</td>
			<td class="action-row">
				<button data-action="assign" data-id="${seat.id}">分配</button>
				<button data-action="release" data-id="${seat.id}">释放</button>
				<select class="select" data-action="force" data-id="${seat.id}">
					<option value="">状态...</option>
					<option value="空闲">空闲</option>
					<option value="使用中">使用中</option>
					<option value="违规使用">违规使用</option>
				</select>
			</td>
		`;
		els.seatsTableBody.appendChild(tr);
	});
}

async function loadSeats() {
	state.seats = await fetchJson(api.seats);
	renderSeats();
}

async function handleClick(e) {
	const target = e.target;
	if (!(target instanceof HTMLElement)) return;
	const action = target.getAttribute('data-action');
	if (!action) return;
	const seatId = target.getAttribute('data-id');
	try {
		if (action === 'assign') {
			const userId = els.userSelect.value;
			if (!userId) return alert('请先在上方选择一个用户');
			await fetchJson(api.assign(seatId), {
				method: 'POST',
				body: JSON.stringify({ userId })
			});
			await loadSeats();
		} else if (action === 'release') {
			await fetchJson(api.release(seatId), { method: 'POST' });
			await loadSeats();
		}
	} catch (err) {
		alert(err.message || '操作失败');
	}
}

async function handleChange(e) {
	const target = e.target;
	if (!(target instanceof HTMLSelectElement)) return;
	const action = target.getAttribute('data-action');
	if (action !== 'force') return;
	const seatId = target.getAttribute('data-id');
	const value = target.value;
	if (!value) return;
	try {
		await fetchJson(api.status(seatId), { method: 'POST', body: JSON.stringify({ status: value }) });
		await loadSeats();
	} catch (err) {
		alert(err.message || '操作失败');
	} finally {
		target.value = '';
	}
}

function setupAutoRefresh() {
	if (state.intervalId) {
		clearInterval(state.intervalId);
		state.intervalId = null;
	}
	if (els.autoRefresh.checked) {
		state.intervalId = setInterval(loadSeats, 3000);
	}
}

async function main() {
	await loadUsers();
	await loadSeats();
	els.refreshBtn.addEventListener('click', loadSeats);
	document.body.addEventListener('click', handleClick);
	document.body.addEventListener('change', handleChange);
	els.autoRefresh.addEventListener('change', setupAutoRefresh);
	setupAutoRefresh();
}

main().catch(err => {
	console.error(err);
	alert('页面初始化失败，请检查后端是否启动');
});



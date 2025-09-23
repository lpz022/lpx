const api = {
	users: '/api/users',
	createUser: '/api/users',
	deleteUser: (id) => `/api/users/${id}`,
	credit: (id) => `/api/users/${id}/credit`
};

const els = {
	refresh: document.getElementById('refreshUsers'),
	name: document.getElementById('name'),
	studentId: document.getElementById('studentId'),
	credit: document.getElementById('credit'),
	create: document.getElementById('createUser'),
	tbody: document.querySelector('#usersTable tbody')
};

let users = [];

async function fetchJson(url, opts = {}) {
	const res = await fetch(url, { ...opts, headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) } });
	if (!res.ok) {
		const err = await res.json().catch(() => ({ error: res.statusText }));
		throw new Error(err.error || '请求失败');
	}
	return res.json();
}

async function loadUsers() {
	users = await fetchJson(api.users);
	render();
}

function render() {
	els.tbody.innerHTML = '';
	users.forEach(u => {
		const tr = document.createElement('tr');
		tr.innerHTML = `
			<td>${u.id}</td>
			<td>${u.name}</td>
			<td>${u.studentId || ''}</td>
			<td>${u.credit}</td>
			<td class="action-row">
				<button data-action="credit" data-id="${u.id}" data-delta="-10">-10</button>
				<button data-action="credit" data-id="${u.id}" data-delta="-5">-5</button>
				<button data-action="credit" data-id="${u.id}" data-delta="5">+5</button>
				<button data-action="credit" data-id="${u.id}" data-delta="10">+10</button>
				<button data-action="delete" data-id="${u.id}">删除</button>
			</td>
		`;
		els.tbody.appendChild(tr);
	});
}

async function onCreate() {
	const name = els.name.value.trim();
	const studentId = els.studentId.value.trim();
	const credit = els.credit.value.trim();
	if (!name || !studentId) return alert('请输入姓名与学号');
	try {
		await fetchJson(api.createUser, { method: 'POST', body: JSON.stringify({ name, studentId, credit: credit ? Number(credit) : undefined }) });
		els.name.value = '';
		els.studentId.value = '';
		els.credit.value = '';
		await loadUsers();
	} catch (e) {
		alert(e.message || '创建失败');
	}
}

async function onClick(e) {
	const t = e.target;
	if (!(t instanceof HTMLElement)) return;
	const action = t.getAttribute('data-action');
	if (!action) return;
	const id = t.getAttribute('data-id');
	try {
		if (action === 'delete') {
			if (!confirm('确认删除该用户？若用户占用座位将无法删除。')) return;
			await fetchJson(api.deleteUser(id), { method: 'DELETE' });
			await loadUsers();
		} else if (action === 'credit') {
			const delta = Number(t.getAttribute('data-delta'));
			await fetchJson(api.credit(id), { method: 'POST', body: JSON.stringify({ delta }) });
			await loadUsers();
		}
	} catch (e) {
		alert(e.message || '操作失败');
	}
}

function main() {
	els.refresh.addEventListener('click', loadUsers);
	els.create.addEventListener('click', onCreate);
	document.body.addEventListener('click', onClick);
	loadUsers();
}

main();



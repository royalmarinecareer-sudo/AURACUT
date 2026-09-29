// AuraCut frontend: vanilla JS, one file for V1 (split into dashboard/payments/reports/settings later).
const $ = s => document.querySelector(s), app = $('#app');
const S = { me: null, shop: {}, services: [], users: [], view: 'home', form: {} };
const FOOT = '<footer><b>Designed & Developed by Sara Business Solutions</b><br>Contact: 9342477818</footer>';
const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const inr = n => '₹' + Number(n || 0).toLocaleString('en-IN');
const iso = d => new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
const isOwner = () => S.me.role === 'OWNER';
function toast(m) { const t = $('#toast'); t.textContent = m; t.hidden = false; setTimeout(() => t.hidden = true, 3000); }
async function run(fn, wait) { try { if (wait) toast(wait); return await fn(); } catch (e) { toast(e.message.startsWith('❌') || e.message.startsWith('📡') ? e.message : '❌ ' + e.message); } }
function ask(q, yes) { const m = document.createElement('div'); m.className = 'modal';
  m.innerHTML = `<div class="card stack"><b>${q}</b><button id="n">Cancel</button><button id="y" class="danger">${yes}</button></div>`;
  document.body.append(m); return new Promise(r => { m.querySelector('#n').onclick = () => { m.remove(); r(false) }; m.querySelector('#y').onclick = () => { m.remove(); r(true) }; }); }
function range(k) { const d = new Date(), t = iso(d); const back = n => iso(new Date(d - n * 864e5));
  return { today: [t, t], yesterday: [back(1), back(1)], week: [back(6), t], month: [t.slice(0, 8) + '01', t] }[k]; }

// ---------- login ----------
function loginView() {
  $('#nav').hidden = true;
  const names = [['owner', '👑 OWNER'], ...[1, 2, 3, 4, 5, 6].map(i => ['barber' + i, '👤 BARBER ' + i])];
  app.innerHTML = `<div class="center"><div style="font-size:64px">✂️</div><h1>AuraCut</h1><p class="mu">Simple Salon Management</p></div>
  <div class="grid">${names.map(n => `<button data-u="${n[0]}">${n[1]}</button>`).join('')}</div>
  <div class="stack" id="pw" hidden><input id="p" type="password" placeholder="🔐 Password" autocomplete="current-password"><button class="gold" id="go">🔐 Login</button></div>${FOOT}`;
  let u = '';
  app.querySelectorAll('[data-u]').forEach(b => b.onclick = () => { u = b.dataset.u; app.querySelectorAll('[data-u]').forEach(x => x.classList.toggle('sel', x === b)); $('#pw').hidden = false; $('#p').focus(); });
  const go = () => run(async () => { const j = await API.call('login', { username: u, password: $('#p').value }); API.setToken(j.data.token); Object.assign(S, j.data.boot); S.me = j.data.me; S.view = 'home'; draw(); }, '⏳ Logging in...');
  $('#go').onclick = go; $('#p').onkeydown = e => { if (e.key === 'Enter') go(); };
}
async function boot() {
  const j = await API.call('bootstrap'); Object.assign(S, j.data); S.me = j.data.me; S.view = 'home'; draw();
}

// ---------- shell ----------
function draw() {
  const tabs = isOwner() ? [['home', '🏠', 'Home'], ['add', '➕', 'Add'], ['pay', '💳', 'Payments'], ['rep', '📊', 'Reports'], ['set', '⚙️', 'Settings']]
    : [['home', '🏠', 'Home'], ['add', '➕', 'Add'], ['pay', '📋', 'My Work'], ['rep', '👤', 'My Income']];
  const n = $('#nav'); n.hidden = false;
  n.innerHTML = tabs.map(t => `<button data-v="${t[0]}" class="${S.view === t[0] ? 'on' : ''}"><b>${t[1]}</b>${t[2]}</button>`).join('');
  n.querySelectorAll('button').forEach(b => b.onclick = () => { S.view = b.dataset.v; draw(); });
  const head = `<div class="row"><div class="row" style="justify-content:flex-start">${S.shop.logo ? `<img class="logo" src="${esc(S.shop.logo)}" alt="">` : '<span style="font-size:40px">🏪</span>'}<div><b>${esc(S.shop.name)}</b><div class="mu">Welcome, ${esc(S.me.name)} 👋</div></div></div><button class="sm" id="out">Logout</button></div>`;
  app.innerHTML = head + '<div id="v"></div>' + FOOT;
  $('#out').onclick = async () => { if (await ask('Do you want to logout?', 'Logout')) { API.setToken(''); location.reload(); } };
  ({ home: homeView, add: addView, pay: payView, rep: repView, set: setView })[S.view]();
}

// ---------- home ----------
async function homeView() {
  const v = $('#v'); v.innerHTML = '<p class="mu">⏳ Loading report...</p>';
  const [a, b] = range('today'), h = await run(() => API.call('home'));
  if (!h) return; const d = h.data.today, m = { data: h.data.month };
  if (isOwner()) {
    const all = S.users.filter(u => u.status === 'Active').map(u => ({ name: u.name, ...(d.byBarber[u.id] || { count: 0, amount: 0 }) }));
    v.innerHTML = `<div class="grid"><div class="card"><div class="mu">📅 Today's Income</div><div class="big">${inr(d.total)}</div></div>
    <div class="card"><div class="mu">💰 This Month</div><div class="big">${inr(m.data.total)}</div></div>
    <div class="card"><div class="mu">💵 Cash</div><div class="big">${inr(d.cash)}</div></div>
    <div class="card"><div class="mu">💳 UPI</div><div class="big">${inr(d.upi)}</div></div></div>
    <div class="card">✂️ Today's Services: <b>${d.services}</b></div>
    <h2>👤 Barber Work Today</h2>${all.map(x => `<div class="card row"><b>${esc(x.name)}</b><span>✂️ ${x.count} · <b style="color:var(--gold)">${inr(x.amount)}</b></span></div>`).join('')}
    <div class="grid"><button data-g="add">➕ Add Payment</button><button data-g="qr">💳 UPI QR</button><button data-g="rep">📊 Monthly Report</button><button data-g="set">⚙️ Settings</button></div>`;
    v.querySelectorAll('[data-g]').forEach(b => b.onclick = () => { if (b.dataset.g === 'qr') return qrView(); S.view = b.dataset.g; draw(); });
  } else {
    v.innerHTML = `<h1>👋 Hello ${esc(S.me.name)}</h1><div class="grid"><div class="card"><div class="mu">✂️ Services</div><div class="big">${d.services}</div></div>
    <div class="card"><div class="mu">💰 Today's Income</div><div class="big">${inr(d.total)}</div></div></div>
    <button class="gold" data-g="add">➕ ADD SERVICE</button><h2>Today's Work</h2><div id="list"></div>`;
    v.querySelector('[data-g]').onclick = () => { S.view = 'add'; draw(); };
    const p = await run(() => API.call('getPayments', { from: a, to: b })); if (p) $('#list').innerHTML = payRows(p.data.list, false);
  }
}
function payRows(l, edit) {
  return l.length ? l.map(p => `<div class="card"><div class="row"><b>${esc(p.time)} ${esc(p.service)}</b><b style="color:var(--gold)">${inr(p.amount)}</b></div>
  <div class="mu">${p.date.split('-').reverse().join('/')} · ${esc(p.barber)} · ${p.method === 'UPI' ? '💳 UPI' : '💵 ' + esc(p.method)}</div>
  ${edit ? `<div class="row" style="margin-top:8px"><button class="sm" data-e="${p.id}">✏️ Edit</button><button class="sm danger" data-d="${p.id}">🗑️ Delete</button></div>` : ''}</div>`).join('')
    : '<p class="mu">No work yet. Tap ➕ to add the first one.</p>';
}

// ---------- add / edit payment ----------
function addView(edit) {
  const f = S.form = edit ? { ...edit } : { barberId: isOwner() ? '' : S.me.id, method: '', amount: '' };
  const svc = S.services.filter(s => s.status === 'Active');
  const v = $('#v'); v.innerHTML = `<h1>${edit ? '✏️ Edit Payment' : '➕ Add Service'}</h1><div class="stack">
  ${isOwner() ? `<select id="b"><option value="">👤 Choose barber</option>${S.users.filter(u => u.status === 'Active' || u.id === f.barberId).map(u => `<option value="${u.id}" ${u.id === f.barberId ? 'selected' : ''}>${esc(u.name)}</option>`).join('')}</select>` : ''}
  <div class="grid" id="sv">${svc.map(s => `<button data-s="${s.id}" class="${f.serviceId === s.id ? 'sel' : ''}">${esc(s.icon)} ${esc(s.name)}</button>`).join('')}<button data-s="other" class="${f.serviceId === 'other' ? 'sel' : ''}">➕ Other</button></div>
  <input id="on" placeholder="Service name" ${f.serviceId === 'other' ? '' : 'hidden'} value="${f.serviceId === 'other' ? esc(f.serviceName) : ''}">
  <input id="am" type="number" inputmode="numeric" placeholder="₹ Amount" value="${esc(f.amount)}" style="font-size:28px">
  <div class="grid" id="pm"><button data-m="Cash" class="${f.method === 'Cash' ? 'sel' : ''}">💵 CASH</button><button data-m="UPI" class="${f.method === 'UPI' ? 'sel' : ''}">💳 UPI</button></div>
  <div id="qr"></div><button class="gold" id="sv2">✅ SAVE PAYMENT</button></div>`;
  if (isOwner()) $('#b').onchange = e => f.barberId = e.target.value;
  v.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { const s = svc.find(x => x.id === b.dataset.s); f.serviceId = b.dataset.s; f.serviceName = s ? s.name : '';
    if (s) $('#am').value = s.price; $('#on').hidden = !!s; v.querySelectorAll('[data-s]').forEach(x => x.classList.toggle('sel', x === b)); });
  v.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { f.method = b.dataset.m; v.querySelectorAll('[data-m]').forEach(x => x.classList.toggle('sel', x === b));
    $('#qr').innerHTML = f.method === 'UPI' ? (S.shop.qr ? `<div class="center card"><b>Scan & Pay</b><br><img class="qr" src="${esc(S.shop.qr)}" alt="UPI QR"><p class="mu">Save only after the money arrives.</p></div>` : '<p class="mu">Owner has not added a UPI QR yet.</p>') : ''; });
  $('#sv2').onclick = async () => {
    if (f.serviceId === 'other') f.serviceName = $('#on').value.trim();
    if (!f.serviceId || !f.serviceName) return toast('Choose a service'); if (!(+$('#am').value > 0)) return toast('Enter the amount'); if (!f.method) return toast('Choose Cash or UPI');
    if (isOwner() && !f.barberId) return toast('Choose a barber');
    const ok = await run(() => API.call(edit ? 'updatePayment' : 'savePayment', { id: f.id, barberId: f.barberId, serviceId: f.serviceId, serviceName: f.serviceName, amount: +$('#am').value, method: f.method }), '⏳ Saving...');
    if (ok) { toast('✅ Payment saved!'); S.view = edit ? 'pay' : 'home'; draw(); } };
}

// ---------- payment history ----------
async function payView() {
  const v = $('#v'), f = S.pf = S.pf || { p: 'today', barberId: '', method: '' };
  v.innerHTML = `<h1>${isOwner() ? '💳 Payment History' : '📋 My Work'}</h1><div class="stack"><select id="p">${[['today', 'Today'], ['yesterday', 'Yesterday'], ['week', 'This Week'], ['month', 'This Month']].map(x => `<option value="${x[0]}" ${f.p === x[0] ? 'selected' : ''}>${x[1]}</option>`).join('')}</select>
  ${isOwner() ? `<select id="b"><option value="">All barbers</option>${S.users.map(u => `<option value="${u.id}" ${f.barberId === u.id ? 'selected' : ''}>${esc(u.name)}</option>`).join('')}</select>
  <select id="m"><option value="">Cash + UPI</option><option ${f.method === 'Cash' ? 'selected' : ''}>Cash</option><option ${f.method === 'UPI' ? 'selected' : ''}>UPI</option></select>` : ''}</div><div id="l">⏳ Loading...</div>`;
  ['p', 'b', 'm'].forEach(k => { const e = $('#' + k); if (e) e.onchange = () => { f[k === 'p' ? 'p' : k === 'b' ? 'barberId' : 'method'] = e.value; payView(); }; });
  const [a, b] = range(f.p), r = await run(() => API.call('getPayments', { from: a, to: b, barberId: f.barberId, method: f.method })); if (!r) return;
  $('#l').innerHTML = payRows(r.data.list, isOwner());
  $('#l').querySelectorAll('[data-e]').forEach(x => x.onclick = () => { S.view = 'add'; draw(); addView(r.data.list.find(p => p.id === x.dataset.e)); });
  $('#l').querySelectorAll('[data-d]').forEach(x => x.onclick = async () => { if (await ask('Delete this payment?', 'Delete')) { await run(() => API.call('deletePayment', { id: x.dataset.d })); payView(); } });
}

// ---------- reports ----------
async function repView() {
  const v = $('#v'), k = S.rk = S.rk || 'month';
  v.innerHTML = `<h1>${isOwner() ? '📊 Income Report' : '👤 My Income'}</h1><select id="p">${[['today', 'Today'], ['week', 'This Week'], ['month', 'This Month']].map(x => `<option value="${x[0]}" ${k === x[0] ? 'selected' : ''}>${x[1]}</option>`).join('')}</select><div id="r">⏳ Loading report...</div>`;
  $('#p').onchange = e => { S.rk = e.target.value; repView(); };
  const [a, b] = range(k), j = await run(() => API.call('report', { from: a, to: b })); if (!j) return; const d = j.data;
  const bars = (o, key) => { const arr = Object.entries(o), mx = Math.max(1, ...arr.map(x => key(x[1]))); return arr.sort((x, y) => key(y[1]) - key(x[1])).map(([n, x]) => `<div class="card"><div class="row"><b>${esc(x.name || n)}</b><span>${x.count ?? ''} ${x.count != null ? '· ' : ''}${inr(key(x))}</span></div><div class="bar" style="width:${key(x) / mx * 100}%"></div></div>`).join('') || '<p class="mu">Nothing yet.</p>'; };
  $('#r').innerHTML = `<div class="card"><div class="mu">💰 Total Income</div><div class="big">${inr(d.total)}</div><div class="row"><span>💵 ${inr(d.cash)}</span><span>💳 ${inr(d.upi)}</span><span>✂️ ${d.services}</span></div></div>
  ${isOwner() ? '<h2>👥 Barber Work</h2>' + bars(d.byBarber, x => x.amount) : ''}<h2>✂️ Services</h2>${bars(d.byService, x => x.amount)}
  <h2>📈 Daily Income</h2>${bars(Object.fromEntries(Object.entries(d.byDay).map(([n, x]) => [n.split('-').reverse().join('/'), { amount: x }])), x => x.amount)}`;
}

// ---------- UPI QR (owner) ----------
function qrView() { $('#v').innerHTML = `<h1>💳 UPI QR</h1><div class="card center">${S.shop.qr ? `<img class="qr" src="${esc(S.shop.qr)}" alt="UPI QR">` : '<p>No QR uploaded yet. Go to ⚙️ Settings.</p>'}</div>`; }

// ---------- settings (owner) ----------
function setView() {
  const sh = S.shop, v = $('#v');
  v.innerHTML = `<h1>⚙️ Settings</h1><h2>🏪 Shop</h2><div class="stack"><input id="sn" placeholder="Shop name" value="${esc(sh.name)}"><input id="sp" placeholder="Phone" value="${esc(sh.phone)}"><input id="sa" placeholder="Address" value="${esc(sh.address)}">
  <button class="gold" id="ss">Save Settings</button><label>🏪 Shop logo<input type="file" accept="image/*" data-up="logo"></label><label>💳 UPI QR<input type="file" accept="image/*" data-up="qr"></label></div>
  <h2>👤 Barbers</h2>${S.users.map(u => `<div class="card stack" data-u="${u.id}"><input value="${esc(u.name)}" data-f="name"><input type="password" placeholder="New password (optional)" data-f="password">
  <div class="row"><button class="sm" data-a="save">Save</button><button class="sm" data-a="tog">${u.status === 'Active' ? '⛔ Deactivate' : '✅ Activate'}</button></div></div>`).join('')}
  <h2>✂️ Services</h2>${S.services.map(s => svcRow(s)).join('')}${svcRow({ id: '', icon: '✂️', name: '', price: '', status: 'Active' })}`;
  $('#ss').onclick = async () => { if (await run(() => API.call('saveSettings', { name: $('#sn').value, phone: $('#sp').value, address: $('#sa').value }), '⏳ Saving...')) { toast('✅ Saved!'); boot(); } };
  v.querySelectorAll('[data-up]').forEach(i => i.onchange = () => { const file = i.files[0]; if (!file) return; const rd = new FileReader();
    rd.onload = async () => { if (await run(() => API.call('upload', { kind: i.dataset.up, mime: file.type, data: rd.result.split(',')[1] }), '⏳ Uploading...')) { toast('✅ Uploaded!'); S.view = 'set'; await boot(); S.view = 'set'; draw(); } }; rd.readAsDataURL(file); });
  v.querySelectorAll('[data-u]').forEach(c => c.querySelectorAll('[data-a]').forEach(b => b.onclick = async () => { const id = c.dataset.u, u = S.users.find(x => x.id === id);
    const body = { id, name: c.querySelector('[data-f=name]').value, password: c.querySelector('[data-f=password]').value }; if (b.dataset.a === 'tog') body.status = u.status === 'Active' ? 'Inactive' : 'Active';
    if (await run(() => API.call('updateUser', body), '⏳ Saving...')) { toast('✅ Saved!'); await boot(); S.view = 'set'; draw(); } }));
  v.querySelectorAll('[data-sv]').forEach(c => c.querySelector('button').onclick = async () => { const g = k => c.querySelector(`[data-k=${k}]`);
    if (await run(() => API.call('saveService', { id: c.dataset.sv, icon: g('icon').value, name: g('name').value, price: g('price').value, status: g('status').value }), '⏳ Saving...')) { toast('✅ Saved!'); await boot(); S.view = 'set'; draw(); } });
}
const svcRow = s => `<div class="card stack" data-sv="${s.id}"><div class="grid"><input data-k="icon" value="${esc(s.icon)}" style="text-align:center"><input data-k="price" type="number" placeholder="₹ Price" value="${esc(s.price)}"></div>
  <input data-k="name" placeholder="${s.id ? '' : '➕ New service name'}" value="${esc(s.name)}"><select data-k="status"><option ${s.status === 'Active' ? 'selected' : ''}>Active</option><option ${s.status !== 'Active' ? 'selected' : ''}>Disabled</option></select><button class="sm">Save</button></div>`;

// ---------- start ----------
(API.token ? boot().catch(loginView) : loginView());

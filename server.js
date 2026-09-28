// CareLoop prototype server. DEMO DATA ONLY. In-memory storage.
const express = require('express'), crypto = require('crypto');
const app = express();
app.use(express.json({ limit: '100kb' }));
const path = require('path');
app.use(express.static(path.join(__dirname, 'public')));

const DAY = 864e5, iso = t => new Date(t).toISOString().slice(0, 10), today = () => iso(Date.now());
const ago = d => iso(Date.now() - d * DAY);
let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const pick = a => a[Math.floor(rnd() * a.length)], ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const hash = p => crypto.createHash('sha256').update('careloop:' + p).digest('hex'); // demo only; use bcrypt in production
const esc = s => String(s == null ? '' : s).replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c])).slice(0, 500);

const PHCS = [{ id: 'PHC-1', name: 'Example PHC – North' }, { id: 'PHC-2', name: 'Example PHC – East' }, { id: 'PHC-3', name: 'Example PHC – South' }];
const VILLAGES = ['Village A', 'Village B', 'Village C', 'Village D', 'Village E', 'Village F', 'Village G', 'Village H', 'Village I', 'Village J'];
const ANAMES = ['Lakshmi Devi', 'Sunita Rao', 'Meena Kumari', 'Geetha N', 'Rukmini B', 'Savitha M', 'Padma S', 'Kavitha R', 'Shanta G', 'Bhagya L'];
const USERS = [];
ANAMES.forEach((n, i) => USERS.push({ id: 'ASHA' + String(i + 1).padStart(3, '0'), name: n, role: 'asha', phc: PHCS[i % 3].id, village: VILLAGES[i], pw: hash('demo1234') }));
USERS.push({ id: 'PHC001', name: 'Dr. Anand (Demo)', role: 'phc', phc: 'PHC-1', pw: hash('demo1234') });
USERS.push({ id: 'PHC002', name: 'Nurse Farida (Demo)', role: 'phc', phc: 'PHC-2', pw: hash('demo1234') });
USERS.push({ id: 'PHC003', name: 'Dr. Kiran (Demo)', role: 'phc', phc: 'PHC-3', pw: hash('demo1234') });

const FIRST = ['Ravi', 'Anil', 'Suresh', 'Mohan', 'Ramesh', 'Prakash', 'Basavaraj', 'Manjunath', 'Shivamma', 'Kamala', 'Rekha', 'Nagaraj', 'Fatima', 'Salma', 'Girija', 'Yellamma', 'Hanumanth', 'Chandru', 'Latha', 'Devaraj'];
const LAST = ['Kumar', 'Naik', 'Gowda', 'Reddy', 'Patil', 'Shetty', 'Begum', 'Hegde', 'Rao', 'Swamy'];
const REASONS = ['Forgot medicine', 'Medicine unavailable', 'Cost/access issue', 'Side effects reported', 'Feels better / believes medicine is no longer needed', 'Difficulty reaching PHC/pharmacy', 'Does not understand medication instructions', 'Missed appointment', 'Migrated temporarily', 'Family/support issue', 'Other'];
const DXMAP = { HTN: 'Hypertension', DM: 'Diabetes', BOTH: 'Hypertension + Diabetes' };
let nextId = 4821;
const patients = [], audit = [], notes = [], seen = new Set();

function ev(p, type, by, note, date) { p.timeline.push({ date: date || today(), type, by, note }); }
function log(u, action, pid, prev, next) { audit.push({ t: new Date().toISOString(), user: u.name, phc: u.phc, pid, action, prev: prev == null ? '' : String(prev), next: next == null ? '' : String(next) }); }
function notify(phc, ash, level, text, pid) { notes.unshift({ id: crypto.randomUUID(), t: new Date().toISOString(), phc, asha: ash, level, text, pid, read: false }); }

function mk(asha, i) {
  const cond = pick(['HTN', 'DM', 'BOTH', 'HTN']), dx = rnd() < 0.75;
  const p = { id: 'CL-KA-' + String(nextId++).padStart(6, '0'), name: pick(FIRST) + ' ' + pick(LAST), age: ri(35, 78), gender: pick(['Male', 'Female']), phone: '9' + String(ri(100000000, 999999999)), village: asha.village, address: 'H.No ' + ri(1, 200), asha: asha.id, phc: asha.phc, cond, diagnosis: dx ? DXMAP[cond] : null, needsReview: !dx, bp: [], glucose: [], adherence: 'Taking regularly', reason: null, med: 'Available', lastVisit: ago(ri(1, 30)), nextFollowUp: iso(Date.now() + ri(-3, 25) * DAY), followUps: [], referral: null, plan: null, timeline: [], visits: 0 };
  const base = ri(118, 160);
  for (let k = 0; k < 5; k++) if (cond !== 'DM') p.bp.push({ date: ago(60 - k * 12), sys: base + ri(-6, 8) + k * (base > 145 ? 2 : 0), dia: ri(74, 96), by: asha.name });
  for (let k = 0; k < 5; k++) if (cond !== 'HTN') p.glucose.push({ date: ago(60 - k * 12), value: ri(95, 210), context: pick(['Fasting', 'Random', 'Post-meal']), by: asha.name });
  const r = rnd();
  if (r < 0.15) { p.med = 'Not available'; p.adherence = 'Medicine unavailable'; p.reason = 'Medicine unavailable'; }
  else if (r < 0.28) p.med = 'Running low';
  else if (r < 0.4) { p.adherence = pick(['Missed occasionally', 'Missed frequently']); p.reason = pick(REASONS.slice(0, 8)); }
  if (rnd() < 0.08) p.lastVisit = ago(ri(47, 75)); // silent dropout demo
  if (rnd() < 0.07) p.nextFollowUp = ago(ri(3, 40));
  if (!dx && rnd() < 0.5) p.referral = { status: pick(['Sent', 'Acknowledged']), reason: 'Screening reading needs clinical assessment', date: ago(ri(1, 8)), notes: '' };
  ev(p, 'ASHA screening completed', asha.name, 'Initial screening recorded', ago(70)); ev(p, 'Patient registered', asha.name, 'Registered in ' + p.village, ago(70));
  if (dx) { ev(p, 'Diagnosis confirmed by PHC', 'PHC clinician', p.diagnosis, ago(60)); p.plan = { prescription: 'Per PHC (demo entry)', nextReview: iso(Date.now() + 30 * DAY), instructions: 'Continue monthly monitoring visits.', by: 'PHC clinician', date: ago(60) }; }
  return p;
}
USERS.filter(u => u.role === 'asha').forEach((a, ai) => { const n = ai === 0 ? 84 : 4; for (let i = 0; i < n; i++) patients.push(mk(a, i)); });
notify('PHC-1', 'ASHA001', 'high', 'Follow-up overdue', patients[0].id); notify('PHC-1', 'ASHA001', 'ok', 'Referral reviewed', patients[1].id);

// ---------- derived care-coordination status (NOT a diagnosis) ----------
function dsince(d) { return d ? Math.floor((Date.now() - new Date(d)) / DAY) : 999; }
function status(p) {
  const r = []; let lvl = 'STABLE'; const t = today();
  const up = (l, m) => { r.push(m); if (l === 'HIGH') lvl = 'HIGH'; else if (lvl === 'STABLE') lvl = 'ATTENTION'; };
  if (p.needsReview && !p.diagnosis) up('HIGH', 'PHC review required: screening information indicates further clinical assessment may be appropriate.');
  if (p.referral && p.referral.status !== 'Completed') up('HIGH', 'Referral awaiting PHC review (' + p.referral.status + ').');
  if (p.nextFollowUp && p.nextFollowUp < t) up('HIGH', 'Follow-up overdue since ' + p.nextFollowUp + '.');
  if (p.med === 'Not available') up('HIGH', 'Medicine unavailable.');
  if (p.adherence === 'Stopped') up('HIGH', 'Medication interruption reported.');
  const last = [...p.bp].pop(), prev = p.bp.slice(-3); if (prev.length === 3 && prev.every(x => x.sys >= 140 || x.dia >= 90)) up('HIGH', 'Repeated readings crossed the configured PHC threshold — clinical review recommended.');
  if (p.nextFollowUp && p.nextFollowUp >= t && dsince(p.nextFollowUp) >= -3) up('ATTENTION', 'Follow-up approaching.');
  if (p.med === 'Running low') up('ATTENTION', 'Medicine running low.');
  if (['Missed occasionally', 'Missed frequently'].includes(p.adherence)) up('ATTENTION', 'Care gap identified: ' + (p.reason || 'adherence problem') + '.');
  if (dsince(p.lastVisit) > 30 && lvl !== 'HIGH') up('ATTENTION', 'Monitoring overdue.');
  if (!r.length) r.push('Recent monitoring; no outstanding care-gap task.');
  const gapDays = dsince(p.lastVisit), gap = gapDays > 45 ? 'No recorded follow-up for ' + gapDays + ' days. Suggested operational action: contact patient and verify whether PHC follow-up is pending.' : null;
  return { level: lvl, reasons: r, gap };
}
const cardOf = p => { const s = status(p), b = p.bp[p.bp.length - 1], g = p.glucose[p.glucose.length - 1]; return { id: p.id, name: p.name, age: p.age, gender: p.gender, phone: p.phone.slice(0, 2) + '******' + p.phone.slice(-2), village: p.village, cond: p.cond, diagnosis: p.diagnosis, bp: b ? b.sys + '/' + b.dia : '—', glucose: g ? g.value + ' mg/dL' : '—', adherence: p.adherence, reason: p.reason, med: p.med, lastVisit: p.lastVisit, nextFollowUp: p.nextFollowUp, referral: p.referral && p.referral.status, ...s }; };

// ---------- auth ----------
const sessions = new Map(); const TTL = 30 * 60 * 1000;
app.post('/api/login', (req, res) => {
  const { id, password, role } = req.body || {}; const u = USERS.find(x => x.id === String(id || '').trim().toUpperCase());
  if (!u || u.pw !== hash(String(password || '')) || u.role !== role) return res.status(401).json({ error: 'Invalid ID, password or role.' });
  const token = crypto.randomBytes(24).toString('hex'); sessions.set(token, { uid: u.id, exp: Date.now() + TTL });
  res.json({ token, user: pub(u) });
});
const pub = u => ({ id: u.id, name: u.name, role: u.role, phc: u.phc, phcName: PHCS.find(p => p.id === u.phc).name, village: u.village });
function auth(req, res, next) {
  const s = sessions.get((req.headers.authorization || '').replace('Bearer ', ''));
  if (!s || s.exp < Date.now()) return res.status(401).json({ error: 'Your session has expired. Please log in again.' });
  s.exp = Date.now() + TTL; req.u = USERS.find(x => x.id === s.uid); next();
}
const only = role => (req, res, next) => req.u.role === role ? next() : res.status(403).json({ error: "You don't have permission to do this." });
const canSee = (u, p) => u.role === 'asha' ? p.asha === u.id : p.phc === u.phc;
const scope = u => patients.filter(p => canSee(u, p));
function load(req, res, next) { const p = patients.find(x => x.id === req.params.id); if (!p || !canSee(req.u, p)) return res.status(403).json({ error: "You don't have permission to access this patient." }); req.p = p; next(); }
app.use('/api', (req, res, next) => req.path === '/login' ? next() : auth(req, res, next));
app.get('/api/me', (req, res) => res.json(pub(req.u)));

// ---------- validation ----------
function vBP(s, d) { s = +s; d = +d; if (!(s >= 60 && s <= 260 && d >= 30 && d <= 160 && s > d)) return 'Please enter a valid blood pressure reading.'; }
function vGlu(v) { v = +v; if (!(v >= 30 && v <= 600)) return 'Please enter a valid glucose value (mg/dL).'; }
const warnBP = (s, d) => (s >= 140 || d >= 90) ? '⚠️ This reading may require clinical review according to PHC protocol.' : null;
const warnGlu = v => v >= 200 ? '⚠️ This reading may require clinical review according to PHC protocol.' : null;

// ---------- patients ----------
const F = { HTN: p => ['HTN', 'BOTH'].includes(p.cond), DM: p => ['DM', 'BOTH'].includes(p.cond), BOTH: p => p.cond === 'BOTH', high: p => status(p).level === 'HIGH', due: p => p.nextFollowUp && p.nextFollowUp <= today(), med: p => ['Not available', 'Running low'].includes(p.med), referral: p => p.referral && p.referral.status !== 'Completed', monitoring: p => dsince(p.lastVisit) > 30 };
app.get('/api/patients', (req, res) => {
  const q = String(req.query.q || '').toLowerCase(), f = F[req.query.filter];
  const order = { HIGH: 0, ATTENTION: 1, STABLE: 2 };
  res.json(scope(req.u).filter(p => (!q || p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q) || p.phone.includes(q)) && (!f || f(p))).map(cardOf).sort((a, b) => order[a.level] - order[b.level]).slice(0, 200));
});
app.get('/api/patients/:id', load, (req, res) => {
  const p = req.p; res.json({ ...cardOf(p), phoneFull: p.phone, address: p.address, ashaName: USERS.find(u => u.id === p.asha).name, phcName: PHCS.find(x => x.id === p.phc).name, bpHist: p.bp, gluHist: p.glucose, plan: p.plan, timeline: p.timeline, referralFull: p.referral, audit: audit.filter(a => a.pid === p.id).slice(-15).reverse() });
});
app.post('/api/patients', only('asha'), (req, res) => {
  const b = req.body || {}, name = esc(b.name).trim(), age = +b.age;
  if (name.length < 2 || !(age >= 1 && age <= 110) || !/^[6-9]\d{9}$/.test(String(b.phone || ''))) return res.status(400).json({ error: 'Please check name, age and a valid 10-digit mobile number.' });
  const hasBP = b.sys && b.dia; if (hasBP) { const e = vBP(b.sys, b.dia); if (e) return res.status(400).json({ error: e }); }
  if (b.glucose) { const e = vGlu(b.glucose); if (e) return res.status(400).json({ error: e }); }
  if (b.clientId && seen.has(b.clientId)) return res.json({ duplicate: true });
  if (b.clientId) seen.add(b.clientId);
  const u = req.u, elevated = (hasBP && (+b.sys >= 140 || +b.dia >= 90)) || (b.glucose && +b.glucose >= 200) || b.knownHTN || b.knownDM;
  const p = { id: 'CL-KA-' + String(nextId++).padStart(6, '0'), name, age, gender: esc(b.gender || 'Not stated'), phone: b.phone, village: u.village, address: esc(b.address), asha: u.id, phc: u.phc, cond: b.knownHTN && b.knownDM ? 'BOTH' : b.knownDM ? 'DM' : 'HTN', diagnosis: null, needsReview: !!elevated, bp: hasBP ? [{ date: today(), sys: +b.sys, dia: +b.dia, by: u.name }] : [], glucose: b.glucose ? [{ date: today(), value: +b.glucose, context: esc(b.context || 'Random'), by: u.name }] : [], adherence: 'Unknown', reason: null, med: 'Unknown', lastVisit: today(), nextFollowUp: null, followUps: [], referral: null, plan: null, timeline: [], visits: 1 };
  ev(p, 'ASHA screening completed', u.name, esc(b.notes) || 'Screening recorded'); ev(p, 'Patient registered', u.name, 'Registered in ' + u.village);
  patients.push(p); log(u, 'Registered patient', p.id, '', p.name);
  res.json({ id: p.id, name: p.name, ...status(p), needsReview: p.needsReview });
});
app.post('/api/patients/:id/visit', only('asha'), load, (req, res) => {
  const b = req.body || {}, p = req.p, u = req.u, w = [];
  if (b.clientId && seen.has(b.clientId)) return res.json({ duplicate: true });
  if (b.sys || b.dia) { const e = vBP(b.sys, b.dia); if (e) return res.status(400).json({ error: e }); }
  if (b.glucose) { const e = vGlu(b.glucose); if (e) return res.status(400).json({ error: e }); }
  if (b.followUp && !/^\d{4}-\d{2}-\d{2}$/.test(b.followDate || '')) return res.status(400).json({ error: 'Please choose a follow-up date.' });
  if (b.clientId) seen.add(b.clientId);
  if (b.sys) { const prev = p.bp.length ? p.bp[p.bp.length - 1].sys + '/' + p.bp[p.bp.length - 1].dia : 'none'; p.bp.push({ date: today(), sys: +b.sys, dia: +b.dia, by: u.name }); log(u, 'Updated BP', p.id, prev, b.sys + '/' + b.dia); ev(p, 'BP recorded', u.name, b.sys + '/' + b.dia); const m = warnBP(+b.sys, +b.dia); if (m) w.push(m); }
  if (b.glucose) { p.glucose.push({ date: today(), value: +b.glucose, context: esc(b.context || 'Random'), by: u.name }); log(u, 'Recorded glucose', p.id, '', b.glucose); ev(p, 'Glucose recorded', u.name, b.glucose + ' mg/dL (' + esc(b.context) + ')'); const m = warnGlu(+b.glucose); if (m) w.push(m); }
  if (b.adherence) { log(u, 'Adherence', p.id, p.adherence, b.adherence); p.adherence = esc(b.adherence); p.reason = b.reason ? esc(b.reason) : null; ev(p, 'Adherence recorded', u.name, p.adherence + (p.reason ? ' — Care gap identified: ' + p.reason : '')); }
  if (b.med) { log(u, 'Medicine availability', p.id, p.med, b.med); p.med = esc(b.med); ev(p, 'Medicine availability', u.name, p.med); if (p.med === 'Not available') notify(p.phc, null, 'warn', 'Medicine availability issue', p.id); }
  if (b.followUp) { p.nextFollowUp = b.followDate; p.followUps.push({ date: b.followDate, purpose: esc(b.purpose), status: 'Open' }); ev(p, 'Follow-up task created', u.name, (esc(b.purpose) || 'Follow-up') + ' due ' + b.followDate); log(u, 'Follow-up date', p.id, '', b.followDate); }
  if (b.phcReview) { p.referral = { status: 'Sent', reason: esc(b.reviewReason || 'ASHA requested PHC review'), date: today(), notes: esc(b.reviewNote) }; ev(p, 'PHC review requested', u.name, p.referral.reason); notify(p.phc, null, 'warn', 'New PHC review request', p.id); }
  p.lastVisit = today(); p.visits++; ev(p, 'ASHA visit recorded', u.name, esc(b.notes) || 'Visit completed');
  res.json({ warnings: w, ...cardOf(p) });
});
app.post('/api/patients/:id/referral', only('asha'), load, (req, res) => {
  const p = req.p; p.referral = { status: 'Sent', reason: esc(req.body.reason) || 'PHC review requested', date: today(), notes: esc(req.body.notes) };
  ev(p, 'PHC review requested', req.u.name, p.referral.reason); log(req.u, 'Referral created', p.id, '', p.referral.reason); notify(p.phc, null, 'warn', 'New PHC review request', p.id); res.json({ ok: true });
});
app.post('/api/patients/:id/clinical', only('phc'), load, (req, res) => {
  const b = req.body || {}, p = req.p, u = req.u;
  if (!['Not confirmed', 'Hypertension', 'Diabetes', 'Hypertension + Diabetes', 'Other'].includes(b.diagnosis)) return res.status(400).json({ error: 'Please select a diagnosis status.' });
  if (b.nextReview && !/^\d{4}-\d{2}-\d{2}$/.test(b.nextReview)) return res.status(400).json({ error: 'Please choose a valid review date.' });
  log(u, 'Clinical assessment', p.id, p.diagnosis || 'Not confirmed', b.diagnosis);
  p.diagnosis = b.diagnosis === 'Not confirmed' ? null : b.diagnosis; p.needsReview = b.diagnosis === 'Not confirmed';
  p.plan = { prescription: esc(b.prescription), nextReview: b.nextReview || null, instructions: esc(b.instructions), by: u.name, date: today() };
  if (b.nextReview) { p.nextFollowUp = b.nextReview; p.followUps.push({ date: b.nextReview, purpose: 'Clinical review', status: 'Open' }); }
  if (p.referral) p.referral.status = 'Completed';
  ev(p, 'PHC assessment completed', u.name, 'Diagnosis: ' + b.diagnosis); if (p.diagnosis) ev(p, p.diagnosis + ' confirmed by PHC', u.name, ''); ev(p, 'Treatment plan added by PHC', u.name, 'Plan saved'); if (b.nextReview) ev(p, 'Clinical review due', u.name, b.nextReview);
  notify(p.phc, p.asha, 'ok', 'Referral reviewed — new follow-up task', p.id); res.json({ ok: true });
});
app.post('/api/patients/:id/remind', only('asha'), load, (req, res) => {
  const { method, lang } = req.body || {}; if (!['Phone call', 'SMS', 'Voice reminder'].includes(method)) return res.status(400).json({ error: 'Choose a contact method.' });
  ev(req.p, 'Patient contacted', req.u.name, method + ' (' + esc(lang) + ') — simulated'); log(req.u, 'Reminder sent', req.p.id, '', method); notify(req.p.phc, req.u.id, 'ok', 'Reminder sent (simulated)', req.p.id); res.json({ ok: true });
});

// ---------- dashboards ----------
app.get('/api/dashboard', (req, res) => {
  const list = scope(req.u), st = list.map(status), t = today();
  const stats = { total: list.length, due: list.filter(p => p.nextFollowUp && p.nextFollowUp <= t).length, attention: st.filter(s => s.level !== 'STABLE').length, stable: st.filter(s => s.level === 'STABLE').length, medIssues: list.filter(F.med).length, referrals: list.filter(F.referral).length, overdue: list.filter(p => p.nextFollowUp && p.nextFollowUp < t).length, gaps: st.filter(s => s.gap).length, review: list.filter(p => p.needsReview && !p.diagnosis).length, notMedAvail: list.filter(p => p.med === 'Not available').length, low: list.filter(p => p.med === 'Running low').length };
  const out = { stats };
  if (req.u.role === 'phc') {
    const rc = {}; list.forEach(p => p.reason && (rc[p.reason] = (rc[p.reason] || 0) + 1)); const tot = Object.values(rc).reduce((a, b) => a + b, 0) || 1;
    out.reasons = Object.entries(rc).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, Math.round(v * 100 / tot)]);
    out.workload = USERS.filter(u => u.role === 'asha' && u.phc === req.u.phc).map(a => { const l = list.filter(p => p.asha === a.id); return { name: a.name, village: a.village, patients: l.length, due: l.filter(F.due).length, overdue: l.filter(p => p.nextFollowUp && p.nextFollowUp < t).length, referrals: l.filter(F.referral).length, visits: l.filter(p => dsince(p.lastVisit) <= 7).length }; });
    out.areas = out.workload.map(w => ({ village: w.village, gaps: list.filter(p => p.village === w.village && status(p).gap).length, patients: w.patients, overdue: w.overdue }));
    out.overview = { controlled: Math.round(st.filter(s => s.level === 'STABLE').length * 100 / (list.length || 1)), monitoring: Math.round(st.filter(s => s.level === 'ATTENTION').length * 100 / (list.length || 1)), review: Math.round(st.filter(s => s.level === 'HIGH').length * 100 / (list.length || 1)) };
  }
  res.json(out);
});
app.get('/api/followups', (req, res) => { const t = today(); res.json(scope(req.u).filter(p => p.nextFollowUp).map(p => ({ ...cardOf(p), purpose: (p.followUps[p.followUps.length - 1] || {}).purpose || 'Routine follow-up' })).map(c => ({ ...c, state: c.nextFollowUp < t ? 'Overdue' : c.nextFollowUp === t ? 'Due today' : 'Upcoming' })).filter(c => c.state !== 'Upcoming' || c.nextFollowUp <= iso(Date.now() + 30 * DAY)).sort((a, b) => a.nextFollowUp.localeCompare(b.nextFollowUp))); });
app.get('/api/queue', only('phc'), (req, res) => res.json(scope(req.u).filter(p => (p.needsReview && !p.diagnosis) || (p.referral && p.referral.status !== 'Completed')).map(p => ({ ...cardOf(p), referralFull: p.referral }))));
app.get('/api/notifications', (req, res) => res.json(notes.filter(n => (req.u.role === 'phc' ? n.phc === req.u.phc : n.asha === req.u.id || (n.phc === req.u.phc && !n.asha)))));
app.post('/api/notifications/read', (req, res) => { notes.forEach(n => n.read = true); res.json({ ok: true }); });

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));
app.use((err, req, res, next) => res.status(500).json({ error: 'Something went wrong. Please try again.' }));
const PORT = process.env.PORT || 3000; app.listen(PORT, () => console.log('CareLoop demo running at http://localhost:' + PORT));

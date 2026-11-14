import { useCallback, useEffect, useMemo, useState } from 'react';
import { completeActivity, completeRoutine, createRecord, createStaffAccount, deleteRecord, getStaffDailySchedule, listRecords, login, request, setupManager } from './services/api.js';
import { filterHorses } from './services/horseSearch.js';
import { buildStaffSchedule } from './services/staffSchedule.js';
import { countAvailableStalls, isStallOccupied } from './services/stallAvailability.js';

const kinds = ['horses', 'staff', 'stalls', 'stallAssignments', 'routines', 'activities', 'history', 'resources'];
const nav = [['Overview', '⌂'], ['Horses', '♞'], ['Feeding & care', '◷'], ['Schedule', '▦'], ['Stalls & resources', '▤'], ['Staff & history', '♙']];
const blankData = Object.fromEntries(kinds.map((kind) => [kind, []]));
const dateToday = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

function AuthScreen({ needsSetup, onAuthenticated }) {
  const [values, setValues] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const update = (key, value) => setValues((current) => ({ ...current, [key]: value }));
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    try { onAuthenticated(needsSetup ? await setupManager(values) : await login(values)); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return <main className="auth-page"><form className="panel auth-card" onSubmit={submit}>
    <div className="brand auth-brand"><b>S</b><div><strong>StableFlow</strong><small>CARE IN MOTION</small></div></div>
    <p className="eyebrow">{needsSetup ? 'FIRST TIME SETUP' : 'STABLE OPERATIONS'}</p>
    <h1>{needsSetup ? 'Create your manager account' : 'Welcome back'}</h1>
    {needsSetup && <label className="field"><span>Your name</span><input required value={values.name || ''} onChange={(e) => update('name', e.target.value)} /></label>}
    <label className="field"><span>Email</span><input required type="email" value={values.email || ''} onChange={(e) => update('email', e.target.value)} /></label>
    <label className="field"><span>Password</span><input required minLength={8} type="password" value={values.password || ''} onChange={(e) => update('password', e.target.value)} /></label>
    {error && <div role="alert" className="alert error">{error}</div>}
    <button className="button" disabled={busy}>{busy ? 'Please wait…' : needsSetup ? 'Create manager account' : 'Sign in'}</button>
    <small className="auth-hint">{needsSetup ? 'The first account becomes the stable manager.' : 'Ask your stable manager to create an account if you need access.'}</small>
  </form></main>;
}

function RecordForm({ title, fields, onSave }) {
  const [values, setValues] = useState({});
  const [saving, setSaving] = useState(false);
  const change = (name, value) => setValues((current) => ({ ...current, [name]: value }));
  async function submit(event) {
    event.preventDefault(); setSaving(true);
    try { await onSave(values); setValues({}); } catch { /* The page displays the API error. */ } finally { setSaving(false); }
  }
  return <form className="panel form" onSubmit={submit}><h3>{title}</h3>
    {fields.map((field) => <label className="field" key={field.name}><span>{field.label}</span>
      {field.options ? <select required={field.required} value={values[field.name] || ''} onChange={(e) => change(field.name, e.target.value)}>
        <option value="">{field.placeholder || `Select ${field.label.toLowerCase()}`}</option>
        {field.options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select> : field.type === 'textarea' ? <textarea value={values[field.name] || ''} onChange={(e) => change(field.name, e.target.value)} /> :
        <input required={field.required} type={field.type || 'text'} value={values[field.name] || ''} onChange={(e) => change(field.name, e.target.value)} />}
    </label>)}
    <button className="button" disabled={saving}>{saving ? 'Saving…' : 'Save record'}</button>
  </form>;
}

function Table({ title, columns, rows }) {
  return <section className="panel"><div className="panel-heading"><h3>{title}</h3><small>{rows.length} records</small></div>
    {rows.length ? <div className="table-scroll"><table><thead><tr>{columns.map((c) => <th key={c}>{c}</th>)}</tr></thead><tbody>{rows}</tbody></table></div> : <p className="empty">No records yet. Add the first one using the form.</p>}
  </section>;
}

function App() {
  const [data, setData] = useState(blankData);
  const [page, setPage] = useState('Overview');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [horseSearch, setHorseSearch] = useState('');
  const [auth, setAuth] = useState(undefined);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [staffDailySchedule, setStaffDailySchedule] = useState([]);
  const today = dateToday();
  useEffect(() => {
    let active = true;
    async function restoreSession() {
      const token = localStorage.getItem('stableflowToken');
      if (token) {
        try { const result = await request('/auth/me'); if (active) { setAuth({ user: result.user }); return; } }
        catch { localStorage.removeItem('stableflowToken'); }
      }
      try { const status = await request('/auth/status'); if (active) { setNeedsSetup(status.needsSetup); setAuth(null); } }
      catch { if (active) setAuth(null); }
    }
    const expireSession = () => { localStorage.removeItem('stableflowToken'); setAuth(null); };
    window.addEventListener('stableflow:unauthorized', expireSession);
    restoreSession();
    return () => { active = false; window.removeEventListener('stableflow:unauthorized', expireSession); };
  }, []);
  const refresh = useCallback(async () => {
    try {
      const results = await Promise.all(kinds.map(listRecords));
      setData(Object.fromEntries(kinds.map((kind, index) => [kind, results[index]])));
      if (auth?.user.role === 'staff') {
        setStaffDailySchedule(await getStaffDailySchedule(auth.user.staffId, today));
      } else {
        setStaffDailySchedule([]);
      }
      setError('');
    } catch (e) { setError(e.message); }
  }, [auth, today]);
  useEffect(() => { if (auth?.user) refresh(); }, [auth, refresh]);

  const horseNames = useMemo(() => Object.fromEntries(data.horses.map((x) => [x._id, x.name])), [data.horses]);
  const stallNames = useMemo(() => Object.fromEntries(data.stalls.map((x) => [x._id, x.name])), [data.stalls]);
  const staffNames = useMemo(() => Object.fromEntries(data.staff.map((x) => [x._id, x.name])), [data.staff]);
  const horseOptions = data.horses.map((x) => [x._id, x.name]);
  const staffOptions = data.staff.map((x) => [x._id, x.name]);
  async function save(kind, value, defaults = {}) {
    setNotice(''); setError('');
    try { const created = await createRecord(kind, { ...defaults, ...value }); await refresh(); setNotice('Saved successfully.'); return created; }
    catch (e) { setError(e.message); throw e; }
  }
  async function remove(kind, id) {
    if (!window.confirm('Delete this record?')) return;
    try { await deleteRecord(kind, id); await refresh(); } catch (e) { setError(e.message); }
  }
  async function finish(id) {
    try { await completeActivity(id); await refresh(); setNotice('Activity completed and added to horse service history.'); }
    catch (e) { setError(e.message); }
  }
  async function finishRoutine(id) {
    try { await completeRoutine(id, today); await refresh(); setNotice('Care routine completed and added to horse service history.'); }
    catch (e) { setError(e.message); }
  }
  const del = (kind, item) => auth?.user.role === 'manager' ? <button className="text-button" onClick={() => remove(kind, item._id)}>Delete</button> : '—';
  if (auth === undefined) return <main className="auth-page"><p>Loading StableFlow…</p></main>;
  if (!auth) return <AuthScreen needsSetup={needsSetup} onAuthenticated={(result) => { localStorage.setItem('stableflowToken', result.token); setAuth({ user: result.user }); }} />;
  const activities = [...data.activities].sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  const activityRows = (rows) => rows.map((a) => <tr key={a._id}><td>{a.date} · {a.time}</td><td>{a.type}</td><td>{horseNames[a.horseId] || 'Horse'}</td><td>{staffNames[a.staffId] || 'Unassigned'}</td><td><span className={`pill ${a.status === 'completed' ? 'done' : ''}`}>{a.status || 'scheduled'}</span></td><td>{a.status === 'completed' ? 'Done' : <button className="text-button" onClick={() => finish(a._id)}>Complete</button>}</td></tr>);

  let content;
  if (page === 'Overview') {
    content = <>
      <section className="welcome"><p className="eyebrow">STABLE OPERATIONS</p><h2>A calmer day starts here.</h2><p>Keep every horse, task, and team member in sync.</p></section>
      <div className="stats">{[['Horse profiles', data.horses.length], ['Appointments today', data.activities.filter((a) => a.date === today).length], ['Available stalls', countAvailableStalls(data.stalls, data.stallAssignments, today)]].map(([label, value]) => <div className="stat" key={label}><small>{label}</small><strong>{value}</strong></div>)}</div>
      <div className="content-grid"><Table title="Today's schedule" columns={['Date & time', 'Type', 'Horse', 'Staff', 'Status', '']} rows={activityRows(activities.filter((a) => a.date === today))} />
        <section className="panel focus"><p className="eyebrow">CONNECTED CARE</p><h3>From profile to service history</h3><p>Create a horse profile, assign a stall, schedule care, then record the work in the horse's history.</p><button className="button" onClick={() => setPage('Horses')}>Start with a horse</button></section></div>
    </>;
  } else if (page === 'Horses') {
    const matchingHorses = filterHorses(data.horses, horseSearch);
    content = <div className="content-grid"><RecordForm title="Add a horse" onSave={(v) => save('horses', v)} fields={[
      { name: 'name', label: 'Horse name', required: true }, { name: 'horseId', label: 'Horse ID' }, { name: 'breed', label: 'Breed' }, { name: 'owner', label: 'Owner' }, { name: 'dietaryNotes', label: 'Dietary needs' }, { name: 'medicalNotes', label: 'Medical & care notes', type: 'textarea' },
    ]} /><div className="form-stack"><input className="search" aria-label="Search horse by name or ID" placeholder="Search horses by name or ID" value={horseSearch} onChange={(e) => setHorseSearch(e.target.value)} /><Table title="Horse profiles" columns={['Horse', 'ID', 'Owner', 'Care notes', '']} rows={matchingHorses.map((h) => <tr key={h._id}><td><strong>{h.name}</strong><small>{h.breed || 'Breed not specified'}</small></td><td>{h.horseId || '—'}</td><td>{h.owner || '—'}</td><td>{h.dietaryNotes || h.medicalNotes || '—'}</td><td>{del('horses', h)}</td></tr>)} /></div></div>;
  } else if (page === 'Feeding & care') {
    content = <div className="content-grid"><RecordForm title="Create recurring care" onSave={(v) => save('routines', v, { active: true })} fields={[
      { name: 'horseId', label: 'Horse', options: horseOptions, required: true }, { name: 'type', label: 'Routine', options: ['Feeding', 'Grooming', 'Exercise', 'Medication', 'General care'].map((x) => [x, x]), required: true }, { name: 'time', label: 'Time', type: 'time', required: true }, { name: 'frequency', label: 'Frequency', options: ['Daily', 'Weekly', 'As needed'].map((x) => [x, x]) }, { name: 'staffId', label: 'Assigned staff', options: staffOptions, placeholder: 'Unassigned' },
    ]} /><Table title="Recurring routines" columns={['Horse', 'Care', 'Time', 'Staff', 'Frequency', '']} rows={data.routines.map((r) => <tr key={r._id}><td>{horseNames[r.horseId] || 'Horse'}</td><td>{r.type}</td><td>{r.time}</td><td>{staffNames[r.staffId] || 'Unassigned'}</td><td>{r.frequency || 'Daily'}</td><td>{del('routines', r)}</td></tr>)} /></div>;
  } else if (page === 'Schedule') {
    content = <div className="content-grid"><RecordForm title="Schedule an appointment" onSave={(v) => save('activities', v, { status: 'scheduled' })} fields={[
      { name: 'type', label: 'Activity', options: ['Veterinary', 'Training', 'Farrier', 'Other'].map((x) => [x, x]), required: true }, { name: 'horseId', label: 'Horse', options: horseOptions, required: true }, { name: 'date', label: 'Date', type: 'date', required: true }, { name: 'time', label: 'Start time', type: 'time', required: true }, { name: 'staffId', label: 'Assigned staff', options: staffOptions, placeholder: 'Unassigned' }, { name: 'facility', label: 'Facility' },
    ]} /><Table title="Appointments & activities" columns={['Date & time', 'Type', 'Horse', 'Staff', 'Status', '']} rows={activityRows(activities)} /></div>;
  } else if (page === 'Stalls & resources') {
    content = <div className="content-grid"><div className="form-stack">{auth.user.role === 'manager' && <><RecordForm title="Add a stall" onSave={(v) => save('stalls', v, { status: 'Available' })} fields={[
      { name: 'name', label: 'Stall name', required: true }, { name: 'location', label: 'Location' },
    ]} /><RecordForm title="Assign a horse to a stall" onSave={(v) => save('stallAssignments', v)} fields={[
      { name: 'stallId', label: 'Stall', options: data.stalls.map((x) => [x._id, x.name]), required: true }, { name: 'horseId', label: 'Horse', options: horseOptions, required: true }, { name: 'startDate', label: 'From', type: 'date', required: true }, { name: 'endDate', label: 'Until', type: 'date' },
    ]} /><RecordForm title="Add a stable resource" onSave={(v) => save('resources', v, { availability: 'Available' })} fields={[
      { name: 'name', label: 'Resource name', required: true }, { name: 'category', label: 'Category' }, { name: 'availability', label: 'Availability', options: ['Available', 'Unavailable', 'Maintenance'].map((x) => [x, x]) },
    ]} /></>}</div><div className="form-stack"><Table title="Stalls" columns={['Stall', 'Location', 'Availability', '']} rows={data.stalls.map((s) => { const occupied = isStallOccupied(s._id, data.stallAssignments, today); return <tr key={s._id}><td>{s.name}</td><td>{s.location || '—'}</td><td>{occupied ? 'Occupied' : s.status}</td><td>{del('stalls', s)}</td></tr>; })} /><Table title="Stall assignments" columns={['Stall', 'Horse', 'From', 'Until', '']} rows={data.stallAssignments.map((a) => <tr key={a._id}><td>{stallNames[a.stallId] || 'Stall'}</td><td>{horseNames[a.horseId] || 'Horse'}</td><td>{a.startDate}</td><td>{a.endDate === '9999-12-31' ? 'Ongoing' : a.endDate}</td><td>{del('stallAssignments', a)}</td></tr>)} /><Table title="Resources" columns={['Resource', 'Category', 'Availability']} rows={data.resources.map((r) => <tr key={r._id}><td>{r.name}</td><td>{r.category || '—'}</td><td>{r.availability}</td></tr>)} /></div></div>;
  } else {
    const dailyItems = auth.user.role === 'manager'
      ? buildStaffSchedule({ activities: data.activities, routines: data.routines, history: data.history, staffId: null, date: today })
      : staffDailySchedule;
    const dailyRows = dailyItems.map((item) => <tr key={`${item.kind}-${item._id}`}><td>{item.time}</td><td>{item.workType}</td><td>{horseNames[item.horseId] || 'Horse'}</td><td>{staffNames[item.staffId] || 'Unassigned'}</td><td>{item.kind === 'activity' ? item.status || 'scheduled' : 'routine'}</td><td>{item.kind === 'routine' ? <button className="text-button" onClick={() => finishRoutine(item._id)}>Complete</button> : '—'}</td></tr>);
    content = <div className="content-grid">{auth.user.role === 'manager' && <RecordForm title="Add a staff member and sign-in" onSave={async (v) => { const { password, ...staffData } = v; const staff = await save('staff', staffData, { role: v.role || 'Stable hand' }); try { await createStaffAccount({ name: v.name, email: v.email, password, staffId: staff._id }); await refresh(); setNotice('Staff profile and sign-in created.'); } catch (e) { setError(`Staff profile saved, but account creation failed: ${e.message}`); } }} fields={[
      { name: 'name', label: 'Full name', required: true }, { name: 'role', label: 'Work role', options: ['Stable hand', 'Veterinarian', 'Trainer', 'Farrier'].map((x) => [x, x]), required: true }, { name: 'email', label: 'Login email', type: 'email', required: true }, { name: 'password', label: 'Temporary password (8+ characters)', type: 'password', required: true },
    ]} />}<div className="form-stack"><Table title="Staff & today's workload" columns={['Name', 'Role', 'Email', 'Today', '']} rows={data.staff.filter((s) => auth.user.role === 'manager' || s._id === auth.user.staffId).map((s) => <tr key={s._id}><td>{s.name}</td><td>{s.role}</td><td>{s.email || '—'}</td><td>{data.activities.filter((a) => a.staffId === s._id && a.date === today && a.status !== 'completed').length + data.routines.filter((r) => r.staffId === s._id).length} tasks</td><td>{del('staff', s)}</td></tr>)} /><Table title="Today's assigned activities" columns={['Time', 'Work', 'Horse', 'Staff', 'Status', '']} rows={dailyRows} /><Table title="Horse service history" columns={['Date', 'Horse', 'Service', 'Details', 'Staff']} rows={data.history.filter((h) => auth.user.role === 'manager' || h.staffId === auth.user.staffId).slice().reverse().map((h) => <tr key={h._id}><td>{h.date}</td><td>{horseNames[h.horseId] || 'Horse'}</td><td>{h.type}</td><td>{h.notes || 'Completed service'}</td><td>{staffNames[h.staffId] || '—'}</td></tr>)} /></div></div>;
  }

  const visibleNav = auth.user.role === 'manager' ? nav : nav.filter(([name]) => ['Overview', 'Staff & history'].includes(name));
  return <div className="app-shell"><aside className="sidebar"><div className="brand"><b>S</b><div><strong>StableFlow</strong><small>CARE IN MOTION</small></div></div><div className="side-label">WORKSPACE</div><nav>{visibleNav.map(([name, icon]) => <button key={name} className={`nav-item ${page === name ? 'active' : ''}`} onClick={() => { setPage(name); setNotice(''); }}><span>{icon}</span>{name}</button>)}</nav><div className="sidebar-bottom">{auth.user.name} · {auth.user.role}<button className="signout" onClick={() => { localStorage.removeItem('stableflowToken'); setPage('Overview'); setAuth(null); }}>Sign out</button></div></aside>
    <main><header className="topbar"><span>Workspace　/　<strong>{page}</strong></span><button onClick={refresh} aria-label="Refresh records">↻</button></header><article><p className="eyebrow">STABLEFLOW · OPERATIONS</p><h1>{page}</h1>{error && <div role="alert" className="alert error">{error}<button onClick={() => setError('')}>×</button></div>}{notice && <div className="alert success">{notice}</div>}{content}<footer>StableFlow · Horse and stable operations management</footer></article></main>
  </div>;
}

export default App;

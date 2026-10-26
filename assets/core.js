// Momentum — privacy-aware personal planner.
// Application state remains local until encrypted GitHub sync is configured.
'use strict';
const DBKEY = 'momentum_student_v1', CFGKEY = 'momentum_git_config_v1', DIRTYKEY = 'momentum_git_dirty_v1';
const DOW = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'];
const SATWEEK = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];
const VIEWS = [['dashboard', 'داشبورد', '◫'], ['planner', 'برنامهٔ هفتگی', '▦'], ['tasks', 'تسک‌ها', '☑'], ['progress', 'پیشرفت', '◉'], ['settings', 'تنظیمات', '⚙']];
const PERSIAN = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
const PERSIAN_PARTS = new Intl.DateTimeFormat('en-US-u-ca-persian', { year: 'numeric', month: '2-digit', day: '2-digit' });
const fnum = n => String(n ?? '').replace(/[0-9]/g, c => '۰۱۲۳۴۵۶۷۸۹'[c]);
const ennum = n => String(n ?? '').replace(/[۰-۹]/g, c => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c))).replace(/[٠-٩]/g, c => String('٠١٢٣٤٥٦٧٨٩'.indexOf(c)));
const htmlEscape = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const isoDate = d => [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
const fromIso = s => { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? new Date(+m[1], +m[2] - 1, +m[3], 12) : new Date(); };
const today = () => isoDate(new Date());
const addDays = (iso, n) => { const d = fromIso(iso); d.setDate(d.getDate() + n); return isoDate(d) };
const shiftWeek = iso => { const d = fromIso(iso); d.setDate(d.getDate() - ((d.getDay() + 1) % 7)); return isoDate(d) };
const persianParts = d => { const p = Object.fromEntries(PERSIAN_PARTS.formatToParts(d).filter(x => x.type !== 'literal').map(x => [x.type, +x.value])); return { y: p.year, m: p.month, d: p.day } };
function jalaliToISO(s) { if (!s) return ''; const digits = ennum(s).replace(/[-.]/g, '/').trim(); const m = digits.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/); if (!m) return null; const [y, mo, day] = m.slice(1).map(Number); if (y < 1200 || y > 1600 || mo < 1 || mo > 12 || day < 1 || day > 31) return null; const st = new Date(y + 621, 2, 17, 12); let found = null; for (let i = 0; i < 10; i++) { const q = new Date(st); q.setDate(st.getDate() + i); const p = persianParts(q); if (p.y === y && p.m === 1 && p.d === 1) { found = q; break } } if (!found) return null; const offset = (mo <= 7 ? (mo - 1) * 31 : 186 + (mo - 7) * 30) + day - 1; found.setDate(found.getDate() + offset); const z = persianParts(found); return z.y === y && z.m === mo && z.d === day ? isoDate(found) : null }
function isoToJalali(s) { if (!s) return ''; const p = persianParts(fromIso(s)); return fnum(`${p.y}/${String(p.m).padStart(2, '0')}/${String(p.d).padStart(2, '0')}`) }
const shortDate = s => s ? isoToJalali(s).slice(5) : 'بدون تاریخ';
const longDate = s => PERSIAN.format(fromIso(s));
const dayName = s => DOW[fromIso(s).getDay()];
const uid = () => crypto?.randomUUID?.() || 'id' + Date.now().toString(36) + Math.random().toString(36).slice(2);
const mkTask = (title, category, type = 'once', duration = 0, extra = {}) => ({ id: uid(), title, category, type, duration, repeatDays: [], due: '', planned: '', priority: 'normal', notes: '', xp: 20, ...extra });
const mkEvent = (title, day, start, end, kind = 'school') => ({ id: uid(), title, days: [day], start, end, kind, notes: '' });
function defaultData() {
  return { version: 1, tasks: [], events: [], completions: {}, checkins: {}, lastModified: Date.now(), pristine: true, theme: 'dark', createdOn: today() };
}
function normalize(data) { if (!data || !Array.isArray(data.tasks) || !Array.isArray(data.events)) throw Error('فایل داده معتبر نیست'); return { ...data, version: 1, completions: data.completions || {}, checkins: data.checkins || {}, lastModified: data.lastModified || Date.now(), theme: data.theme || 'dark' }; }
function load() { try { const obj = JSON.parse(localStorage.getItem(DBKEY)); return obj ? normalize(obj) : defaultData() } catch (e) { console.warn(e); return defaultData() } }
let data = load(), view = 'dashboard', selectedDate = today(), weekBase = shiftWeek(selectedDate), taskFilter = 'all', search = '', activeModal = null, draftDate = '', cloudReady = false, cloudSyncOk = false, syncTimer = null, busySync = false;
let syncConf = (() => { try { return JSON.parse(localStorage.getItem(CFGKEY)) || {} } catch { return {} } })();
let repoSha = syncConf.knownSha || null, gitToken = '', gitPassword = '', cloudMessage = '', repoPrivateConfirmed = false, syncConflict = false;
let gitDirty = localStorage.getItem(DIRTYKEY) === '1' || (!syncConf.knownSha && !data.pristine);
function markGitDirty(flag) { gitDirty = !!flag; localStorage.setItem(DIRTYKEY, flag ? '1' : '0') }
const store = () => { data.lastModified = Date.now(); data.pristine = false; localStorage.setItem(DBKEY, JSON.stringify(data)); markGitDirty(true); cloudSyncOk = false; if (cloudReady) scheduleUpload(); refreshStorageBadge() };
function storageLabel() { return cloudReady ? (cloudSyncOk && !gitDirty ? '☁ در مخزن خصوصی ذخیره شد' : '⟳ ذخیره محلی؛ در انتظار همگام‌سازی') : syncConf.tokenBox ? '🔒 داده محلی؛ اتصال قفل است' : 'ذخیره روی این دستگاه' }
function refreshStorageBadge() { const el = document.getElementById('storageStatus'); if (el) el.textContent = storageLabel() }

const isDone = (t, date = selectedDate) => !!data.completions[t.id + '|' + (t.type === 'once' ? 'once' : date)];
function setDone(t, date, checked) { const k = t.id + '|' + (t.type === 'once' ? 'once' : date); if (checked) data.completions[k] = { at: Date.now(), xp: Number(t.xp) || 20 }; else delete data.completions[k]; store(); render() }
const appearsOn = (t, date) => t.type === 'daily' || (t.type === 'weekly' && t.repeatDays.includes(fromIso(date).getDay())) || (t.type === 'once' && t.planned === date);
const dailyTasks = date => data.tasks.filter(t => appearsOn(t, date)).sort((a, b) => ['urgent', 'high', 'normal', 'low'].indexOf(a.priority) - ['urgent', 'high', 'normal', 'low'].indexOf(b.priority));
const dayEvents = date => data.events.filter(e => e.days.includes(fromIso(date).getDay())).sort((a, b) => a.start.localeCompare(b.start));
const dueTasks = date => data.tasks.filter(t => t.type === 'once' && !isDone(t, date) && t.due && t.due <= addDays(date, 7)).sort((a, b) => a.due.localeCompare(b.due));
const xpTotal = () => Object.values(data.completions).reduce((sum, x) => sum + (Number(x.xp) || 0), 0);
const level = () => Math.floor(xpTotal() / 200) + 1;
const xpIntoLevel = () => xpTotal() % 200;
const badgePriority = p => ({ urgent: 'فوری', high: 'مهم', normal: 'عادی', low: 'کم‌اولویت' }[p] || 'عادی');
const niceCategory = c => htmlEscape(c || 'سایر');
const niceDate = s => s ? longDate(s) : 'نامشخص';
const formatTime = t => fnum(t || '');
const countDone = (date) => dailyTasks(date).filter(t => isDone(t, date)).length;
function iconNav(v) { return VIEWS.map(([id, name, icon]) => `<button data-view="${id}" class="${view === id ? 'active' : ''}"><span class="navicon">${icon}</span><span>${name}</span></button>`).join('') }

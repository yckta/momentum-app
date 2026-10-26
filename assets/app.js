function onClick(e) {  
const n = e.target.closest('[data-view],[data-edit],[data-del],[data-toggle],[data-step-day],[data-step-week],[data-go-today],[data-reset-week],[data-new-date],[data-new-task],[data-filter],[data-energy],[data-mood],[data-close-modal],[data-close-overlay],[data-theme],[data-add-event],[data-edit-event],[data-delete-event],[data-export],[data-import],[data-reset],[data-cloud-save],[data-cloud-signup],[data-cloud-login],[data-cloud-pull],[data-cloud-logout],[data-cloud-download],[data-cloud-upload],[data-forget-device]'); if (!n) return; const d = n.dataset;
  if (d.closeOverlay && e.target !== n) return;
  if (d.view) { view = d.view; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); return }
  if (d.edit) { openTaskModal(d.edit); return }
  if (d.del) { const t = data.tasks.find(x => x.id === d.del); if (t && confirm(`«${t.title}» حذف شود؟`)) { data.tasks = data.tasks.filter(x => x.id !== d.del); for (const k of Object.keys(data.completions)) if (k.startsWith(d.del + '|')) delete data.completions[k]; store(); render(); toast('تسک حذف شد') } return }
  if (d.stepDay) { selectedDate = addDays(selectedDate, Number(d.stepDay)); weekBase = shiftWeek(selectedDate); render(); return }
  if (d.stepWeek) { weekBase = addDays(weekBase, Number(d.stepWeek)); render(); return }
  if ('goToday' in d) { selectedDate = today(); weekBase = shiftWeek(today()); render(); return }
  if ('resetWeek' in d) { weekBase = shiftWeek(today()); render(); return }
  if (d.newDate) { openTaskModal(null, d.newDate); return }
  if ('newTask' in d) { openTaskModal(); return }
  if (d.filter) { taskFilter = d.filter; render(); return }
  if (d.energy) { data.checkins[selectedDate] = { ...data.checkins[selectedDate], energy: Number(d.energy) }; store(); render(); return }
  if (d.mood) { data.checkins[selectedDate] = { ...data.checkins[selectedDate], mood: d.mood }; store(); render(); return }
  if ('closeModal' in d || 'closeOverlay' in d) { closeModal(); return }
  if (d.theme) { data.theme = d.theme; store(); render(); return }
  if ('addEvent' in d) { openEventModal(); return }
  if (d.editEvent) { openEventModal(d.editEvent); return }
  if (d.deleteEvent) { if (confirm('این رویداد هفتگی حذف شود؟')) { data.events = data.events.filter(x => x.id !== d.deleteEvent); closeModal(); store(); render() } return }
  if ('export' in d) { downloadBackup(); return }
  if ('import' in d) { document.getElementById('importFile')?.click(); return }
  if ('reset' in d) { if (confirm('تمام داده‌ها و پیشرفت‌ها حذف و برنامه به نسخهٔ اولیه برگردد؟')) { data = defaultData(); store(); render(); toast('داده‌ها بازنشانی شدند') } return }
  if ('cloudSave' in d) { saveCloudSettings(); return }
  if ('cloudSignup' in d) { cloudSignup(); return }
  if ('cloudLogin' in d) { cloudLogin(); return }
  if ('cloudPull' in d) { syncLatest(); return }
  if ('cloudLogout' in d) { cloudLogout(); return }
  if ('forgetDevice' in d) { disableRememberedDevice(); return }
  if ('cloudDownload' in d) { forceCloudDownload(); return }
  if ('cloudUpload' in d) { forceCloudUpload(); return }
}
document.addEventListener('click', onClick);
document.addEventListener('change', e => { const n = e.target; if (n.matches('[data-toggle]')) { const t = data.tasks.find(t => t.id === n.dataset.toggle); if (t) setDone(t, n.dataset.date, n.checked) } if (n.id === 'importFile') importBackup(n.files?.[0]); });
document.addEventListener('input', e => { if (e.target.id === 'taskSearch') { const start = e.target.selectionStart; search = e.target.value; const list = document.getElementById('taskList'); if (list) { const tmp = document.createElement('div'); tmp.innerHTML = renderTasks(); list.innerHTML = tmp.querySelector('#taskList')?.innerHTML || ''; } } });
document.getElementById('quickAdd').addEventListener('click', () => openTaskModal());
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal() });
render();
// Optional trusted-device restoration runs only on devices that opted in.
initializeRememberedDevice();
window.addEventListener('focus', () => { if (cloudReady && !syncConflict) syncLatest() });
document.addEventListener('visibilitychange', () => { if (!document.hidden && cloudReady && !syncConflict) syncLatest() });
setInterval(() => { if (cloudReady && !document.hidden && !syncConflict) syncLatest() }, 60000);
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('./sw.js').catch(() => { });

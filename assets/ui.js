function render() {  
document.body.classList.toggle('light', data.theme === 'light'); document.getElementById('desktopNav').innerHTML = iconNav(); document.getElementById('mobileNav').innerHTML = iconNav(); document.getElementById('pageHeading').textContent = VIEWS.find(v => v[0] === view)[1]; document.getElementById('dateBadge').textContent = longDate(today()); refreshStorageBadge(); document.getElementById('sidebarProgress').innerHTML = `<small class="muted">پیشرفت شخصیتت</small><div class="rowline"><strong>Level ${fnum(level())}</strong><b>${fnum(xpTotal())} XP</b></div><div class="meter"><span style="width:${xpIntoLevel() / 2}%"></span></div><small class="muted">${fnum(200 - xpIntoLevel())} XP تا مرحلهٔ بعد</small>`;
  const container = document.getElementById('content'); container.innerHTML = ({ dashboard: renderDashboard, planner: renderPlanner, tasks: renderTasks, progress: renderProgress, settings: renderSettings }[view])();
}
function renderTaskRow(t, date = selectedDate) {
  const done = isDone(t, date);
  const isLate = t.type === 'once' && t.due && t.due < today() && !done;
  const due = t.type === 'once' && t.due ? `<span class="task-meta-date ${isLate ? 'is-late' : ''}"><span aria-hidden="true">◷</span> ${shortDate(t.due)}</span>` : '';
  const priority = t.priority === 'urgent' ? '<span class="priority-mark urgent">فوری</span>' : t.priority === 'high' ? '<span class="priority-mark high">مهم</span>' : '';
  return `<div class="task-row ${done ? 'done' : ''}">
    <input aria-label="انجام ${htmlEscape(t.title)}" type="checkbox" data-toggle="${t.id}" data-date="${date}" ${done ? 'checked' : ''}>
    <div class="details"><div class="task-name-line"><span class="task-title">${htmlEscape(t.title)}</span>${priority}</div>
      <div class="subtext"><span>${niceCategory(t.category)}</span>${t.duration ? `<span>· ${fnum(t.duration)} دقیقه</span>` : ''}${t.type !== 'once' ? '<span>· تکرارشونده</span>' : ''}${due}</div>
    </div>
    <span class="xp-pill">+${fnum(t.xp || 20)} XP</span>
    <div class="small-actions"><button class="tiny" title="ویرایش" aria-label="ویرایش ${htmlEscape(t.title)}" data-edit="${t.id}">✎</button><button class="tiny" title="حذف" aria-label="حذف ${htmlEscape(t.title)}" data-del="${t.id}">×</button></div>
  </div>`;
}
function renderEvent(e) {
  return `<div class="event ${e.kind}"><span class="event-bullet"></span><div class="event-content"><b>${htmlEscape(e.title)}</b><small>${formatTime(e.start)} تا ${formatTime(e.end)}</small></div></div>`;
}
function overlapAlert(date) { const e = dayEvents(date), warnings = []; for (let i = 1; i < e.length; i++) { if (e[i].start < e[i - 1].end) warnings.push(`تداخل «${e[i - 1].title}» و «${e[i].title}»`); else if (e[i].start === e[i - 1].end && e[i].kind !== e[i - 1].kind) warnings.push(`«${e[i - 1].title}» و «${e[i].title}» بدون فاصله هستند`) } return warnings }
function renderDashboard() {
  const todayTasks = dailyTasks(selectedDate), completed = countDone(selectedDate);
  const pct = todayTasks.length ? Math.round(100 * completed / todayTasks.length) : 0;
  const left = todayTasks.length - completed;
  const mins = todayTasks.filter(t => !isDone(t,selectedDate)).reduce((sum,t)=>sum + (+t.duration || 0),0);
  const events = dayEvents(selectedDate);
  const due = dueTasks(selectedDate);
  const checkin = data.checkins[selectedDate] || {};
  const d = selectedDate === today();
  return `<div class="dashboard-layout">
    <section class="hero-panel card">
      <div class="hero-copy">
        <span class="hero-eyebrow">${d ? 'امروز، یک فرصت تازه' : htmlEscape(dayName(selectedDate)) + ' · ' + shortDate(selectedDate)}</span>
        <h2>${d ? 'قدم‌های کوچیک، پیشرفت‌های بزرگ.' : 'برنامهٔ ' + htmlEscape(dayName(selectedDate))}</h2>
        <p>برای شروع، فقط روی کار بعدی تمرکز کن.</p>
        <button class="btn hero-action" data-new-date="${selectedDate}">＋ افزودن کار جدید</button>
      </div>
      <div class="hero-progress" role="img" aria-label="${fnum(pct)} درصد کارهای این روز انجام شده">
        <div class="hero-ring" style="--progress:${pct}"><span><strong>${fnum(pct)}٪</strong><small>تکمیل امروز</small></span></div>
      </div>
    </section>
    <section class="stats-grid" aria-label="خلاصهٔ امروز">
      <div class="card metric-card"><span class="metric-icon metric-violet">☑</span><span class="metric-label">کارهای انجام‌شده</span><strong>${fnum(completed)} <small>/ ${fnum(todayTasks.length)}</small></strong><span class="metric-foot">${left ? fnum(left) + ' کار باقی‌مانده' : 'همهٔ کارهای امروز انجام شده'}</span></div>
      <div class="card metric-card"><span class="metric-icon metric-cyan">◷</span><span class="metric-label">زمان برنامه‌ریزی‌شدهٔ باقی‌مانده</span><strong>${fnum(mins)} <small>دقیقه</small></strong><span class="metric-foot">بر اساس تخمین هر تسک</span></div>
      <div class="card metric-card"><span class="metric-icon metric-amber">✦</span><span class="metric-label">امتیاز کل</span><strong>${fnum(xpTotal())} <small>XP</small></strong><span class="metric-foot">سطح ${fnum(level())}</span></div>
    </section>
    <div class="content-columns">
      <div class="primary-stack">
        <section class="card section-card">
          <div class="section-title"><div><span class="section-kicker">فهرست کارها</span><h2>کارهای این روز</h2></div>
            <div class="date-controls"><button class="iconbtn" data-step-day="-1" aria-label="روز قبل">‹</button><span>${shortDate(selectedDate)}</span><button class="iconbtn" data-step-day="1" aria-label="روز بعد">›</button><button class="btn btn-ghost" data-go-today>امروز</button></div></div>
          ${todayTasks.length ? `<div class="dashboard-tasks">${todayTasks.map(t=>renderTaskRow(t,selectedDate)).join('')}</div>` : `<div class="empty-state"><span class="empty-glyph">☑</span><h3>برنامه‌ات هنوز خالیه</h3><p>یک کار کوچیک برای این روز اضافه کن.</p><button class="btn btn-primary" data-new-date="${selectedDate}">افزودن اولین کار</button></div>`}
          ${todayTasks.length ? `<button class="text-action" data-new-date="${selectedDate}">＋ افزودن کار</button>` : ''}
        </section>
        <section class="card section-card">
          <div class="section-title"><div><span class="section-kicker">مهلت‌ها</span><h2>ددلاین‌های پیش رو</h2></div><button class="text-action" data-view="tasks">مشاهدهٔ همه</button></div>
          ${due.length ? `<div class="deadline-list">${due.slice(0,5).map(t=>`<button class="deadline-item ${t.due < selectedDate ? 'overdue' : ''}" data-edit="${t.id}"><span class="deadline-dot"></span><span class="deadline-label">${htmlEscape(t.title)}</span><span class="deadline-date">${shortDate(t.due)}</span></button>`).join('')}</div>` : '<div class="quiet-empty">ددلاین نزدیکی نداری.</div>'}
        </section>
      </div>
      <aside class="secondary-stack">
        <section class="card section-card">
          <div class="section-title"><div><span class="section-kicker">تقویم روز</span><h2>برنامهٔ ثابت</h2></div><span class="count-badge">${fnum(events.length)}</span></div>
          ${events.length ? `<div class="event-list">${events.map(renderEvent).join('')}</div>` : '<div class="quiet-empty">امروز قرار ثابتی ثبت نشده.</div>'}
          ${overlapAlert(selectedDate).map(a=>`<div class="notice">${htmlEscape(a)}</div>`).join('')}
          <button class="text-action" data-view="planner">تقویم هفتگی <span aria-hidden="true">←</span></button>
        </section>
        <section class="card section-card">
          <div class="section-title"><div><span class="section-kicker">خودت را چک کن</span><h2>حالت چطوره؟</h2></div></div>
          <div class="mood-label">انرژی</div><div class="energy-scale">${[1,2,3,4,5].map(i=>`<button data-energy="${i}" class="${checkin.energy === i ? 'selected' : ''}" aria-label="سطح انرژی ${fnum(i)}" title="${['','خیلی کم','کم','متوسط','خوب','عالی'][i]}">${fnum(i)}</button>`).join('')}</div>
          <div class="mood-label">حال‌وهوا</div><div class="mood-chips">${[['calm','آروم'],['ok','معمولی'],['great','سرحال'],['tired','خسته']].map(([key,title])=>`<button data-mood="${key}" class="${checkin.mood === key ? 'selected' : ''}">${title}</button>`).join('')}</div>
        </section>
        <section class="card section-card progress-card"><div class="section-title"><div><span class="section-kicker">مرور هفته</span><h2>روند انجام کارها</h2></div></div>${renderMiniWeekBars()}<button class="text-action" data-view="progress">جزئیات پیشرفت <span aria-hidden="true">←</span></button></section>
      </aside>
    </div>
  </div>`;
}
function renderMiniWeekBars() { const base = shiftWeek(selectedDate); return Array.from({ length: 7 }, (_, i) => { const date = addDays(base, i), ts = dailyTasks(date), done = countDone(date), pct = ts.length ? Math.round(done / ts.length * 100) : 0; return `<div class="barline"><span class="dayname">${SATWEEK[i]}</span><div class="track"><div class="fill" style="width:${pct}%"></div></div><span class="count">${fnum(done)}/${fnum(ts.length)}</span></div>` }).join('') }
function renderPlanner() {
  const days = Array.from({ length:7 },(_,i)=>addDays(weekBase,i));
  const allPlanned = days.reduce((sum,d)=>sum+dailyTasks(d).length,0);
  return `<div class="planner-screen">
    <section class="card planner-heading">
      <div><span class="section-kicker">نمای هفتگی</span><h2>هفته‌ات در یک نگاه</h2><p>${fnum(allPlanned)} کار برنامه‌ریزی‌شده</p></div>
      <div class="planner-controls"><button class="iconbtn" data-step-week="-7" aria-label="هفتهٔ قبل">‹</button><strong>${shortDate(days[0])} — ${shortDate(days[6])}</strong><button class="iconbtn" data-step-week="7" aria-label="هفتهٔ بعد">›</button><button class="btn btn-ghost" data-reset-week>این هفته</button><button class="btn btn-primary" data-add-event>＋ رویداد ثابت</button></div>
    </section>
    <section class="week-scroller" aria-label="برنامهٔ هفتگی"><div class="week-grid">
    ${days.map(d=>{
      const ts=dailyTasks(d), ev=dayEvents(d), complete=countDone(d);
      return `<div class="day-col ${d===today()?'current':''}">
        <div class="dayhead"><div><b>${dayName(d)}</b><small>${shortDate(d)}</small></div><span class="day-count">${fnum(complete)}/${fnum(ts.length)}</span></div>
        <div class="day-items">
        ${ev.map(e=>`<button class="calendar-item eventitem ${e.kind}" data-edit-event="${e.id}" title="ویرایش رویداد"><span class="calendar-time">${formatTime(e.start)}–${formatTime(e.end)}</span><span>${htmlEscape(e.title)}</span></button>`).join('')}
        ${ts.map(t=>`<button class="calendar-item taskitem ${isDone(t,d)?'doneitem':''}" data-edit="${t.id}" title="ویرایش تسک"><span class="calendar-time">${isDone(t,d)?'✓ انجام شد':t.duration?fnum(t.duration)+' دقیقه':'تسک'}</span><span>${htmlEscape(t.title)}</span></button>`).join('')}
        ${overlapAlert(d).length?'<span class="mini-alert">⚠ تداخل برنامه</span>':''}
        </div>
        <button class="add-day" data-new-date="${d}">＋ افزودن</button>
      </div>`;
    }).join('')}
    </div></section>
    <div class="planner-legend"><span><i class="legend-marker marker-event"></i> رویداد ثابت</span><span><i class="legend-marker marker-task"></i> تسک</span><span><i class="legend-marker marker-done"></i> انجام‌شده</span></div>
  </div>`;
}
function renderTasks() {
  const total=data.tasks.length;
  const open=data.tasks.filter(t=>t.type==='once'&&!isDone(t)).length;
  const recurring=data.tasks.filter(t=>t.type!=='once').length;
  const filtered=data.tasks.filter(t=>{
    const hit=(t.title+' '+t.notes+' '+t.category).toLowerCase().includes(search.toLowerCase());
    return hit && (taskFilter==='all'||(taskFilter==='routine'?t.type!=='once':taskFilter==='project'?t.category==='دانشگاه'||t.category==='دستیار آموزشی':taskFilter==='pending'?t.type==='once'&&!isDone(t):taskFilter==='done'?t.type==='once'&&isDone(t):true));
  }).sort((a,b)=>(a.type==='once'&&b.type!=='once'?-1:a.type!=='once'&&b.type==='once'?1:0)||(a.due||'9999').localeCompare(b.due||'9999'));
  return `<div class="tasks-screen">
    <section class="task-page-heading"><div><span class="section-kicker">برنامه‌ریزی شخصی</span><h2>همهٔ کارها</h2><p>کارهای روزمره، پروژه‌ها و هدف‌هات یک‌جا.</p></div></section>
    <section class="task-metrics" aria-label="آمار تسک‌ها"><div class="task-metric"><span>کل تسک‌ها</span><strong>${fnum(total)}</strong></div><div class="task-metric"><span>در انتظار</span><strong>${fnum(open)}</strong></div><div class="task-metric"><span>تکرارشونده</span><strong>${fnum(recurring)}</strong></div></section>
    <section class="card task-board">
      <div class="task-toolbar"><div class="search-control"><span aria-hidden="true">⌕</span><input id="taskSearch" placeholder="جست‌وجوی تسک‌ها..." value="${htmlEscape(search)}" aria-label="جست‌وجوی تسک‌ها"></div>
      <div class="filter-pills">${[['all','همه'],['pending','در انتظار'],['routine','تکرارشونده'],['project','دانشگاه'],['done','انجام‌شده']].map(([id,label])=>`<button data-filter="${id}" class="${taskFilter===id?'active':''}">${label}</button>`).join('')}</div></div>
      <div class="board-subhead"><strong>${fnum(filtered.length)} تسک</strong><span>مرتب‌شده براساس ددلاین</span></div>
      <div class="task-list" id="taskList">${filtered.length ? filtered.map(t=>`<article class="task-card">${renderTaskRow(t,t.type==='once'?t.planned||selectedDate:selectedDate)}${t.notes?`<div class="task-notes">${htmlEscape(t.notes)}</div>`:''}${t.type==='weekly'?`<div class="task-notes">${t.repeatDays.map(i=>DOW[i]).join('، ')}</div>`:''}</article>`).join('') : `<div class="empty-state"><span class="empty-glyph">⌕</span><h3>تسکی پیدا نشد</h3><p>${search?'عبارت جست‌وجو را تغییر بده.':'این بخش هنوز تسکی ندارد.'}</p>${!search?'<button class="btn btn-primary" data-new-task>ساخت تسک</button>':''}</div>`}</div>
    </section>
  </div>`;
}
function weekDates() { return Array.from({ length: 7 }, (_, i) => addDays(shiftWeek(selectedDate), i)) }
function renderProgress() {
  const dates=weekDates(), weekly=dates.reduce((a,d)=>a+countDone(d),0), total=dates.reduce((a,d)=>a+dailyTasks(d).length,0);
  const moods=dates.filter(d=>data.checkins[d]?.energy);
  const avg=moods.length?(moods.reduce((a,d)=>a+data.checkins[d].energy,0)/moods.length).toFixed(1):'—';
  return `<div class="progress-screen"><div class="task-page-heading"><div><span class="section-kicker">مسیر پیشرفت</span><h2>هر قدم حساب می‌شه</h2><p>نگاهی به روند این هفته و امتیازهایی که جمع کردی.</p></div></div>
    <div class="progress-stats"><div class="card metric-card"><span class="metric-icon metric-violet">✦</span><span class="metric-label">امتیاز کل</span><strong>${fnum(xpTotal())} <small>XP</small></strong><span class="metric-foot">سطح ${fnum(level())}</span></div>
    <div class="card metric-card"><span class="metric-icon metric-cyan">✓</span><span class="metric-label">انجام‌شدهٔ این هفته</span><strong>${fnum(weekly)} <small>/ ${fnum(total)}</small></strong><span class="metric-foot">${fnum(total?Math.round(100*weekly/total):0)}٪ از برنامه</span></div>
    <div class="card metric-card"><span class="metric-icon metric-amber">♡</span><span class="metric-label">میانگین انرژی</span><strong>${fnum(avg)} <small>/ ۵</small></strong><span class="metric-foot">${fnum(moods.length)} روز ثبت</span></div></div>
    <div class="progress-detail"><section class="card section-card"><div class="section-title"><h2>کارهای هفته</h2><span class="tag">${shortDate(dates[0])} — ${shortDate(dates[6])}</span></div>${renderMiniWeekBars()}</section>
    <section class="card section-card"><div class="section-title"><h2>انرژی هفته</h2></div>${dates.map(d=>`<div class="barline"><span class="dayname">${dayName(d)}</span><div class="track"><div class="fill energy-fill" style="width:${(data.checkins[d]?.energy||0)*20}%"></div></div><span class="count">${data.checkins[d]?.energy?fnum(data.checkins[d].energy)+'/۵':'—'}</span></div>`).join('')}</section></div>
    <div class="card level-panel"><div class="section-title"><h2>مسیر سطح بعدی</h2><span class="tag purple">Level ${fnum(level())}</span></div><div class="meter"><span style="width:${xpIntoLevel()/2}%"></span></div><div class="rowline"><span>${fnum(xpIntoLevel())} از ۲۰۰ XP</span><strong>${fnum(200-xpIntoLevel())} XP تا سطح ${fnum(level()+1)}</strong></div></div>
  </div>`;
}

function settingsTabCard(id, icon, title) {
  return `<button class="settings-tab-card ${settingsTab===id?'active':''}" data-settings-tab="${id}" aria-pressed="${settingsTab===id}"><span class="settings-tab-icon">${icon}</span><span>${title}</span></button>`;
}
function renderSettings() {
  const isCloud=!!cloudReady;
  const status=isCloud&&cloudSyncOk?'همگام است':isCloud?'در انتظار همگام‌سازی':syncConf.tokenBox?'قفل شده':'اتصال تنظیم نشده';
  const statusStyle=isCloud&&cloudSyncOk?'good':isCloud?'pending':'offline';
  const cloudText=htmlEscape(cloudMessage||(isCloud?(cloudSyncOk?'داده‌ها با مخزن خصوصی هماهنگ‌اند.':'اتصال برقرار است؛ در انتظار همگام‌سازی.'):syncConf.tokenBox?'اتصال قفل است. برای بازکردن عبارت عبور را وارد کن.':'برای شروع، مخزن خصوصی GitHub را متصل کن.'));
  const hasError=!!syncConf.autoUnlockError;
  const panel={
    appearance:`<div class="card settings-panel"><div class="settings-heading"><h2>ظاهر برنامه</h2></div>
      <div class="setting-line"><div><b>حالت نمایش</b><small>رنگ‌بندی برنامه</small></div><div class="theme-switch"><button data-theme="dark" class="${data.theme==='dark'?'active':''}" aria-pressed="${data.theme==='dark'}">☾ تیره</button><button data-theme="light" class="${data.theme==='light'?'active':''}" aria-pressed="${data.theme==='light'}">☼ روشن</button></div></div>
    </div>`,
    sync:`<div class="card settings-panel">
      <div class="settings-heading"><div><h2>همگام‌سازی</h2><p>اطلاعاتت روی دستگاه‌ها هماهنگ می‌ماند.</p></div><span class="sync-status ${statusStyle}"><span class="sync-status-dot"></span>${status}</span></div>
      <div class="sync-spotlight"><div class="sync-spotlight-icon">☁</div><div><strong>${isCloud?'اتصال GitHub فعال است':syncConf.tokenBox?'اتصال نیاز به بازکردن دارد':'اتصال به GitHub'}</strong><span>مخزن خصوصی: ${htmlEscape(syncConf.owner||'yckta')} / ${htmlEscape(syncConf.repo||'momentum-data')}</span></div></div>
      <p class="sync-message" id="cloudMessage" role="status">${cloudText}</p>
      ${hasError?`<p class="notice">خطای ورود خودکار: ${htmlEscape(syncConf.autoUnlockError)}</p>`:''}
      <div class="sync-primary-actions">
        <button class="btn btn-primary" data-cloud-pull ${!isCloud?'disabled':''}>⟳ همگام‌سازی الآن</button>
        ${!isCloud&&syncConf.tokenBox?'<button class="btn" data-cloud-login>باز کردن اتصال</button>':''}
      </div>
      <div class="setting-line remember-line"><div><b>ورود خودکار</b><small>به خاطر سپردن این دستگاه برای ۳۰ روز</small></div><label class="toggle-switch" aria-label="ورود خودکار"><input type="checkbox" id="rememberDevice" ${syncConf.rememberDevice?'checked':''}><span></span></label></div>
      ${syncConf.rememberDevice?'<div class="setting-note">ورود خودکار روی این دستگاه روشن است.</div>':''}
      <details class="setting-disclosure" ${!syncConf.tokenBox||!isCloud?'open':''}><summary>تنظیمات اتصال <span class="disclosure-chevron">⌄</span></summary>
        <div class="sync-config-form">
          <div class="sync-form-grid"><div class="form-group"><label for="gitOwner">نام کاربری GitHub</label><input id="gitOwner" dir="ltr" placeholder="username" autocomplete="off" value="${htmlEscape(syncConf.owner||'yckta')}"></div>
          <div class="form-group"><label for="gitRepo">مخزن خصوصی</label><input id="gitRepo" dir="ltr" placeholder="momentum-data" autocomplete="off" value="${htmlEscape(syncConf.repo||'momentum-data')}"></div>
          <div class="form-group full"><label for="gitToken">توکن دسترسی GitHub</label><input id="gitToken" type="password" dir="ltr" autocomplete="off" placeholder="${syncConf.tokenBox?'توکن قبلاً ذخیره شده':'Fine-grained PAT'}"></div>
          <div class="form-group full"><label for="gitPass">عبارت عبور رمزگذاری</label><input id="gitPass" type="password" dir="ltr" autocomplete="off" placeholder="عبارت عبور اتصال"></div></div>
          <div class="sync-config-actions"><button class="btn btn-primary" data-cloud-save>ذخیرهٔ اتصال</button><button class="btn" data-cloud-login ${!syncConf.tokenBox?'disabled':''}>باز کردن اتصال</button><button class="btn" data-forget-device ${!syncConf.rememberDevice?'disabled':''}>خاموش‌کردن ورود خودکار</button><button class="btn btn-ghost" data-cloud-logout ${!isCloud?'disabled':''}>قفل اتصال</button></div>
        </div>
      </details>
      <details class="setting-disclosure dangerous-disclosure"><summary>مدیریت تعارض داده‌ها <span class="disclosure-chevron">⌄</span></summary><div class="sync-config-form"><p class="muted">اگر تغییرات دو دستگاه با هم تداخل پیدا کرده‌اند، ابتدا خروجی پشتیبان بگیر.</p>
        <div class="sync-config-actions"><button class="btn" data-cloud-download ${!isCloud?'disabled':''}>دریافت نسخهٔ ابری</button><button class="btn btn-danger" data-cloud-upload ${!isCloud?'disabled':''}>جایگزینی ابر با این دستگاه</button></div></div></details>
    </div>`,
    backup:`<div class="card settings-panel"><div class="settings-heading"><div><h2>پشتیبان‌گیری</h2><p>یک نسخه از تسک‌ها و پیشرفتت نگه دار.</p></div></div>
      <div class="backup-tile"><span class="backup-tile-icon">↓</span><div><strong>فایل پشتیبان</strong><small>دریافت یا بازیابی اطلاعات در قالب JSON</small></div></div>
      <div class="sync-primary-actions"><button class="btn btn-primary" data-export>دریافت پشتیبان</button><button class="btn" data-import>بازیابی فایل</button><input style="display:none" type="file" id="importFile" accept=".json,application/json"></div>
    </div>`,
    advanced:`<div class="card settings-panel"><div class="settings-heading"><h2>سایر تنظیمات</h2></div>
      <div class="setting-line"><div><b>اعلان ددلاین</b><small>یادآوری‌های داخل برنامه</small></div><span class="tag">داخل برنامه</span></div>
      <details class="setting-disclosure dangerous-disclosure"><summary>حذف اطلاعات <span class="disclosure-chevron">⌄</span></summary><div class="sync-config-form"><p class="muted">با بازنشانی، تسک‌ها و پیشرفت‌های محلی حذف می‌شوند.</p><button class="btn btn-danger" data-reset>بازنشانی اطلاعات</button></div></details>
    </div>`
  };
  return `<div class="settings-shell"><div class="settings-layout"><nav class="settings-nav" aria-label="دسته‌بندی تنظیمات">
      ${settingsTabCard('appearance','◐','ظاهر')}${settingsTabCard('sync','☁','همگام‌سازی')}${settingsTabCard('backup','↓','پشتیبان‌گیری')}${settingsTabCard('advanced','⚙','سایر موارد')}
    </nav><section class="settings-content-area">${panel[settingsTab]||panel.sync}</section></div></div>`;
}
function formField(label, input, full = false) { return `<div class="form-group ${full ? 'full' : ''}"><label>${label}</label>${input}</div>` }
function openTaskModal(id = null, date = '') {  
const t = id ? data.tasks.find(x => x.id === id) : null; if (id && !t) return; activeModal = { type: 'task', id }; const v = t || mkTask('', 'شخصی', 'once', 25, { planned: date }); const days = SATWEEK.map((day, i) => ({ day, num: (i + 6) % 7 })); document.getElementById('modalRoot').innerHTML = `<div class="modal-wrap" data-close-overlay="1"><div class="modal" role="dialog" aria-modal="true" aria-label="ویرایش تسک"><div class="section-title"><h2>${id ? 'ویرایش تسک' : 'ساخت تسک جدید'}</h2><button class="tiny" data-close-modal style="font-size:23px">×</button></div><form id="taskForm" class="form-grid">${formField('عنوان *', `<input name="title" required maxlength="150" value="${htmlEscape(v.title)}" placeholder="مثلاً حل تمرین مدار" autofocus>`, true)}${formField('دسته‌بندی', `<input name="category" list="cats" value="${htmlEscape(v.category)}"><datalist id="cats"><option>دانشگاه</option><option>دستیار آموزشی</option><option>پژوهش</option><option>رشد شخصی</option><option>ارشد</option><option>امتحان</option><option>شخصی</option></datalist>`)}${formField('نوع تسک', `<select name="type" id="taskType"><option value="once" ${v.type === 'once' ? 'selected' : ''}>یک‌بار انجام</option><option value="daily" ${v.type === 'daily' ? 'selected' : ''}>هر روز</option><option value="weekly" ${v.type === 'weekly' ? 'selected' : ''}>روزهای مشخص هفته</option></select>`)}${formField('زمان تخمینی (دقیقه؛ ۰ یعنی نامشخص)', `<input name="duration" type="number" min="0" max="1440" value="${v.duration || 0}">`)}${formField('اولویت', `<select name="priority">${[['urgent', 'فوری'], ['high', 'بالا'], ['normal', 'عادی'], ['low', 'پایین']].map(([x, y]) => `<option value="${x}" ${v.priority === x ? 'selected' : ''}>${y}</option>`).join('')}</select>`)}<div class="form-group full" id="dateInputs"><div class="form-grid">${formField('ددلاین (اختیاری)', `<input type="hidden" name="due" value="${htmlEscape(v.due)}"><button class="date-picker-button ${v.due ? 'has-date' : ''}" type="button" data-calendar-open="due" aria-label="انتخاب ددلاین شمسی"><span data-calendar-label="due">${v.due ? isoToJalali(v.due) : 'انتخاب تاریخ'}</span><span class="date-picker-icon" aria-hidden="true">▦</span></button>`)}${formField('روز انجام (اختیاری)', `<input type="hidden" name="planned" value="${htmlEscape(v.planned)}"><button class="date-picker-button ${v.planned ? 'has-date' : ''}" type="button" data-calendar-open="planned" aria-label="انتخاب روز انجام شمسی"><span data-calendar-label="planned">${v.planned ? isoToJalali(v.planned) : 'انتخاب تاریخ'}</span><span class="date-picker-icon" aria-hidden="true">▦</span></button>`)}</div><div class="hint">برای انتخاب روز، روی هر کادر بزن.</div></div><div class="form-group full" id="weeklyInputs" style="display:${v.type === 'weekly' ? 'block' : 'none'}"><label>روزهای تکرار</label><div class="multi-days">${days.map(x => `<label><input type="checkbox" name="weekday" value="${x.num}" ${v.repeatDays?.includes(x.num) ? 'checked' : ''}>${x.day}</label>`).join('')}</div></div>${formField('یادداشت‌ها و جزئیات', `<textarea name="notes" placeholder="مراحل انجام، لینک درس، جزئیات...">${htmlEscape(v.notes)}</textarea>`, true)}<div class="foot full"><button type="button" class="btn btn-ghost" data-close-modal>انصراف</button><button type="submit" class="btn btn-primary">${id ? 'ذخیرهٔ تغییرات' : 'افزودن تسک'}</button></div></form></div></div>`;
  document.getElementById('taskType').addEventListener('change', e => { document.getElementById('dateInputs').style.display = e.target.value === 'once' ? 'block' : 'none'; document.getElementById('weeklyInputs').style.display = e.target.value === 'weekly' ? 'block' : 'none' }); document.getElementById('dateInputs').style.display = v.type === 'once' ? 'block' : 'none'; document.getElementById('taskForm').addEventListener('submit', saveTask);
}
function saveTask(e) { e.preventDefault(); const f = new FormData(e.target); const type = f.get('type'), title = f.get('title').trim(); if (!title) return; const due = type === 'once' ? f.get('due') || '' : '', planned = type === 'once' ? f.get('planned') || '' : ''; if ([due, planned].some(iso => iso && !/^\d{4}-\d{2}-\d{2}$/.test(iso))) { toast('تاریخ انتخاب‌شده نامعتبر است'); return } const repeatDays = type === 'weekly' ? f.getAll('weekday').map(Number) : [], duration = Math.max(0, Math.min(1440, Number(f.get('duration')) || 0)); if (type === 'weekly' && !repeatDays.length) { toast('برای تسک هفتگی دست‌کم یک روز انتخاب کن'); return } const props = { title, category: f.get('category')?.trim() || 'شخصی', type, duration, priority: f.get('priority'), due, planned, repeatDays, notes: f.get('notes')?.trim() || '' }; const old = activeModal.id ? data.tasks.find(t => t.id === activeModal.id) : null; if (old) Object.assign(old, props); else data.tasks.push(mkTask(title, props.category, type, duration, props)); closeModal(); store(); render(); toast(old ? 'تسک ویرایش شد' : 'تسک اضافه شد') }
function openEventModal(id = null) { const e = id ? data.events.find(x => x.id === id) : null; activeModal = { type: 'event', id }; const v = e || mkEvent('', 6, '09:00', '10:00', 'personal'); document.getElementById('modalRoot').innerHTML = `<div class="modal-wrap" data-close-overlay="1"><div class="modal" role="dialog" aria-modal="true"><div class="section-title"><h2>${id ? 'ویرایش رویداد ثابت' : 'افزودن رویداد ثابت'}</h2><button class="tiny" data-close-modal>×</button></div><form id="eventForm" class="form-grid">${formField('عنوان', `<input name="title" required value="${htmlEscape(v.title)}">`, true)}${formField('شروع', `<input name="start" type="time" required value="${v.start}">`)}${formField('پایان', `<input name="end" type="time" required value="${v.end}">`)}${formField('نوع', `<select name="kind"><option value="school" ${v.kind === 'school' ? 'selected' : ''}>دانشگاه</option><option value="gym" ${v.kind === 'gym' ? 'selected' : ''}>ورزش</option><option value="personal" ${v.kind === 'personal' ? 'selected' : ''}>شخصی</option></select>`)}<div class="form-group full"><label>روزهای تکرار</label><div class="multi-days">${SATWEEK.map((day, i) => ({ day, num: (i + 6) % 7 })).map(x => `<label><input name="days" type="checkbox" value="${x.num}" ${v.days.includes(x.num) ? 'checked' : ''}>${x.day}</label>`).join('')}</div></div>${formField('یادداشت', `<textarea name="notes">${htmlEscape(v.notes || '')}</textarea>`, true)}<div class="foot full"><button class="btn" type="button" data-close-modal>انصراف</button><button class="btn btn-primary" type="submit">ذخیرهٔ رویداد</button></div></form>${id ? `<button class="btn btn-danger" style="margin-top:12px" data-delete-event="${id}">حذف رویداد</button>` : ''}</div></div>`; document.getElementById('eventForm').addEventListener('submit', e => { e.preventDefault(); const f = new FormData(e.target); const days = f.getAll('days').map(Number); if (!days.length) { toast('حداقل یک روز انتخاب کن'); return } if (f.get('start') >= f.get('end')) { toast('زمان پایان باید بعد از شروع باشد'); return } const obj = { title: f.get('title').trim(), start: f.get('start'), end: f.get('end'), kind: f.get('kind'), days, notes: f.get('notes') || '' }; if (id) Object.assign(data.events.find(x => x.id === id), obj); else data.events.push({ ...obj, id: uid() }); closeModal(); store(); render(); toast('رویداد ذخیره شد') }) }
function closeModal() { calendarState = null; document.getElementById('modalRoot').innerHTML = ''; activeModal = null }
let toastTimer; function toast(s) { let el = document.getElementById('toast'); el.textContent = s; el.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 3800) }
function downloadBackup() { const txt = JSON.stringify({ ...data, exportedAt: new Date().toISOString() }, null, 2), blob = new Blob([txt], { type: 'application/json' }), u = URL.createObjectURL(blob), a = document.createElement('a'); a.href = u; a.download = 'momentum-backup-' + today() + '.json'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 1000) }
async function importBackup(file) { if (!file) return; try { const str = await file.text(), obj = normalize(JSON.parse(str)); if (!confirm('داده‌های فعلی با اطلاعات فایل جایگزین شوند؟ قبلش خروجی پشتیبان بگیر.')) return; data = obj; store(); render(); toast('پشتیبان بازیابی شد') } catch (e) { toast('فایل پشتیبان معتبر نیست') } }

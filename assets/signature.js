/*
 * Motion Signature — phase 1.
 * A local, deterministic artwork PREVIEW and day report. No AI image is
 * generated and no task information is sent to a third-party service.
 * The future AI integration must use a separate authenticated backend.
 */
let signatureSelection = new Set();

function signatureCompletion(t, date) {
  if (t.type === 'once') {
    const completion = data.completions[t.id + '|once'];
    if (!completion) return null;
    // One-time tasks are attributed to the day they were actually checked,
    // not necessarily the day for which they were originally scheduled.
    if (Number.isFinite(completion.at)) {
      const timestamp = new Date(completion.at);
      return Number.isNaN(timestamp.getTime()) || isoDate(timestamp) !== date ? null : completion;
    }
    // Retain compatibility with rare legacy records without a timestamp.
    return t.planned === date ? completion : null;
  }
  // Recurring tasks are completed for a specific calendar day.
  return data.completions[t.id + '|' + date] || null;
}

function signatureCompletedTasks(date) {
  return data.tasks.filter(t => signatureCompletion(t, date));
}

function signatureDayReport(date) {
  const planned = dailyTasks(date);
  const plannedDone = planned.filter(t => isDone(t, date));
  const completed = signatureCompletedTasks(date);
  const xp = completed.reduce((total, t) => {
    const entry = signatureCompletion(t, date);
    return total + (Number(entry?.xp) || 0);
  }, 0);
  const estimatedMinutes = completed.reduce((total, t) => total + Math.max(0, Number(t.duration) || 0), 0);
  return {
    date,
    completed,
    completedCount: completed.length,
    plannedCount: planned.length,
    plannedDoneCount: plannedDone.length,
    percentage: planned.length ? Math.round(plannedDone.length * 100 / planned.length) : null,
    xp,
    estimatedMinutes
  };
}

function signatureHash(text) {
  let h = 2166136261;
  for (const char of String(text)) {
    h ^= char.codePointAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function signatureRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let t = state;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function signatureArtwork(date, tasks, idSuffix = 'card') {
  const descriptors = tasks.map(t => `${t.id}|${t.title}|${t.category || ''}|${t.duration || 0}`).sort();
  const seed = signatureHash(date + '|' + descriptors.join('|'));
  const rand = signatureRandom(seed);
  const token = `sig-${date.replace(/[^0-9]/g, '')}-${idSuffix.replace(/[^a-z0-9-]/gi, '')}`;
  const colors = ['#a795ff', '#71d9d2', '#ffc08e', '#e2a5e6'];
  const paths = [];
  const dots = [];
  const layerCount = Math.min(7, Math.max(2, tasks.length + 1));
  for (let i = 0; i < layerCount; i++) {
    const y = 58 + i * 15 + Math.round(rand() * 15);
    const start = 22 + Math.round(rand() * 40);
    const mid = 125 + Math.round(rand() * 70);
    const end = 290 + Math.round(rand() * 38);
    const hue = colors[(i + Math.floor(rand() * colors.length)) % colors.length];
    const curve = 16 + Math.round(rand() * 42);
    paths.push(`<path d="M${start} ${y} C${start + 62} ${y - curve} ${mid - 40} ${y + curve} ${mid} ${y} S${end - 60} ${y - curve} ${end} ${y + 5}" fill="none" stroke="${hue}" stroke-opacity="${i === 0 ? '.9' : '.54'}" stroke-width="${i === 0 ? '2.5' : '1.1'}" stroke-linecap="round"/>`);
  }
  for (let i = 0; i < Math.min(40, 12 + tasks.length * 6); i++) {
    const x = 12 + Math.round(rand() * 316), y = 10 + Math.round(rand() * 165);
    const radius = (0.7 + rand() * 2).toFixed(1);
    dots.push(`<circle cx="${x}" cy="${y}" r="${radius}" fill="${colors[i % 4]}" opacity="${(0.24 + rand() * .58).toFixed(2)}"/>`);
  }
  return `<svg viewBox="0 0 350 190" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">
    <defs><radialGradient id="${token}-glow"><stop stop-color="#8774e6" stop-opacity=".28"/><stop offset="1" stop-color="#8774e6" stop-opacity="0"/></radialGradient></defs>
    <ellipse cx="175" cy="91" rx="158" ry="84" fill="url(#${token}-glow)"/>
    <ellipse cx="180" cy="98" rx="118" ry="39" transform="rotate(-17 180 98)" fill="none" stroke="#a89cda" stroke-opacity=".27" stroke-width="1" stroke-dasharray="3 7"/>
    ${paths.join('')}${dots.join('')}
    <circle cx="175" cy="95" r="3.5" fill="#ebddff"/><circle cx="175" cy="95" r="13" fill="none" stroke="#a99eff" stroke-opacity=".32"/>
  </svg>`;
}

function signatureOverviewText(report) {
  if (report.completedCount === 0) return 'با انجام اولین کار، ردِ حرکت این روز اینجا شکل می‌گیره.';
  const plural = report.completedCount === 1 ? 'کار' : 'کار';
  return `${fnum(report.completedCount)} ${plural} رو در این روز به پایان رسوندی.`;
}

function renderSignatureCard(date) {
  const report = signatureDayReport(date);
  const chosenDay = date === today() ? 'امروز' : shortDate(date);
  const progress = report.percentage === null ? 'بدون برنامهٔ ثبت‌شده' : `${fnum(report.percentage)}٪ از برنامه`;
  return `<section class="card signature-card" aria-labelledby="signatureCardTitle">
    <div class="signature-card-copy">
      <span class="section-kicker">MOTION SIGNATURE</span>
      <h2 id="signatureCardTitle">امضای حرکت ${chosenDay}</h2>
      <p>${signatureOverviewText(report)}</p>
      <div class="signature-chip-row"><span>${fnum(report.completedCount)} تسک انجام‌شده</span><span>${fnum(report.xp)} XP</span><span>${progress}</span></div>
      <button class="btn btn-primary signature-main-btn" data-signature-open="${date}">${report.completedCount ? 'مرور روز و ساخت پیش‌نمایش' : 'مرور گزارش این روز'} <span aria-hidden="true">←</span></button>
    </div>
    <div class="signature-card-visual" role="img" aria-label="نقش انتزاعی اولیه؛ تصویر هوش مصنوعی نیست">
      ${signatureArtwork(date, report.completed, 'card')}
      <small>پیش‌نمایش محلی</small>
    </div>
  </section>`;
}

function signatureSelectedTasks() {
  if (!activeModal || activeModal.type !== 'daily-signature') return [];
  return signatureCompletedTasks(activeModal.date).filter(t => signatureSelection.has(t.id));
}

function signatureBrief(tasks, date) {
  const report = signatureDayReport(date);
  const categories = [...new Set(tasks.map(t => (t.category || '').trim()).filter(Boolean))];
  return {
    date,
    count: tasks.length,
    titles: tasks.map(t => t.title),
    categories,
    completionPercent: report.percentage,
    // This is an estimate attached to tasks, NOT a measured focus duration.
    estimatedMinutes: tasks.reduce((sum,t) => sum + Math.max(0, Number(t.duration) || 0), 0),
    xp: tasks.reduce((sum,t) => sum + (Number(signatureCompletion(t,date)?.xp) || 0), 0)
  };
}

function signatureBriefMarkup(brief) {
  const headings = brief.titles.map(title => `<li>${htmlEscape(title)}</li>`).join('');
  const categoryText = brief.categories.length ? brief.categories.map(htmlEscape).join('، ') : 'بدون دسته‌بندی';
  return `<div class="signature-brief" aria-live="polite">
    <strong>خلاصهٔ فعالیت‌های انتخاب‌شده</strong>
    <div class="signature-brief-stats"><span>${fnum(brief.count)} فعالیت</span><span>${fnum(brief.xp)} XP</span><span>${fnum(brief.estimatedMinutes)} دقیقه زمان تخمینی</span></div>
    <div class="signature-brief-category"><b>دسته‌ها:</b> ${categoryText}</div>
    <ul>${headings}</ul>
  </div>`;
}

function renderSignaturePreview(date, tasks, prepared = false) {
  if (!tasks.length) return `<div class="signature-preview-empty" aria-live="polite">برای آماده‌کردن امضای حرکت، دست‌کم یک فعالیت رو انتخاب کن.</div>`;
  const brief = signatureBrief(tasks, date);
  return `<div class="signature-preview-content" aria-live="polite">
      <div class="signature-modal-art">${signatureArtwork(date, tasks, 'modal')}<span>${prepared ? 'پیش‌نمایش آماده شد' : 'نمای اولیه'}</span></div>
      ${prepared ? signatureBriefMarkup(brief) : `<p class="hint">${fnum(tasks.length)} فعالیت انتخاب شده. برای دیدن خلاصهٔ روز دکمهٔ پایین رو بزن.</p>`}
      ${prepared ? '<p class="signature-ai-note">این تصویر یک نمونهٔ محلی است؛ ساخت تصویر هنری با AI در مرحلهٔ بعد اضافه می‌شود.</p>' : ''}
    </div>`;
}

function refreshSignatureModal(prepared = false) {
  if (activeModal?.type !== 'daily-signature') return;
  const count = document.getElementById('signatureSelectedCount');
  const selected = signatureSelectedTasks();
  if (count) count.textContent = `${fnum(selected.length)} از ${fnum(signatureCompletedTasks(activeModal.date).length)} انتخاب‌شده`;
  const preview = document.getElementById('signaturePreviewArea');
  if (preview) preview.innerHTML = renderSignaturePreview(activeModal.date, selected, prepared);
  const button = document.getElementById('signaturePrepareBtn');
  if (button) button.disabled = selected.length === 0;
}

function openDailySignature(date = selectedDate) {
  const report = signatureDayReport(date);
  signatureSelection = new Set(report.completed.map(t => t.id));
  activeModal = { type: 'daily-signature', date };
  const taskList = report.completed.length
    ? report.completed.map(t => `<label class="signature-task-option">
         <input type="checkbox" data-signature-include="${htmlEscape(t.id)}" ${signatureSelection.has(t.id) ? 'checked' : ''}/>
         <span><b>${htmlEscape(t.title)}</b><small>${htmlEscape(t.category || 'سایر')}${t.duration ? ` · ${fnum(t.duration)} دقیقه تخمینی` : ''}</small></span>
       </label>`).join('')
    : '<div class="quiet-empty">هنوز کاری برای این تاریخ تکمیل نشده. با تیک‌زدن تسک‌ها، اینجا نمایش داده می‌شن.</div>';
  const dateLabel = date === today() ? 'امروز' : longDate(date);
  const progress = report.percentage === null ? '—' : `${fnum(report.percentage)}٪`;
  document.getElementById('modalRoot').innerHTML = `<div class="modal-wrap signature-modal-wrap" data-close-overlay="1">
    <section class="modal signature-dialog" role="dialog" aria-modal="true" aria-labelledby="signatureModalTitle">
      <div class="section-title"><div><span class="section-kicker">MOTION SIGNATURE</span><h2 id="signatureModalTitle">گزارش ${dateLabel}</h2></div><button class="tiny signature-close" data-close-modal aria-label="بستن">×</button></div>
      <p class="signature-dialog-description">کارهایی که پیش بردی رو مرور کن و انتخاب کن کدوم‌ها بخشی از امضای حرکتت باشن.</p>
      <div class="signature-report-grid"><div><span>تکمیل برنامه</span><strong>${progress}</strong></div><div><span>کارهای انجام‌شده</span><strong>${fnum(report.completedCount)}</strong></div><div><span>XP این روز</span><strong>${fnum(report.xp)}</strong></div></div>
      <div class="signature-dialog-grid">
        <div class="signature-pick-area">
          <div class="signature-selection-title"><b>فعالیت‌های امروز</b><small id="signatureSelectedCount">${fnum(report.completed.length)} از ${fnum(report.completed.length)} انتخاب‌شده</small></div>
          <div class="signature-task-options" id="signatureTaskOptions">${taskList}</div>
          <p class="signature-privacy"><span aria-hidden="true">♧</span> بخش امضای حرکت فعلاً هیچ اطلاعاتی به سرویس AI ارسال نمی‌کند؛ همگام‌سازی رمزگذاری‌شدهٔ GitHub مستقل است. در نسخهٔ AI ارسال اطلاعات فقط با تأیید تو انجام می‌شود.</p>
        </div>
        <div class="signature-preview-area" id="signaturePreviewArea">${renderSignaturePreview(date, report.completed)}</div>
      </div>
      <div class="signature-modal-footer"><button class="btn btn-ghost" data-close-modal>بستن</button><button class="btn btn-primary" id="signaturePrepareBtn" data-signature-prepare ${report.completedCount ? '' : 'disabled'}>آماده‌سازی پیش‌نمایش</button></div>
    </section>
  </div>`;
  document.querySelector('.signature-close')?.focus();
}

function onSignatureSelectionChange(input) {
  if (activeModal?.type !== 'daily-signature') return;
  const id = input.dataset.signatureInclude;
  if (input.checked) signatureSelection.add(id);
  else signatureSelection.delete(id);
  refreshSignatureModal();
}
function prepareDailySignature() {
  if (activeModal?.type !== 'daily-signature') return;
  const tasks = signatureSelectedTasks();
  if (!tasks.length) return;
  refreshSignatureModal(true);
}

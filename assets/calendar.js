// Accessible, dependency-free Jalali date picker used in task dialogs.
// Dates saved to the existing task model are still Gregorian ISO (YYYY-MM-DD).
let calendarState = null;
const JALALI_MONTH_NAMES = ['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];
const JALALI_WEEKDAYS = ['ش','ی','د','س','چ','پ','ج'];

function calendarMonthFirst(year, month) {
  return jalaliToISO(`${year}/${String(month).padStart(2, '0')}/01`);
}
function calendarValidDay(year, month, day) {
  return jalaliToISO(`${year}/${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}`);
}
function calendarMonthDays(year, month) {
  if (month <= 6) return 31;
  if (month <= 11) return 30;
  return calendarValidDay(year, month, 30) ? 30 : 29;
}
function calendarShift(monthDelta) {
  if (!calendarState) return;
  const absolute = calendarState.year * 12 + (calendarState.month - 1) + monthDelta;
  const year = Math.floor(absolute / 12), month = (absolute % 12) + 1;
  if (year < 1200 || year > 1600) return;
  calendarState.year = year;
  calendarState.month = month;
  renderJalaliCalendar();
}
function openJalaliCalendar(field) {
  if (field !== 'due' && field !== 'planned') return;
  if (!document.getElementById('taskForm')) return;
  const current = document.querySelector(`#taskForm input[name="${field}"]`)?.value;
  const initial = persianParts(fromIso(current || today()));
  calendarState = { field, year: initial.y, month: initial.m };
  renderJalaliCalendar();
}
function closeJalaliCalendar() {
  if (!calendarState) return;
  const field = calendarState.field;
  document.getElementById('jalaliPickerOverlay')?.remove();
  calendarState = null;
  document.querySelector(`#taskForm [data-calendar-open="${field}"]`)?.focus();
}
function setJalaliCalendarDate(iso) {
  if (!calendarState) return;
  const field = calendarState.field;
  const input = document.querySelector(`#taskForm input[name="${field}"]`);
  const display = document.querySelector(`#taskForm [data-calendar-label="${field}"]`);
  if (input && display) {
    input.value = iso;
    display.textContent = iso ? isoToJalali(iso) : 'انتخاب تاریخ';
    display.closest('button')?.classList.toggle('has-date', !!iso);
  }
  closeJalaliCalendar();
}
function renderJalaliCalendar() {
  if (!calendarState) return;
  const {year,month,field} = calendarState;
  const start = calendarMonthFirst(year, month);
  if (!start) return;
  const firstOffset = (fromIso(start).getDay() + 1) % 7; // Saturday is column 0
  const days = calendarMonthDays(year, month);
  const selected = document.querySelector(`#taskForm input[name="${field}"]`)?.value || '';
  const todayIso = today();
  const rows = Array.from({length: Math.ceil((firstOffset + days)/7)*7}, (_, index) => {
    const day = index - firstOffset + 1;
    if (day < 1 || day > days) return '<span class="jalali-empty" aria-hidden="true"></span>';
    const iso = calendarValidDay(year,month,day);
    return `<button type="button" class="jalali-day ${selected === iso ? 'selected' : ''} ${todayIso === iso ? 'today' : ''}" data-calendar-day="${iso}" aria-label="${fnum(day)} ${JALALI_MONTH_NAMES[month-1]} ${fnum(year)}" aria-pressed="${selected === iso}">${fnum(day)}</button>`;
  }).join('');
  const title = field === 'due' ? 'انتخاب ددلاین' : 'انتخاب روز انجام';
  const overlay = document.getElementById('jalaliPickerOverlay') || document.createElement('div');
  overlay.id = 'jalaliPickerOverlay';
  overlay.className = 'jalali-overlay';
  overlay.setAttribute('data-calendar-backdrop','');
  overlay.innerHTML = `<div class="jalali-dialog" role="dialog" aria-modal="true" aria-labelledby="jalaliDialogTitle">
    <div class="jalali-heading"><div><small>تقویم شمسی</small><h3 id="jalaliDialogTitle">${title}</h3></div><button type="button" class="jalali-close" data-calendar-close aria-label="بستن تقویم">×</button></div>
    <div class="jalali-month-bar"><button type="button" class="jalali-arrow" data-calendar-step="-1" aria-label="ماه قبل">‹</button><strong>${JALALI_MONTH_NAMES[month-1]} ${fnum(year)}</strong><button type="button" class="jalali-arrow" data-calendar-step="1" aria-label="ماه بعد">›</button></div>
    <div class="jalali-weekdays">${JALALI_WEEKDAYS.map(d=>`<span>${d}</span>`).join('')}</div>
    <div class="jalali-grid">${rows}</div>
    <div class="jalali-footer"><button type="button" class="jalali-footer-btn" data-calendar-clear>بدون تاریخ</button><button type="button" class="jalali-footer-btn primary" data-calendar-today>امروز</button></div>
  </div>`;
  if (!overlay.isConnected) document.getElementById('modalRoot').appendChild(overlay);
  overlay.querySelector('.jalali-close')?.focus();
}
function handleJalaliCalendarClick(event) {
  if (!calendarState) return false;
  const target = event.target.closest('[data-calendar-close],[data-calendar-step],[data-calendar-day],[data-calendar-clear],[data-calendar-today],[data-calendar-backdrop]');
  if (!target) return false;
  const d = target.dataset;
  if ('calendarBackdrop' in d) { if (event.target === target) closeJalaliCalendar(); return true; }
  if ('calendarClose' in d) closeJalaliCalendar();
  else if ('calendarStep' in d) calendarShift(Number(d.calendarStep));
  else if ('calendarDay' in d) setJalaliCalendarDate(d.calendarDay);
  else if ('calendarClear' in d) setJalaliCalendarDate('');
  else if ('calendarToday' in d) setJalaliCalendarDate(today());
  return true;
}

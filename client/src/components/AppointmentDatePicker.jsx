import { useState, useRef, useEffect } from 'react';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const toDateStr = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);

const buildMonthGrid = (monthDate) => {
  const first = startOfMonth(monthDate);
  const gridStart = new Date(first);
  gridStart.setDate(gridStart.getDate() - first.getDay());

  const days = [];
  const cursor = new Date(gridStart);
  for (let i = 0; i < 42; i++) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
};

/**
 * Lightweight calendar dropdown (no external date library) that disables
 * Sundays and any date before minDate directly in the grid, instead of
 * relying on a native <input type="date"> - which can't grey out
 * individual weekdays - and rejecting the pick after the fact.
 */
const AppointmentDatePicker = ({ value, onChange, minDate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const minD = new Date(`${minDate}T00:00:00`);
  const [viewMonth, setViewMonth] = useState(startOfMonth(value ? new Date(`${value}T00:00:00`) : minD));
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false);
    };
    const handleEscape = (e) => { if (e.key === 'Escape') setIsOpen(false); };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const canGoPrevMonth = startOfMonth(viewMonth) > startOfMonth(minD);

  const isDisabled = (d) => d.getDay() === 0 || toDateStr(d) < minDate;

  const handlePick = (d) => {
    if (isDisabled(d)) return;
    onChange(toDateStr(d));
    setIsOpen(false);
  };

  const displayLabel = value
    ? new Date(`${value}T00:00:00`).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : 'Select a date';

  return (
    <div className="po-appt-datepicker" ref={containerRef}>
      <button
        type="button"
        className="po-appt-datepicker-trigger"
        onClick={() => setIsOpen((open) => !open)}
      >
        <i className="fas fa-calendar-alt"></i>
        <span className={value ? '' : 'po-appt-datepicker-placeholder'}>{displayLabel}</span>
      </button>

      {isOpen && (
        <div className="po-appt-datepicker-popover">
          <div className="po-appt-datepicker-header">
            <button
              type="button"
              className="po-appt-datepicker-nav"
              disabled={!canGoPrevMonth}
              onClick={() => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
            >
              <i className="fas fa-chevron-left"></i>
            </button>
            <span className="po-appt-datepicker-month">
              {viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
            <button
              type="button"
              className="po-appt-datepicker-nav"
              onClick={() => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
            >
              <i className="fas fa-chevron-right"></i>
            </button>
          </div>

          <div className="po-appt-datepicker-weekdays">
            {WEEKDAY_LABELS.map((label) => (
              <span key={label} className={label === 'Sun' ? 'po-appt-datepicker-sun' : ''}>{label}</span>
            ))}
          </div>

          <div className="po-appt-datepicker-grid">
            {buildMonthGrid(viewMonth).map((d) => {
              const inMonth = d.getMonth() === viewMonth.getMonth();
              const disabled = isDisabled(d);
              const selected = value === toDateStr(d);
              return (
                <button
                  key={toDateStr(d)}
                  type="button"
                  disabled={disabled}
                  onClick={() => handlePick(d)}
                  className={[
                    'po-appt-datepicker-day',
                    !inMonth ? 'outside' : '',
                    disabled ? 'disabled' : '',
                    selected ? 'selected' : ''
                  ].filter(Boolean).join(' ')}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>

          <p className="po-appt-datepicker-hint">Clinic closed Sundays &middot; open Mon&ndash;Sat, 9:00 AM&ndash;6:30 PM</p>
        </div>
      )}
    </div>
  );
};

export default AppointmentDatePicker;

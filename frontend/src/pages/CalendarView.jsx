import { useLang } from "../context/LanguageContext";
import T from "../i18n";
import { useState } from "react";
import "./CalendarView.css";

export default function CalendarView({ assignments = [], onAssignmentClick }) {
  const [lang] = useLang();
  const t = T[lang] || T.en;

  const [currentDate, setCurrentDate] = useState(new Date());
  const [hoveredDay, setHoveredDay] = useState(null);
  const [viewMode, setViewMode] = useState("month");

  const months = lang === 'de'
    ? ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']
    : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const weekDayLabels = lang === 'de'
    ? ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const getWeekStart = (date) => {
    const result = new Date(date);
    const weekday = result.getDay();
    const diff = (weekday + 6) % 7;
    result.setDate(result.getDate() - diff);
    result.setHours(0, 0, 0, 0);
    return result;
  };

  const getFirstDayOfMonth = (date) => {
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    return firstDay === 0 ? 6 : firstDay - 1;
  };

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getAssignmentsForDate = (date) => {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    return assignments.filter((assignment) => {
      const due = new Date(assignment.dueDate);
      return due >= start && due <= end;
    });
  };

  const getAssignmentsForMonth = (date) => {
    return assignments.filter((assignment) => {
      const due = new Date(assignment.dueDate);
      return due.getFullYear() === date.getFullYear() && due.getMonth() === date.getMonth();
    });
  };

  const getUrgencyColor = (dueDate, submitted) => {
    if (submitted) return 'green';

    const now = new Date();
    const due = new Date(dueDate);
    const daysUntilDue = Math.ceil((due - now) / (1000 * 60 * 60 * 24));

    if (daysUntilDue < 0) return 'red';
    if (daysUntilDue <= 2) return 'orange';
    if (daysUntilDue <= 7) return 'yellow';
    return 'blue';
  };

  const getDayIndicatorColor = (day) => {
    const dayAssignments = getAssignmentsForDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
    if (dayAssignments.length === 0) return null;

    const colors = dayAssignments.map((assignment) => getUrgencyColor(assignment.dueDate, assignment.submitted));
    if (colors.includes('red')) return 'red';
    if (colors.includes('orange')) return 'orange';
    if (colors.includes('yellow')) return 'yellow';
    if (colors.includes('green')) return 'green';
    return 'blue';
  };

  const weekStart = getWeekStart(currentDate);
  const weekDates = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    return date;
  });

  const firstDay = getFirstDayOfMonth(currentDate);
  const daysInMonth = getDaysInMonth(currentDate);

  const prevPeriod = () => {
    if (viewMode === 'week') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - 7));
    } else if (viewMode === 'year') {
      setCurrentDate(new Date(currentDate.getFullYear() - 1, currentDate.getMonth(), currentDate.getDate()));
    } else {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    }
  };

  const nextPeriod = () => {
    if (viewMode === 'week') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 7));
    } else if (viewMode === 'year') {
      setCurrentDate(new Date(currentDate.getFullYear() + 1, currentDate.getMonth(), currentDate.getDate()));
    } else {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    }
  };

  const goToday = () => {
    setCurrentDate(new Date());
  };

  const getPeriodLabel = () => {
    if (viewMode === 'week') {
      const start = weekDates[0];
      const end = weekDates[6];
      const startLabel = start.toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-US', { month: 'short', day: 'numeric' });
      const endLabel = end.toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-US', { month: 'short', day: 'numeric' });
      return `${t.week || 'Week'}: ${startLabel} - ${endLabel}`;
    }

    if (viewMode === 'year') {
      return `${currentDate.getFullYear()}`;
    }

    return `${months[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  };

  const renderAssignmentLink = (assignment) => (
    <button
      key={assignment.id}
      type="button"
      className={`calendar-assignment-pill ${getUrgencyColor(assignment.dueDate, assignment.submitted)}`}
      onClick={() => onAssignmentClick?.(assignment.id)}
    >
      {assignment.title}
    </button>
  );

  const renderMonthTile = (monthIndex) => {
    const monthDate = new Date(currentDate.getFullYear(), monthIndex, 1);
    const monthlyAssignments = getAssignmentsForMonth(monthDate);

    return (
      <div
        key={monthIndex}
        className="calendar-month-tile"
        onClick={() => {
          setViewMode('month');
          setCurrentDate(monthDate);
        }}
      >
        <div className="calendar-month-title">{months[monthIndex]}</div>
        <div className="month-assign-count">{monthlyAssignments.length} {t.assignment || 'Assignments'}</div>
        <div className="month-assignments">
          {monthlyAssignments.slice(0, 3).map((assignment) => (
            <button
              key={assignment.id}
              type="button"
              className={`calendar-assignment-pill small ${getUrgencyColor(assignment.dueDate, assignment.submitted)}`}
              onClick={(event) => {
                event.stopPropagation();
                onAssignmentClick?.(assignment.id);
              }}
            >
              {assignment.title}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const todayDayNumber = new Date().getDate();
  const isToday = (day) => {
    return day === todayDayNumber &&
           currentDate.getMonth() === new Date().getMonth() &&
           currentDate.getFullYear() === new Date().getFullYear();
  };

  return (
    <div className="calendar-view">
      <div className="calendar-header">
        <button className="calendar-nav-btn" onClick={prevPeriod}>
          ‹
        </button>
        <h3 className="calendar-title">{getPeriodLabel()}</h3>
        <button className="calendar-nav-btn" onClick={nextPeriod}>
          ›
        </button>
      </div>

      <div className="calendar-mode-controls">
        <button
          type="button"
          className={`calendar-mode-btn ${viewMode === 'week' ? 'active' : ''}`}
          onClick={() => setViewMode('week')}
        >
          {t.week || 'Week'}
        </button>
        <button
          type="button"
          className={`calendar-mode-btn ${viewMode === 'month' ? 'active' : ''}`}
          onClick={() => setViewMode('month')}
        >
          {t.month || 'Month'}
        </button>
        <button
          type="button"
          className={`calendar-mode-btn ${viewMode === 'year' ? 'active' : ''}`}
          onClick={() => setViewMode('year')}
        >
          {t.year || 'Year'}
        </button>
        <button type="button" className="calendar-today-btn" onClick={goToday}>
          {t.today || 'Today'}
        </button>
      </div>

      <div className="calendar-legend">
        <div className="legend-item">
          <span className="legend-dot red"></span>
          <span className="legend-text">{t.overdue || 'Overdue'}</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot orange"></span>
          <span className="legend-text">{t.urgent || 'Urgent (≤2 days)'}</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot yellow"></span>
          <span className="legend-text">{t.soon || 'Soon (≤7 days)'}</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot green"></span>
          <span className="legend-text">{t.submitted || 'Submitted'}</span>
        </div>
      </div>

      {viewMode === 'month' && (
        <div className="calendar-grid">
          {weekDayLabels.map((day) => (
            <div key={day} className="calendar-weekday">
              {day}
            </div>
          ))}

          {[...Array(firstDay)].map((_, i) => (
            <div key={`empty-${i}`} className="calendar-day empty"></div>
          ))}

          {[...Array(daysInMonth)].map((_, i) => {
            const day = i + 1;
            const dayAssignments = getAssignmentsForDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
            const indicatorColor = getDayIndicatorColor(day);

            return (
              <div
                key={day}
                className={`calendar-day ${isToday(day) ? 'today' : ''} ${dayAssignments.length > 0 ? 'has-assignments' : ''}`}
                onMouseEnter={() => setHoveredDay(day)}
                onMouseLeave={() => setHoveredDay(null)}
              >
                <span className="calendar-day-number">{day}</span>
                {indicatorColor && (
                  <span className={`calendar-day-indicator ${indicatorColor}`}></span>
                )}

                {hoveredDay === day && dayAssignments.length > 0 && (
                  <div className="calendar-tooltip">
                    {dayAssignments.map((assignment) => (
                      <button
                        key={assignment.id}
                        type="button"
                        className={`tooltip-assignment ${getUrgencyColor(assignment.dueDate, assignment.submitted)}`}
                        onClick={() => onAssignmentClick?.(assignment.id)}
                      >
                        <div className="tooltip-title">{assignment.title}</div>
                        <div className="tooltip-time">
                          {new Date(assignment.dueDate).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {viewMode === 'week' && (
        <div className="calendar-week-grid">
          {weekDates.map((date) => {
            const dayAssignments = getAssignmentsForDate(date);
            const isCurrent = date.getDate() === new Date().getDate() && date.getMonth() === new Date().getMonth() && date.getFullYear() === new Date().getFullYear();
            return (
              <div key={date.toISOString()} className={`calendar-week-day ${isCurrent ? 'today' : ''}`}>
                <div className="week-day-header">
                  <strong>{weekDayLabels[date.getDay() === 0 ? 6 : date.getDay() - 1]}</strong>
                  <span>{date.toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-US', { day: '2-digit', month: 'short' })}</span>
                </div>
                <div className="week-day-assignments">
                  {dayAssignments.length === 0 ? (
                    <div className="no-assignment">—</div>
                  ) : (
                    dayAssignments.map((assignment) => renderAssignmentLink(assignment))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {viewMode === 'year' && (
        <div className="calendar-year-grid">
          {Array.from({ length: 12 }, (_, monthIndex) => renderMonthTile(monthIndex))}
        </div>
      )}
    </div>
  );
}

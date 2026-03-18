import { useLang } from "../context/LanguageContext";
import T from "../i18n";
import { useState } from "react";
import "./CalendarView.css";

export default function CalendarView({ assignments }) {
  const [lang] = useLang();
  const t = T[lang] || T.en;
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [hoveredDay, setHoveredDay] = useState(null);

  const months = lang === 'de' 
    ? ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']
    : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const weekDays = lang === 'de'
    ? ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Get first day of month and total days
  const getFirstDayOfMonth = (date) => {
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    return firstDay === 0 ? 6 : firstDay - 1; // Convert Sunday=0 to Monday=0
  };

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  // Get assignments for a specific day
  const getAssignmentsForDay = (day) => {
    const dayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const dayStart = new Date(dayDate.setHours(0, 0, 0, 0));
    const dayEnd = new Date(dayDate.setHours(23, 59, 59, 999));

    return assignments.filter(assignment => {
      const dueDate = new Date(assignment.dueDate);
      return dueDate >= dayStart && dueDate <= dayEnd;
    });
  };

  // Get urgency color based on days until due
  const getUrgencyColor = (dueDate, submitted) => {
    if (submitted) return 'green'; // Already submitted
    
    const now = new Date();
    const due = new Date(dueDate);
    const daysUntilDue = Math.ceil((due - now) / (1000 * 60 * 60 * 24));

    if (daysUntilDue < 0) return 'red'; // Overdue
    if (daysUntilDue <= 2) return 'orange'; // Urgent (2 days or less)
    if (daysUntilDue <= 7) return 'yellow'; // Soon (within a week)
    return 'blue'; // Normal
  };

  // Get dot color for day indicator
  const getDayIndicatorColor = (day) => {
    const dayAssignments = getAssignmentsForDay(day);
    if (dayAssignments.length === 0) return null;

    // Find the most urgent assignment
    const colors = dayAssignments.map(a => getUrgencyColor(a.dueDate, a.submitted));
    
    if (colors.includes('red')) return 'red';
    if (colors.includes('orange')) return 'orange';
    if (colors.includes('yellow')) return 'yellow';
    if (colors.includes('green')) return 'green';
    return 'blue';
  };

  const firstDay = getFirstDayOfMonth(currentDate);
  const daysInMonth = getDaysInMonth(currentDate);

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const today = new Date();
  const isToday = (day) => {
    return day === today.getDate() &&
           currentDate.getMonth() === today.getMonth() &&
           currentDate.getFullYear() === today.getFullYear();
  };

  return (
    <div className="calendar-view">
      {/* Calendar Header */}
      <div className="calendar-header">
        <button className="calendar-nav-btn" onClick={prevMonth}>
          ‹
        </button>
        <h3 className="calendar-title">
          {months[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h3>
        <button className="calendar-nav-btn" onClick={nextMonth}>
          ›
        </button>
      </div>

      {/* Legend */}
      <div className="calendar-legend">
        <div className="legend-item">
          <span className="legend-dot red"></span>
          <span className="legend-text">{t.overdue || "Overdue"}</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot orange"></span>
          <span className="legend-text">{t.urgent || "Urgent (≤2 days)"}</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot yellow"></span>
          <span className="legend-text">{t.soon || "Soon (≤7 days)"}</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot green"></span>
          <span className="legend-text">{t.submitted || "Submitted"}</span>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="calendar-grid">
        {/* Week day headers */}
        {weekDays.map(day => (
          <div key={day} className="calendar-weekday">
            {day}
          </div>
        ))}

        {/* Empty cells for days before month starts */}
        {[...Array(firstDay)].map((_, i) => (
          <div key={`empty-${i}`} className="calendar-day empty"></div>
        ))}

        {/* Days of the month */}
        {[...Array(daysInMonth)].map((_, i) => {
          const day = i + 1;
          const dayAssignments = getAssignmentsForDay(day);
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

              {/* Tooltip on hover */}
              {hoveredDay === day && dayAssignments.length > 0 && (
                <div className="calendar-tooltip">
                  {dayAssignments.map(assignment => (
                    <div
                      key={assignment.id}
                      className={`tooltip-assignment ${getUrgencyColor(assignment.dueDate, assignment.submitted)}`}
                    >
                      <div className="tooltip-title">{assignment.title}</div>
                      <div className="tooltip-time">
                        {new Date(assignment.dueDate).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

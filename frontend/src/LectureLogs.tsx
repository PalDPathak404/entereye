import React, { useState, useEffect, useMemo } from 'react';

// --- SVG Icons ---
const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
  </svg>
);

const CalendarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);

const ChevronLeft = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"></polyline>
  </svg>
);

const ChevronRight = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"></polyline>
  </svg>
);

const ClockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);

// --- Component ---
interface LectureLogsProps {
  selectedBatchId?: string | null;
}

export default function LectureLogs({ selectedBatchId }: LectureLogsProps) {
  const [lectures, setLectures] = useState<any[]>([]);
  const [selectedLecture, setSelectedLecture] = useState<any | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingLectures, setLoadingLectures] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(false);
  
  // Calendar State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  useEffect(() => {
    fetchLectures();
  }, [selectedBatchId]); // Update if batch changes (though currently history fetches all or filtered)

  const fetchLectures = async () => {
    try {
      setLoadingLectures(true);
      const url = selectedBatchId 
        ? `http://localhost:5000/api/lectures/history?batchId=${selectedBatchId}`
        : 'http://localhost:5000/api/lectures/history';
        
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setLectures(data.lectures || []);
      }
    } catch (err) {
      console.error('Error fetching lectures:', err);
    } finally {
      setLoadingLectures(false);
    }
  };

  const fetchLogs = async (lectureId: string) => {
    try {
      setLoadingLogs(true);
      const res = await fetch(`http://localhost:5000/api/logs/lecture/${lectureId}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Error fetching logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleDeleteLecture = async (lectureId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card expansion
    if (!window.confirm("Are you sure you want to delete this lecture and all its attendance logs? This cannot be undone.")) {
      return;
    }

    try {
      const res = await fetch(`http://localhost:5000/api/lectures/${lectureId}`, {
        method: 'DELETE',
      });
      
      if (res.ok) {
        setLectures(prev => prev.filter(l => l._id !== lectureId));
        if (selectedLecture?._id === lectureId) {
          setSelectedLecture(null);
          setLogs([]);
        }
      } else {
        alert("Failed to delete lecture.");
      }
    } catch (err) {
      console.error("Error deleting lecture:", err);
      alert("Error deleting lecture.");
    }
  };

  const handleSelectLecture = (lecture: any) => {
    if (selectedLecture?._id === lecture._id) {
      setSelectedLecture(null);
      setLogs([]);
    } else {
      setSelectedLecture(lecture);
      fetchLogs(lecture._id);
    }
  };

  const formatDateLabel = (date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };
  
  const formatTimeInfo = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // --- Calendar Logic ---
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const prevMonth = () => setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentYear, currentMonth + 1, 1));

  // Determine which days have lectures
  const lecturesByDate = useMemo(() => {
    const map: Record<string, any[]> = {};
    lectures.forEach(lecture => {
      const d = new Date(lecture.startTime);
      const dateKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(lecture);
    });
    return map;
  }, [lectures]);

  // Determine lectures for the currently selected date
  const filteredLectures = useMemo(() => {
    if (!selectedDate) return [];
    const dateKey = `${selectedDate.getFullYear()}-${selectedDate.getMonth()}-${selectedDate.getDate()}`;
    return lecturesByDate[dateKey] || [];
  }, [selectedDate, lecturesByDate]);


  // Generate Calendar Grid
  const renderCalendar = () => {
    const blanks = Array(firstDayOfMonth).fill(null);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const totalSlots = [...blanks, ...days];

    return (
      <div style={{ background: 'rgba(30,30,30,0.8)', borderRadius: '16px', padding: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, color: 'white', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px' }}>
            <CalendarIcon />
            {monthNames[currentMonth]} {currentYear}
          </h3>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={prevMonth} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', color: 'white', padding: '6px', cursor: 'pointer', display: 'flex' }}><ChevronLeft /></button>
            <button onClick={nextMonth} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', color: 'white', padding: '6px', cursor: 'pointer', display: 'flex' }}><ChevronRight /></button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', textAlign: 'center', marginBottom: '10px' }}>
          {dayNames.map(day => (
            <div key={day} style={{ color: '#64748b', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>{day}</div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
          {totalSlots.map((day, index) => {
            if (!day) return <div key={`blank-${index}`} style={{ aspectRatio: '1/1' }} />;
            
            const dateKey = `${currentYear}-${currentMonth}-${day}`;
            const hasLectures = lecturesByDate[dateKey]?.length > 0;
            const isSelected = selectedDate?.getDate() === day && selectedDate?.getMonth() === currentMonth && selectedDate?.getFullYear() === currentYear;
            const isToday = new Date().getDate() === day && new Date().getMonth() === currentMonth && new Date().getFullYear() === currentYear;

            return (
              <div
                key={day}
                onClick={() => {
                  setSelectedDate(new Date(currentYear, currentMonth, day));
                  setSelectedLecture(null); // Reset selection
                }}
                style={{
                  aspectRatio: '1/1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: isSelected ? 700 : 500,
                  transition: 'all 0.2s',
                  position: 'relative',
                  color: isSelected ? '#1a1a1a' : (isToday ? '#f59e0b' : 'white'),
                  background: isSelected 
                    ? 'linear-gradient(135deg, #f59e0b, #d97706)' 
                    : (hasLectures ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.03)'),
                  border: isToday && !isSelected ? '1px solid #f59e0b' : '1px solid transparent',
                  boxShadow: isSelected ? '0 4px 15px rgba(245, 158, 11, 0.4)' : 'none'
                }}
              >
                {day}
                {hasLectures && !isSelected && (
                  <div style={{ position: 'absolute', bottom: '6px', width: '4px', height: '4px', borderRadius: '50%', background: '#38bdf8' }} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', gap: '25px', color: 'white' }}>
      
      {/* Left Panel: Calendar */}
      <div style={{ flex: '0 0 350px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#38bdf8', boxShadow: '0 0 10px #38bdf8' }} />
          Lecture History
        </h2>
        {renderCalendar()}
      </div>

      {/* Right Panel: Lectures for selected date */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '15px' }}>
        
        <div style={{ padding: '24px', background: 'rgba(30, 30, 30, 0.5)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <h3 style={{ margin: 0, fontSize: '18px', color: '#f8fafc' }}>
            Lectures on {selectedDate ? formatDateLabel(selectedDate) : 'Select a Date'}
          </h3>
          {!selectedBatchId && (
            <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#f59e0b' }}>Viewing all batches. Select a batch to filter.</p>
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px', paddingRight: '10px' }}>
          {loadingLectures ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Loading lectures...</div>
          ) : filteredLectures.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#64748b', background: 'rgba(30,30,30,0.3)', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.1)' }}>
               No lectures found for this date.
            </div>
          ) : (
            filteredLectures.map((lecture) => (
              <div key={lecture._id} style={{ 
                background: 'rgba(30, 30, 30, 0.9)', 
                borderRadius: '12px', 
                border: selectedLecture?._id === lecture._id ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.1)',
                overflow: 'hidden',
                transition: 'all 0.2s',
                boxShadow: selectedLecture?._id === lecture._id ? '0 0 20px rgba(56,189,248,0.15)' : 'none'
              }}>
                <div 
                  onClick={() => handleSelectLecture(lecture)}
                  style={{ 
                    padding: '20px', 
                    cursor: 'pointer', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    background: selectedLecture?._id === lecture._id ? 'rgba(56, 189, 248, 0.05)' : 'transparent',
                  }}
                >
                  <div>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: 'white', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {lecture.subject}
                    </h3>
                    <div style={{ display: 'flex', gap: '15px', fontSize: '13px', color: '#94a3b8' }}>
                      <span>Batch: <strong style={{ color: '#e2e8f0' }}>{lecture.batchId?.name || 'Unknown'}</strong></span>
                      <span>Teacher: <strong style={{ color: '#e2e8f0' }}>{lecture.teacherId?.name || 'Unknown'}</strong></span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '14px', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
                         <ClockIcon />
                         {formatTimeInfo(lecture.startTime)} - {lecture.endTime ? formatTimeInfo(lecture.endTime) : 'Unknown'}
                      </div>
                    </div>
                    {/* Delete Icon */}
                    <button 
                      onClick={(e) => handleDeleteLecture(lecture._id, e)}
                      style={{ 
                        background: 'rgba(239, 68, 68, 0.1)', 
                        border: '1px solid rgba(239, 68, 68, 0.2)', 
                        color: '#ef4444', 
                        padding: '10px', 
                        borderRadius: '8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                      title="Delete Lecture"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>

                {/* Expanded Logs View */}
                {selectedLecture?._id === lecture._id && (
                  <div style={{ 
                    padding: '24px', 
                    borderTop: '1px solid rgba(56, 189, 248, 0.2)',
                    background: 'rgba(15, 23, 42, 0.8)' 
                  }}>
                    <h4 style={{ margin: '0 0 20px 0', fontSize: '16px', color: '#38bdf8' }}>Attendance Activity Logs</h4>
                    
                    {loadingLogs ? (
                      <div style={{ color: '#94a3b8', fontSize: '14px', textAlign: 'center', padding: '20px' }}>Loading logs...</div>
                    ) : logs.length === 0 ? (
                      <div style={{ color: '#64748b', fontSize: '14px', textAlign: 'center', padding: '20px' }}>No student entry/exit activity recorded for this lecture.</div>
                    ) : (
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px', fontSize: '14px' }}>
                          <thead>
                            <tr style={{ color: '#94a3b8', textAlign: 'left' }}>
                              <th style={{ padding: '0 15px 10px 15px', fontWeight: 600 }}>Student Name</th>
                              <th style={{ padding: '0 15px 10px 15px', fontWeight: 600 }}>Roll No</th>
                              <th style={{ padding: '0 15px 10px 15px', fontWeight: 600 }}>Exit Time</th>
                              <th style={{ padding: '0 15px 10px 15px', fontWeight: 600 }}>Entry Time</th>
                              <th style={{ padding: '0 15px 10px 15px', fontWeight: 600 }}>Duration</th>
                              <th style={{ padding: '0 15px 10px 15px', fontWeight: 600 }}>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {logs.map((log) => (
                              <tr key={log._id} style={{ background: 'rgba(255,255,255,0.03)', color: '#e2e8f0' }}>
                                <td style={{ padding: '12px 15px', borderRadius: '8px 0 0 8px' }}>{log.name}</td>
                                <td style={{ padding: '12px 15px' }}>{log.rollNo}</td>
                                <td style={{ padding: '12px 15px' }}>{formatTimeInfo(log.exitTime)}</td>
                                <td style={{ padding: '12px 15px' }}>{log.entryTime ? formatTimeInfo(log.entryTime) : 'Did not return'}</td>
                                <td style={{ padding: '12px 15px' }}>{log.entryTime ? `${log.duration} min` : '-'}</td>
                                <td style={{ padding: '12px 15px', borderRadius: '0 8px 8px 0' }}>
                                  <span style={{ 
                                    padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
                                    background: log.status === 'exceeded' || !log.entryTime ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
                                    color: log.status === 'exceeded' || !log.entryTime ? '#ef4444' : '#10b981',
                                    border: `1px solid ${log.status === 'exceeded' || !log.entryTime ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`
                                  }}>
                                    {!log.entryTime ? 'OUTSIDE' : log.status === 'exceeded' ? 'EXCEEDED' : 'NORMAL'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}

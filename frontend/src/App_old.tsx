import { useState, useEffect, useRef } from 'react'
import * as faceapi from 'face-api.js';
import { socket } from "./lib/socket";

// Add CSS animations and fonts for face detection
const style = document.createElement('style');
style.textContent = `
  @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800&family=Rajdhani:wght@300;400;500;600;700&display=swap');
  
  @keyframes pulse-border {
    0%, 100% { border-color: #f59e0b; box-shadow: 0 0 20px rgba(245, 158, 11, 0.6); }
    50% { border-color: #fbbf24; box-shadow: 0 0 30px rgba(251, 191, 36, 0.8); }
  }
  
  @keyframes pulse-dot {
    0%, 100% { transform: scale(1); opacity: 0.8; }
    50% { transform: scale(1.2); opacity: 1; }
  }
  
  @keyframes pulse-red {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  * {
    font-family: 'Rajdhani', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  }
  
  h1, h2, h3, h4, h5, h6 {
    font-family: 'Orbitron', 'Rajdhani', sans-serif;
    letter-spacing: 0.5px;
  }
  
  body {
    font-family: 'Rajdhani', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 50%, #1a1a1a 100%);
    background-attachment: fixed;
    min-height: 100vh;
    margin: 0;
    padding: 0;
    color: #e5e5e5;
  }
  
  * {
    box-sizing: border-box;
  }
  
  .glass-card {
    background: rgba(30, 30, 30, 0.9);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(245, 158, 11, 0.2);
    border-radius: 16px;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
  }
  
  .gradient-button {
    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
    border: none;
    border-radius: 10px;
    color: #1a1a1a;
    font-weight: 600;
    transition: all 0.3s ease;
    box-shadow: 0 4px 15px rgba(245, 158, 11, 0.3);
  }
  
  .gradient-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(245, 158, 11, 0.5);
  }
`;
document.head.appendChild(style);

import './App.css'
import LectureLogs from './LectureLogs';

function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'logs'>('dashboard');
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [outsideStudents, setOutsideStudents] = useState<any[]>([]);
  const [studentsMap, setStudentsMap] = useState<Record<string, any>>({});
  const [isLoadingStudents, setIsLoadingStudents] = useState(true);
  const [isModelsLoaded, setIsModelsLoaded] = useState(false);
  const [streamError, setStreamError] = useState(false);
  const [, setTick] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Session management state
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [currentLecture, setCurrentLecture] = useState<any>(null);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [sessionDuration, setSessionDuration] = useState(0);
  
  // Student registration modal state
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  
  // Start Lecture modal state
  const [showStartLectureModal, setShowStartLectureModal] = useState(false);
  const [lectureSubject, setLectureSubject] = useState("General");

  // 3. Run interval
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Session timer effect
  useEffect(() => {
    if (!isSessionActive || !sessionStartTime) return;
    
    const interval = setInterval(() => {
      const now = new Date();
      const diff = Math.floor((now.getTime() - sessionStartTime.getTime()) / 1000);
      setSessionDuration(diff);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isSessionActive, sessionStartTime]);

  // Helper to format session duration
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Helper to format timestamp
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  // 4. Create functions
  const getDuration = (exitTime: string) => {
    const now = new Date();
    const exit = new Date(exitTime);

    const diff = Math.floor((now.getTime() - exit.getTime()) / 1000);

    const minutes = Math.floor(diff / 60);
    const seconds = diff % 60;

    return `${minutes}m ${seconds}s`;
  };

  const isExceeded = (exitTime: string) => {
    const now = new Date();
    const exit = new Date(exitTime);

    const diff = (now.getTime() - exit.getTime()) / (1000 * 60);
    return diff > 7;
  };

  // Session control functions
  const handleStartLecture = () => {
    if (!lectureSubject) return;

    socket.emit("start_session", {
      batchId: selectedBatchId,
      teacherId: "507f1f77bcf86cd799439011", // Valid MongoDB ObjectId format (mock teacher)
      subject: lectureSubject
    });
    
    setShowStartLectureModal(false);
  };

  const startSession = () => {
    if (!selectedBatchId) {
      alert("Please select a batch first");
      return;
    }
    setShowStartLectureModal(true);
  };

  const stopSession = () => {
    if (!selectedBatchId) return;
    
    if (confirm("Are you sure you want to end this lecture?")) {
      socket.emit("stop_session", {
        batchId: selectedBatchId
      });
    }
  };

  // 1. Load Face Models (USER STEP 1)
  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = '/models';
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        ]);
        console.log("FaceAPI models loaded (including recognition net)");
        setIsModelsLoaded(true);
      } catch (err) {
        console.error("Error loading face models:", err);
      }
    };
    loadModels();
  }, []);

  // 1. Fetch Batches on mount
  useEffect(() => {
    const fetchBatches = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/batches");
        if (!response.ok) throw new Error("Failed to fetch batches");
        const data = await response.json();
        const fetchedBatches = data.batches || [];
        setBatches(fetchedBatches);
        
        if (fetchedBatches.length > 0) {
          setSelectedBatchId(fetchedBatches[0]._id);
        } else {
          setIsLoadingStudents(false); // No batches, so nothing more to load.
        }
      } catch (error) {
        console.error("Error fetching batches:", error);
        setIsLoadingStudents(false); // Error fetching, stop loading.
      }
    };
    fetchBatches();
  }, [isModelsLoaded]); // Wait for models before finishing global loading if possible, though not strictly required

  // 2. Fetch Students when selectedBatchId changes
  useEffect(() => {
    if (!selectedBatchId) return;

    const fetchStudents = async () => {
      setIsLoadingStudents(true);
      try {
        console.log("Using batch:", selectedBatchId);
        console.log("Fetching students for batch:", selectedBatchId);
        const response = await fetch(`http://localhost:5000/api/students?batchId=${selectedBatchId}`);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("Students API response:", data);

        if (data.students) {
          const map: Record<string, any> = {};
          data.students.forEach((student: any) => {
            const sid = student._id.toString().trim();
            map[sid] = {
              name: student.name,
              rollNo: student.rollNo,
            };
          });
          setStudentsMap(map);
          console.log("Final studentsMap Keys:", Object.keys(map));
        }
      } catch (error) {
        console.error("Error fetching students:", error);
      } finally {
        setIsLoadingStudents(false);
      }
    };

    fetchStudents();
  }, [selectedBatchId]);

  // 3. Fetch Outside Students when selectedBatchId changes
  const fetchOutsideStudents = async (batchId: string) => {
    try {
      const res = await fetch(`http://localhost:5000/api/logs/outside?batchId=${batchId}`);
      if (!res.ok) throw new Error("Failed to fetch outside students");
      const data = await res.json();

      setOutsideStudents(data.students || []);
      console.log("Fetched outside students:", data);
    } catch (err) {
      console.error("Error fetching outside students", err);
    }
  };

  useEffect(() => {
    if (!selectedBatchId) return;
    fetchOutsideStudents(selectedBatchId);
  }, [selectedBatchId]);

  // 3. Socket Connection and Listeners
  useEffect(() => {
    socket.on("connect", () => {
      console.log("Connected:", socket.id);
      setIsConnected(true);
      if (selectedBatchId) {
        socket.emit("join_batch", selectedBatchId);
        console.log("Joined batch (on connect):", selectedBatchId);
      }
    });

    socket.on("disconnect", () => {
      console.log("Disconnected");
      setIsConnected(false);
    });

    socket.on("student_exit", (data) => {
      console.log("EXIT EVENT RAW DATA:", data);
      const exitSid = data.studentId?.toString().trim();
      const exitTime = new Date();
      
      // Prepend to outside students list
      setOutsideStudents((prev) => [{ 
        ...data, 
        studentId: exitSid, 
        isNew: true,
        exitTime: exitTime.toISOString()
      }, ...prev]);
      
      // Remove isNew flag after animation
      setTimeout(() => {
        setOutsideStudents((prev) => 
          prev.map(s => s.studentId === exitSid ? { ...s, isNew: false } : s)
        );
      }, 1000);
    });

    socket.on("student_entry", (data) => {
      console.log("ENTRY EVENT RAW DATA:", data);
      const entrySid = data.studentId?.toString().trim();
      // Mark for removal from outside list
      setOutsideStudents((prev) =>
        prev.map((s) => 
          s.studentId.toString().trim() === entrySid 
            ? { ...s, isRemoving: true } 
            : s
        )
      );

      // Actually remove after fade-out animation
      setTimeout(() => {
        setOutsideStudents((prev) =>
          prev.filter((s) => s.studentId.toString().trim() !== entrySid)
        );
      }, 400);
    });

    // Session management events
    socket.on("session_started", (data) => {
      console.log("Session started:", data);
      setIsSessionActive(true);
      setSessionStartTime(new Date());
      setSessionDuration(0);
      setCurrentLecture({
        lectureId: data.lectureId,
        subject: data.subject,
        startTime: data.startTime
      });
    });

    socket.on("session_ended", (data) => {
      console.log("Session ended:", data);
      setIsSessionActive(false);
      setSessionStartTime(null);
      setSessionDuration(0);
      setCurrentLecture(null);
      // Keep activity log for review after session ends
    });

    socket.on("session_status", (data) => {
      console.log("Session status:", data);
      if (data.active) {
        setIsSessionActive(true);
      }
    });

    socket.on("session_result", (data) => {
      console.log("Session result:", data);
      if (!data.success) {
        alert(data.message);
      }
    });

    socket.on("detection_ack", (data) => {
      // Face detection acknowledged by server
      console.log("Detection acknowledged:", data);
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("student_exit");
      socket.off("student_entry");
      socket.off("session_started");
      socket.off("session_ended");
      socket.off("session_status");
      socket.off("session_result");
      socket.off("detection_ack");
    };
  }, [selectedBatchId, studentsMap]); // Re-bind listeners if needed, though they don't strictly depend on studentsMap state directly, but keeping it safe.

  // 6. Re-join socket room when batch changes
  useEffect(() => {
    if (!selectedBatchId) return;
    socket.emit("join_batch", selectedBatchId);
    console.log("Joined batch (on change):", selectedBatchId);
  }, [selectedBatchId]);

  return (
    <div style={{ 
      height: '100vh', 
      overflow: 'hidden',
      display: 'flex', 
      flexDirection: 'column', 
      background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 50%, #1a1a1a 100%)'
    }}>
      {/* Header */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        padding: '20px 30px',
        background: 'rgba(30, 30, 30, 0.95)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(245, 158, 11, 0.2)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '45px',
                height: '45px',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 15px rgba(245, 158, 11, 0.4)'
              }}>
                <span style={{ fontSize: '20px', color: '#1a1a1a', fontWeight: 700 }}>E</span>
              </div>
              <div>
                <h1 style={{ 
                  margin: 0, 
                  fontSize: '24px', 
                  fontWeight: 700, 
                  color: 'white',
                  letterSpacing: '-0.5px',
                  textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                }}>
                  EnterEye
                </h1>
                <p style={{ 
                  margin: 0, 
                  fontSize: '12px', 
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontWeight: 500
                }}>
                  AI-Powered Classroom Monitoring
                </p>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div style={{
              display: 'flex',
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '12px',
              padding: '4px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              marginLeft: '20px'
            }}>
              <button 
                onClick={() => setActiveTab('dashboard')}
                style={{
                  padding: '8px 16px',
                  background: activeTab === 'dashboard' ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                  color: activeTab === 'dashboard' ? '#f59e0b' : '#94a3b8',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Dashboard
              </button>
              <button 
                onClick={() => setActiveTab('logs')}
                style={{
                  padding: '8px 16px',
                  background: activeTab === 'logs' ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                  color: activeTab === 'logs' ? '#f59e0b' : '#94a3b8',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Lecture Logs
              </button>
            </div>

            <div style={{
              padding: '8px 16px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}>
              <select
                value={selectedBatchId || ''}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: 600,
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="" style={{ background: '#1e293b' }}>Select Batch</option>
                {batches.map((batch) => (
                  <option key={batch._id} value={batch._id} style={{ background: '#1e293b' }}>
                    {batch.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Session Controls */}
            {isSessionActive ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  padding: '8px 16px', 
                  background: 'rgba(245, 158, 11, 0.15)', 
                  borderRadius: '12px',
                  border: '1px solid rgba(245, 158, 11, 0.3)'
                }}>
                  <div style={{ 
                    width: '10px', 
                    height: '10px', 
                    borderRadius: '50%', 
                    backgroundColor: '#f59e0b',
                    boxShadow: '0 0 15px rgba(245, 158, 11, 0.6)',
                    animation: 'pulse-red 2s infinite'
                  }} />
                  <span style={{ fontSize: '13px', color: '#f59e0b', fontWeight: 600 }}>
                    {currentLecture?.subject || 'Lecture Active'}
                  </span>
                </div>
                <button
                  onClick={stopSession}
                  style={{
                    padding: '8px 16px',
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '10px',
                    color: '#ef4444',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                  }}
                >
                  End Lecture
                </button>
              </div>
            ) : (
              <button
                onClick={startSession}
                disabled={!selectedBatchId}
                style={{
                  padding: '8px 16px',
                  background: selectedBatchId ? 'rgba(245, 158, 11, 0.15)' : 'rgba(100, 116, 139, 0.15)',
                  border: selectedBatchId ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(100, 116, 139, 0.3)',
                  borderRadius: '10px',
                  color: selectedBatchId ? '#f59e0b' : '#64748b',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: selectedBatchId ? 'pointer' : 'not-allowed',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  if (selectedBatchId) {
                    e.currentTarget.style.background = 'rgba(245, 158, 11, 0.25)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedBatchId) {
                    e.currentTarget.style.background = 'rgba(245, 158, 11, 0.15)';
                  }
                }}
              >
                Start Lecture
              </button>
            )}

            {/* Register Student Button */}
            <button
              onClick={() => setShowRegisterModal(true)}
              disabled={!selectedBatchId}
              style={{
                padding: '8px 16px',
                background: selectedBatchId ? 'rgba(245, 158, 11, 0.15)' : 'rgba(100, 116, 139, 0.15)',
                border: selectedBatchId ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(100, 116, 139, 0.3)',
                borderRadius: '10px',
                color: selectedBatchId ? '#f59e0b' : '#64748b',
                fontSize: '13px',
                fontWeight: 600,
                cursor: selectedBatchId ? 'pointer' : 'not-allowed',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                if (selectedBatchId) {
                  e.currentTarget.style.background = 'rgba(245, 158, 11, 0.25)';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedBatchId) {
                  e.currentTarget.style.background = 'rgba(245, 158, 11, 0.15)';
                }
              }}
            >
              + Student
            </button>

            {/* Connection Status */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              padding: '8px 16px', 
              background: 'rgba(30, 30, 30, 0.8)', 
              borderRadius: '10px',
              border: '1px solid rgba(245, 158, 11, 0.2)'
            }}>
              <div style={{ 
                width: '10px', 
                height: '10px', 
                borderRadius: '50%', 
                backgroundColor: isConnected ? '#10b981' : '#ef4444',
                boxShadow: isConnected ? '0 0 10px rgba(16, 185, 129, 0.5)' : '0 0 10px rgba(239, 68, 68, 0.5)'
              }} />
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.8)' }}>
                {isConnected ? "Connected" : "Disconnected"}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <main style={{ 
        flex: 1, 
        display: 'flex', 
        alignItems: 'flex-start',
        padding: '25px', 
        gap: '25px', 
        overflowY: 'auto',
        position: 'relative',
        zIndex: 5
      }}>
        {activeTab === 'logs' ? (
          <LectureLogs selectedBatchId={selectedBatchId} />
        ) : (
          <>
            {/* Left Side: Live Feed + Analytics (70%) */}
            <div style={{ flex: 0.7, display: 'flex', flexDirection: 'column', gap: '25px' }}>
          
          {/* Live Feed Card */}
          <div className="glass-card" style={{ 
            padding: '20px',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '15px' 
            }}>
              <h2 style={{ 
                margin: 0, 
                fontSize: '18px', 
                fontWeight: 700, 
                color: 'white',
                textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
              }}>
                Live Camera Feed
              </h2>
              <div style={{
                padding: '6px 12px',
                background: 'rgba(245, 158, 11, 0.15)',
                borderRadius: '8px',
                border: '1px solid rgba(245, 158, 11, 0.3)'
              }}>
                <span style={{ fontSize: '12px', color: '#f59e0b', fontWeight: 600 }}>
                  {isModelsLoaded ? 'Models Ready' : 'Loading...'}
                </span>
              </div>
            </div>
            
            <div style={{ position: 'relative', borderRadius: '16px', overflow: 'hidden', height: '420px' }}>
              <LiveFeed 
                isModelsLoaded={isModelsLoaded} 
                streamError={streamError}
                setStreamError={setStreamError}
                selectedBatchId={selectedBatchId}
                isSessionActive={isSessionActive}
                videoRef={videoRef}
              />
            </div>
          </div>

          {/* Quick Stats */}
          <div className="glass-card" style={{ padding: '20px' }}>
            <h3 style={{ 
              margin: '0 0 15px 0', 
              fontSize: '16px', 
              fontWeight: 700, 
              color: 'white' 
            }}>
              Quick Analytics
            </h3>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
              gap: '15px' 
            }}>
              <div style={{
                padding: '15px',
                background: 'rgba(245, 158, 11, 0.1)',
                borderRadius: '12px',
                border: '1px solid rgba(245, 158, 11, 0.2)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#f59e0b' }}>
                  {Object.keys(studentsMap).length}
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', marginTop: '5px' }}>
                  Total Students
                </div>
              </div>
              <div style={{
                padding: '15px',
                background: 'rgba(16, 185, 129, 0.1)',
                borderRadius: '12px',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#10b981' }}>
                  {outsideStudents.length}
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', marginTop: '5px' }}>
                  Outside
                </div>
              </div>
              <div style={{
                padding: '15px',
                background: 'rgba(59, 130, 246, 0.1)',
                borderRadius: '12px',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#3b82f6' }}>
                  {isSessionActive ? 'Active' : 'Inactive'}
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', marginTop: '5px' }}>
                  Session Status
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Outside Students & Activity Log (30%) */}
        <div style={{ flex: 0.3, display: 'flex', flexDirection: 'column', gap: '25px' }}>
          {/* Session Info Card */}
          {isSessionActive && currentLecture && (
            <div className="glass-card" style={{ 
              padding: '20px',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.15))',
              border: '1px solid rgba(16, 185, 129, 0.3)'
            }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '12px'
              }}>
                <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>Lecture in Progress</span>
                <span style={{ 
                  fontSize: '11px', 
                  padding: '3px 8px',
                  background: 'rgba(16, 185, 129, 0.3)',
                  borderRadius: '6px',
                  color: '#10b981',
                  fontWeight: 600
                }}>ACTIVE</span>
              </div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'white', marginBottom: '8px' }}>
                {currentLecture.subject}
              </div>
              <div style={{ fontSize: '14px', color: '#10b981', fontFamily: 'Orbitron, monospace' }}>
                {formatDuration(sessionDuration)}
              </div>
            </div>
          )}

          {/* Outside Students */}
          <div className="glass-card" style={{ 
            padding: '20px', 
            display: 'flex',
            flexDirection: 'column',
            minHeight: '300px',
            flex: 1
          }}>
            <h3 style={{ 
              margin: '0 0 20px 0', 
              fontSize: '16px', 
              fontWeight: 700, 
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{ 
                width: '10px', 
                height: '10px', 
                borderRadius: '50%', 
                background: '#ef4444',
                boxShadow: '0 0 10px #ef4444',
                animation: 'pulse-red 2s infinite'
              }} />
              Outside Students ({outsideStudents.length})
            </h3>
            
            {isLoadingStudents ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '40px 20px',
                color: 'rgba(255, 255, 255, 0.6)'
              }}>
                <div style={{ 
                  width: '40px', 
                  height: '40px', 
                  border: '3px solid rgba(255, 255, 255, 0.2)',
                  borderTop: '3px solid #f59e0b',
                  borderRadius: '50%',
                  margin: '0 auto 15px',
                  animation: 'spin 1s linear infinite'
                }} />
                <p style={{ margin: 0, fontSize: '14px' }}>Loading students...</p>
              </div>
            ) : outsideStudents.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '40px 20px',
                color: 'rgba(255, 255, 255, 0.6)'
              }}>
                <div style={{ 
                  fontSize: '48px', 
                  marginBottom: '15px',
                  color: '#10b981'
                }}>✓</div>
                <p style={{ margin: 0, fontSize: '14px' }}>All students present</p>
                <p style={{ margin: '8px 0 0 0', fontSize: '12px', opacity: 0.7 }}>
                  Everyone is inside the classroom
                </p>
              </div>
            ) : (
              <div style={{ 
                flex: 1, 
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                {outsideStudents.map((s, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '15px',
                      background: isExceeded(s.exitTime) 
                        ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(220, 38, 38, 0.2))'
                        : 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(217, 119, 6, 0.2))',
                      borderRadius: '12px',
                      border: isExceeded(s.exitTime)
                        ? '1px solid rgba(239, 68, 68, 0.3)'
                        : '1px solid rgba(245, 158, 11, 0.3)',
                      transition: 'all 0.3s ease',
                      opacity: s.isRemoving ? 0.5 : 1,
                      transform: s.isRemoving ? 'translateX(20px)' : 'translateX(0px)'
                    }}
                  >
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      marginBottom: '8px'
                    }}>
                      <span style={{ 
                        fontSize: '14px', 
                        fontWeight: 600, 
                        color: 'white' 
                      }}>
                        {studentsMap[s.studentId]?.name || 'Unknown'}
                      </span>
                      <span style={{
                        fontSize: '10px',
                        padding: '3px 8px',
                        background: isExceeded(s.exitTime) 
                          ? 'rgba(239, 68, 68, 0.3)' 
                          : 'rgba(245, 158, 11, 0.3)',
                        borderRadius: '6px',
                        color: isExceeded(s.exitTime) ? '#ef4444' : '#f59e0b',
                        fontWeight: 700,
                        textTransform: 'uppercase'
                      }}>
                        {isExceeded(s.exitTime) ? 'CRITICAL' : 'WARNING'}
                      </span>
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      fontSize: '12px',
                      color: 'rgba(255, 255, 255, 0.7)'
                    }}>
                      <span>Roll: {studentsMap[s.studentId]?.rollNo || 'N/A'}</span>
                      <span style={{ fontFamily: 'Orbitron, monospace', color: isExceeded(s.exitTime) ? '#ef4444' : '#f59e0b' }}>
                        {getDuration(s.exitTime)}
                      </span>
                    </div>
                    <div style={{ 
                      fontSize: '10px', 
                      color: 'rgba(255, 255, 255, 0.5)',
                      marginTop: '6px'
                    }}>
                      Exited at {formatTime(new Date(s.exitTime))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          </div>
          </>
        )}
      </main>

      {/* Start Lecture Modal */}
      {showStartLectureModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100
        }}>
          <div style={{
            background: 'rgba(30, 30, 30, 0.95)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: '16px',
            padding: '30px',
            width: '400px',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)'
          }}>
            <h2 style={{ margin: '0 0 20px 0', color: 'white', fontSize: '24px' }}>Start New Lecture</h2>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', color: '#94a3b8', marginBottom: '8px', fontSize: '14px' }}>
                Lecture Subject
              </label>
              <input
                type="text"
                value={lectureSubject}
                onChange={(e) => setLectureSubject(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'rgba(15, 23, 42, 0.5)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '16px',
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = '#f59e0b'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
                placeholder="e.g., Mathematics, Physics..."
                autoFocus
              />
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowStartLectureModal(false)}
                style={{
                  padding: '10px 20px',
                  background: 'transparent',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleStartLecture}
                style={{
                  padding: '10px 20px',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#1a1a1a',
                  cursor: 'pointer',
                  fontWeight: 700,
                  boxShadow: '0 4px 15px rgba(245, 158, 11, 0.3)'
                }}
              >
                Start Lecture
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Student Registration Modal */}
      <StudentRegistrationModal
        isOpen={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        batchId={selectedBatchId}
        onStudentRegistered={(student: any) => {
          setStudentsMap(prev => ({ ...prev, [student._id]: { name: student.name, rollNo: student.rollNo } }));
        }}
      />
    </div>
  );
}

export default App;

/**
 * Robust Live Feed component to isolate camera and detection logic.
 */
function LiveFeed({ isModelsLoaded, streamError, setStreamError, selectedBatchId, isSessionActive, videoRef }: any) {
  const [detections, setDetections] = useState<any[]>([]);
  const [recognizedStudent, setRecognizedStudent] = useState<any>(null);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [fps, setFps] = useState(0);
  const [latency, setLatency] = useState(0);
  const [detectionProgress, setDetectionProgress] = useState(0);
  
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(Date.now());
  const prevBoxRef = useRef<any>(null);
  const progressIntervalRef = useRef<any>(null);
  
  // New refs for scanning logic
  const recentlyScannedRef = useRef<Record<string, number>>({});
  const recognizedStudentRef = useRef<any>(null);
  const lastSeenTimeRef = useRef<number | null>(null);
  const missingFramesRef = useRef(0);

  // Initialize Camera (ONCE)
  useEffect(() => {
    let stream: MediaStream | null = null;
    
    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640 } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Camera access error:", err);
        setStreamError(true);
      }
    };
    
    startCamera();
    
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [setStreamError, videoRef]);

  // 2. Detection Logic — fast visual overlay + slow recognition
  useEffect(() => {
    if (!isModelsLoaded) return;

    let fastIntervalId: any;
    let slowIntervalId: any;
    let isRunning = false;

    const runDetection = async () => {
      if (!videoRef.current || isRunning) return;
      const video = videoRef.current;
      if (video.readyState < 2 || video.videoWidth === 0) return;

      isRunning = true;
      const startTime = performance.now();

      try {
        const displaySize = { width: video.offsetWidth, height: video.offsetHeight };
        if (displaySize.width === 0 || displaySize.height === 0) { isRunning = false; return; }

        // FAST PATH: detect face + landmarks only (no descriptor, never crashes)
        const results = await faceapi
          .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.4 }))
          .withFaceLandmarks();

        const resized = faceapi.resizeResults(results, displaySize);
        const primary = resized[0] || null;
        setDetections(primary ? [primary] : []);

        if (!primary) {
           missingFramesRef.current++;
           if (missingFramesRef.current > 3) {
             lastSeenTimeRef.current = null;
             recognizedStudentRef.current = null;
             setRecognizedStudent(null);
             setDetectionProgress(0);
           }
        } else {
           missingFramesRef.current = 0;
        }

        // FPS counter
        frameCountRef.current++;
        const now = Date.now();
        if (now - lastTimeRef.current >= 1000) {
          setFps(frameCountRef.current);
          frameCountRef.current = 0;
          lastTimeRef.current = now;
        }
      } catch (err) {
        console.error('Detection error:', err);
      }

      const endTime = performance.now();
      setLatency(Math.round(endTime - startTime));
      isRunning = false;
    };

    const runRecognition = async () => {
      if (!videoRef.current || !selectedBatchId || isRecognizing || !isSessionActive) return;
      const video = videoRef.current;
      if (video.readyState < 2 || video.videoWidth === 0) return;

      try {
        const displaySize = { width: video.offsetWidth, height: video.offsetHeight };
        if (displaySize.width === 0 || displaySize.height === 0) return;

        // SLOW PATH: with descriptors for recognition
        const results = await faceapi
          .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 512, scoreThreshold: 0.6 }))
          .withFaceLandmarks()
          .withFaceDescriptors();

        const resized = faceapi.resizeResults(results, displaySize);
        const primary = resized[0];
        if (!primary) return; 

        const descriptor = Array.from(primary.descriptor);
        setIsRecognizing(true);
        try {
          const response = await fetch('http://localhost:5000/api/recognize/recognize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ faceDescriptor: descriptor, batchId: selectedBatchId, threshold: 0.6 })
          });
          if (response.ok) {
            const data = await response.json();
            if (data.recognized) {
              const lastScan = recentlyScannedRef.current[data.student._id];
              // 2-second cooldown to prevent multi-scanning
              if (!lastScan || Date.now() - lastScan > 2000) {
                 if (!recognizedStudentRef.current || recognizedStudentRef.current._id !== data.student._id) {
                     recognizedStudentRef.current = data.student;
                     setRecognizedStudent(data.student);
                     lastSeenTimeRef.current = Date.now();
                     setDetectionProgress(0);
                 }
              } else {
                 recognizedStudentRef.current = null;
                 setRecognizedStudent(null);
                 setDetectionProgress(0);
              }
            } else {
              recognizedStudentRef.current = null;
              setRecognizedStudent(null);
              setDetectionProgress(0);
              lastSeenTimeRef.current = null;
            }
          }
        } catch { /* backend may be offline – skip */ }
        finally { setIsRecognizing(false); }
      } catch (err) {
        console.error('Recognition error:', err);
        setIsRecognizing(false);
      }
    };

    const startLoops = () => {
      console.log("Starting detection loops...");
      fastIntervalId = setInterval(runDetection, 100); // Faster for better FPS
      slowIntervalId = setInterval(runRecognition, 400); // Faster recognition
      
      // Progress bar update interval - FAST fill for immediate feedback
      progressIntervalRef.current = setInterval(() => {
        if (recognizedStudentRef.current && lastSeenTimeRef.current) {
          const elapsed = Date.now() - lastSeenTimeRef.current;
          const progress = Math.min((elapsed / 250) * 100, 100); // 250ms for faster feedback
          setDetectionProgress(progress);
          
          if (progress >= 100) {
             // CRITICAL: Ensure face_detected is emitted
             try {
               socket.emit('face_detected', {
                  batchId: selectedBatchId,
                  studentId: recognizedStudentRef.current._id,
                  confidence: parseFloat(recognizedStudentRef.current.confidence)
               });
               console.log('✅ face_detected emitted for:', recognizedStudentRef.current.name);
             } catch (err) {
               console.error('❌ Failed to emit face_detected:', err);
             }
             
             recentlyScannedRef.current[recognizedStudentRef.current._id] = Date.now();
             
             // Show "LOGGED" briefly then reset
             setTimeout(() => {
               recognizedStudentRef.current = null;
               setRecognizedStudent(null);
               setDetectionProgress(0);
               lastSeenTimeRef.current = null;
             }, 300);
          }
        }
      }, 50); // Update every 50ms for smooth animation
    };

    // Start as soon as video is ready
    if (videoRef.current && videoRef.current.readyState >= 2) {
      startLoops();
    } else if (videoRef.current) {
      videoRef.current.addEventListener('loadeddata', startLoops, { once: true });
      videoRef.current.addEventListener('loadedmetadata', startLoops, { once: true });
    }

    return () => {
      if (fastIntervalId) clearInterval(fastIntervalId);
      if (slowIntervalId) clearInterval(slowIntervalId);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [isModelsLoaded, selectedBatchId, isSessionActive]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      {/* Circular Progress Indicator */}
      {recognizedStudent && (
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 25,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: `conic-gradient(
              ${detectionProgress === 100 ? '#10b981' : '#f59e0b'} ${detectionProgress * 3.6}deg,
              rgba(30, 30, 30, 0.9) ${detectionProgress * 3.6}deg
            )`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 0 20px ${detectionProgress === 100 ? 'rgba(16, 185, 129, 0.5)' : 'rgba(245, 158, 11, 0.5)'}`,
            animation: 'none',
            border: '3px solid rgba(255, 255, 255, 0.2)'
          }}>
            <div style={{
              width: '65px',
              height: '65px',
              borderRadius: '50%',
              background: 'rgba(30, 30, 30, 0.95)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column'
            }}>
              <span style={{
                fontSize: '11px',
                fontWeight: 700,
                color: detectionProgress === 100 ? '#10b981' : '#f59e0b'
              }}>
                SCANNING
              </span>
              <span style={{
                fontSize: '14px',
                fontWeight: 800,
                color: 'white'
              }}>
                {Math.max(0, (0.25 - (detectionProgress * 0.0025))).toFixed(1)}s
              </span>
            </div>
          </div>
          <div style={{
            background: 'rgba(30, 30, 30, 0.9)',
            padding: '4px 12px',
            borderRadius: '12px',
            fontSize: '11px',
            color: '#f59e0b',
            fontWeight: 600,
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(245, 158, 11, 0.3)'
          }}>
            Hold still...
          </div>
        </div>
      )}

      {/* Live Indicator */}
      <div style={{ 
        position: 'absolute', top: '20px', left: '20px', 
        background: 'rgba(30, 30, 30, 0.9)', padding: '6px 14px', borderRadius: '8px', 
        fontSize: '13px', fontWeight: 700, backdropFilter: 'blur(10px)',
        border: '1px solid rgba(245, 158, 11, 0.3)', display: 'flex',
        alignItems: 'center', gap: '10px', color: '#f59e0b', zIndex: 20
      }}>
        <div style={{ 
          width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f59e0b',
          boxShadow: '0 0 10px rgba(245, 158, 11, 0.6)', animation: 'pulse-red 2s infinite'
        }} />
        <span style={{ letterSpacing: '0.1em' }}>LIVE</span>
      </div>

      {/* Recognition Status */}
      {recognizedStudent && (
        <div style={{ 
          position: 'absolute', top: '20px', right: '20px', 
          background: 'rgba(16, 185, 129, 0.15)', 
          padding: '8px 16px', 
          borderRadius: '10px', 
          fontSize: '13px', 
          fontWeight: 700, 
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(16, 185, 129, 0.3)', 
          display: 'flex',
          alignItems: 'center', 
          gap: '10px', 
          color: '#10b981', 
          zIndex: 20
        }}>
          <span>{recognizedStudent.name}</span>
          <span style={{ fontSize: '11px', opacity: 0.8 }}>({(parseFloat(recognizedStudent.confidence) * 100).toFixed(0)}%)</span>
        </div>
      )}

      {!streamError ? (
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', background: 'rgba(26, 26, 26, 0.95)',
          color: '#e5e5e5', zIndex: 2
        }}>
          <div style={{ 
            width: '60px', 
            height: '60px', 
            borderRadius: '50%', 
            background: 'rgba(239, 68, 68, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '15px',
            border: '1px solid rgba(239, 68, 68, 0.3)'
          }}>
            <span style={{ fontSize: '24px', color: '#ef4444' }}>!</span>
          </div>
          <p style={{ fontSize: '14px', fontWeight: 600, color: '#ef4444' }}>Camera Access Denied</p>
          <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)', marginTop: '5px' }}>Please allow camera permissions</p>
        </div>
      )}

      {/* Detections Layer */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10 }}>
        {detections.length > 0 && detections.map((det, i) => {
          const padding = 20;
          const x = det.detection.box.x - padding;
          const y = det.detection.box.y - padding;
          const width = det.detection.box.width + padding * 2;
          const height = det.detection.box.height + padding * 2;

          const smoothFactor = 0.7;
          let smoothedBox;

          if (prevBoxRef.current) {
            smoothedBox = {
              x: prevBoxRef.current.x * smoothFactor + x * (1 - smoothFactor),
              y: prevBoxRef.current.y * smoothFactor + y * (1 - smoothFactor),
              width: prevBoxRef.current.width * smoothFactor + width * (1 - smoothFactor),
              height: prevBoxRef.current.height * smoothFactor + height * (1 - smoothFactor),
            };
          } else {
            smoothedBox = { x, y, width, height };
          }

          prevBoxRef.current = smoothedBox;
          const score = det.detection.score?.toFixed(2) || "0.90";
          const name = recognizedStudent?.name || "DETECTED";
          const boxColor = recognizedStudent ? "#10b981" : "#f59e0b";

          return (
            <div key={i}>
              <div
                style={{
                  position: 'absolute',
                  left: smoothedBox.x,
                  top: smoothedBox.y,
                  width: smoothedBox.width,
                  height: smoothedBox.height,
                  border: `2px solid ${boxColor}`,
                  boxShadow: `0 0 12px ${boxColor}`,
                  borderRadius: "8px",
                  transition: 'all 0.1s linear'
                }}
              >
                <div style={{
                  position: 'absolute', bottom: '100%', left: 0, marginBottom: '5px',
                  background: boxColor, color: '#000', fontSize: '10px', fontWeight: 900,
                  padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase'
                }}>
                  {name} ({score})
                </div>
              </div>

              {/* Facial Landmarks - all 68 points */}
              {det.landmarks &&
                det.landmarks.positions.map((pt: any, idx: number) => (
                  <div
                    key={idx}
                    style={{
                      position: "absolute",
                      left: pt.x - 2,
                      top: pt.y - 2,
                      width: "4px",
                      height: "4px",
                      background: boxColor,
                      borderRadius: "50%",
                      pointerEvents: "none",
                      opacity: 0.85,
                      boxShadow: `0 0 6px ${boxColor}`,
                      animation: 'pulse-dot 1.5s infinite',
                      animationDelay: `${idx * 0.01}s`
                    }}
                  />
                ))}
            </div>
          );
        })}
      </div>

      {/* Bottom Info Bar with Real Stats */}
      <div style={{ 
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '40px',
        background: 'rgba(30, 30, 30, 0.95)',
        backdropFilter: 'blur(10px)',
        borderTop: '1px solid rgba(245, 158, 11, 0.2)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        gap: '20px',
        zIndex: 5
      }}>
        {[
          { label: 'FPS', value: fps || '0' },
          { label: 'Latency', value: `${latency}ms` },
          { label: 'Model', value: 'FaceAPI.js' },
          { label: 'Status', value: recognizedStudent ? `Found: ${recognizedStudent.name}` : 'Scanning' }
        ].map((item, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.5)', fontWeight: 600 }}>{item.label}:</span>
            <span style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 700, textTransform: 'uppercase' }}>{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Student Registration Modal with Face Capture
 */
function StudentRegistrationModal({ isOpen, onClose, batchId, onStudentRegistered }: any) {
  const [name, setName] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedDescriptor, setCapturedDescriptor] = useState<number[] | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [faceDetections, setFaceDetections] = useState<any[]>([]);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [containerDims, setContainerDims] = useState({ width: 0, height: 0 });
  const [isRealtimeActive, setIsRealtimeActive] = useState(true);

  // Dedicated refs for registration modal (independent from main feed)
  const modalVideoRef = useRef<HTMLVideoElement>(null);
  const modalStreamRef = useRef<MediaStream | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Start dedicated camera when modal opens; stop when it closes
  useEffect(() => {
    if (!isOpen) return;

    let detectionInterval: any = null;

    // Start camera immediately without waiting for models
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 640 },
            height: { ideal: 480 },
            frameRate: { ideal: 15 } 
          } 
        });
        modalStreamRef.current = stream;
        if (modalVideoRef.current) {
          modalVideoRef.current.srcObject = stream;
          await modalVideoRef.current.play();
        }
      } catch (err) {
        console.error("Modal camera error:", err);
        setCameraError("Camera access denied or occupied.");
      }
    };

    // Start camera immediately (don't wait for models)
    startCamera();

    // Load models in parallel
    (async () => {
      try {
        const MODEL_URL = '/models';
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        ]);
        console.log("Modal models loaded");
      } catch (err) {
        console.error("Model loading error:", err);
        setCameraError("Failed to load face models.");
      }
    })();

    // Detection loop - starts even before models load
    detectionInterval = setInterval(async () => {
      if (!modalVideoRef.current || modalVideoRef.current.readyState < 2) return;
      if (previewImage || !isRealtimeActive) return; // Pause if captured or capture is in progress
      
      try {
        const results = await faceapi
          .detectAllFaces(
            modalVideoRef.current,
            new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.35 })
          )
          .withFaceLandmarks();
        
        setFaceDetections(results);
        
        // Keep container dims updated
        if (containerRef.current) {
          const w = containerRef.current.offsetWidth;
          const h = containerRef.current.offsetHeight;
          if (w !== containerDims.width || h !== containerDims.height) {
            setContainerDims({ width: w, height: h });
          }
        }
      } catch (err) {
        // Face detection errors are expected before models load, ignore them
      }
    }, 150);

    return () => {
      if (detectionInterval) clearInterval(detectionInterval);
      if (modalStreamRef.current) {
        modalStreamRef.current.getTracks().forEach(t => t.stop());
        modalStreamRef.current = null;
      }
      setFaceDetections([]);
      setCameraError(null);
      setPreviewImage(null);
      setCapturedDescriptor(null);
      setIsRealtimeActive(true);
    };
  }, [isOpen]);

  const recaptureFace = () => {
    setCapturedDescriptor(null);
    setPreviewImage(null);
    setFaceDetections([]);
    setIsRealtimeActive(true);
  };

  const captureFace = async () => {
    if (!modalVideoRef.current || isCapturing) return;
    
    setIsCapturing(true);
    setIsRealtimeActive(false); // Stop the interval detections
    
    try {
      // Clear previous
      setCapturedDescriptor(null);
      setPreviewImage(null);
      
      // Wait for interval to stop and camera to stabilize
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const video = modalVideoRef.current;
      
      // Detect face with higher accuracy for capture
      const results = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.4 }))
        .withFaceLandmarks()
        .withFaceDescriptors();

      if (results.length === 0) {
        alert("No face detected! Please look directly at the camera and try again.");
        setIsRealtimeActive(true);
        return;
      }

      const face = results[0];
      const descriptor = Array.from(face.descriptor) as number[];
      
      // Create preview
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        setPreviewImage(canvas.toDataURL('image/jpeg', 0.85));
      }
      
      setCapturedDescriptor(descriptor);
      console.log("Captured descriptor length:", descriptor.length);
    } catch (err) {
      console.error("Face capture error:", err);
      alert("Error during capture. Please try again.");
      setIsRealtimeActive(true);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleSubmit = async () => {
    if (!name || !rollNo || !capturedDescriptor) {
      alert("Please fill in all fields and capture a face.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('http://localhost:5000/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          rollNo,
          batchId,
          faceDescriptor: capturedDescriptor
        })
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Student ${name} registered successfully!`);
        onStudentRegistered?.(data.student);
        onClose();
        // Reset form
        setName('');
        setRollNo('');
        setCapturedDescriptor(null);
        setPreviewImage(null);
      } else {
        const error = await response.json();
        alert(error.message || "Failed to register student");
      }
    } catch (err) {
      console.error("Registration error:", err);
      alert("Error registering student. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      backdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      overflowY: 'auto',
      padding: '20px'
    }}>
      <div className="glass-card" style={{
        padding: '35px',
        width: '550px',
        maxWidth: '95%',
        position: 'relative',
        margin: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
          <h2 style={{ 
            margin: 0, 
            color: '#f59e0b', 
            fontSize: '22px', 
            fontWeight: 700
          }}>
            Register New Student
          </h2>
          <button 
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              color: 'white',
              fontSize: '20px',
              width: '35px',
              height: '35px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            }}
          >
            ×
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', color: 'rgba(255, 255, 255, 0.7)', fontSize: '13px', marginBottom: '8px', fontWeight: 600 }}>Student Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter student name"
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'rgba(30, 30, 30, 0.8)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: '10px',
                color: 'white',
                fontSize: '15px',
                outline: 'none',
                transition: 'all 0.3s ease'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#f59e0b';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.3)';
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', color: 'rgba(255, 255, 255, 0.7)', fontSize: '13px', marginBottom: '8px', fontWeight: 600 }}>Roll Number</label>
            <input
              type="text"
              value={rollNo}
              onChange={(e) => setRollNo(e.target.value)}
              placeholder="Enter roll number"
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'rgba(30, 30, 30, 0.8)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: '10px',
                color: 'white',
                fontSize: '15px',
                outline: 'none',
                transition: 'all 0.3s ease'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#f59e0b';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.3)';
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', color: 'rgba(255, 255, 255, 0.7)', fontSize: '13px', marginBottom: '8px', fontWeight: 600 }}>Face Capture</label>
            <div
              ref={containerRef}
              style={{
                width: '100%',
                height: '240px',
                background: 'rgba(20, 20, 20, 0.8)',
                borderRadius: '12px',
                overflow: 'hidden',
                position: 'relative',
                border: cameraError ? '2px solid rgba(239, 68, 68, 0.4)' : '2px solid rgba(245, 158, 11, 0.2)'
              }}
            >
              {cameraError ? (
                <div style={{
                  position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  color: '#ef4444', fontSize: '13px', textAlign: 'center', padding: '20px'
                }}>
                  <span style={{ fontSize: '28px', marginBottom: '10px' }}>⚠️</span>
                  {cameraError}
                </div>
              ) : previewImage ? (
                <img 
                  src={previewImage} 
                  alt="Captured face"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <>
                  {/* Dedicated modal camera video */}
                  <video
                    ref={modalVideoRef}
                    autoPlay
                    muted
                    playsInline
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  
                  {/* Face Detection Overlay — dynamically scaled */}
                  {faceDetections.length > 0 && containerDims.width > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      pointerEvents: 'none'
                    }}>
                      {faceDetections.map((det, i) => {
                        const box = det.detection.box;
                        const videoWidth = modalVideoRef.current?.videoWidth || 640;
                        const videoHeight = modalVideoRef.current?.videoHeight || 480;
                        const scaleX = containerDims.width / videoWidth;
                        const scaleY = containerDims.height / videoHeight;
                        const score = det.detection.score?.toFixed(2) || '0.90';
                        
                        return (
                          <div key={i}>
                            {/* Face Bounding Rectangle */}
                            <div
                              style={{
                                position: 'absolute',
                                left: box.x * scaleX,
                                top: box.y * scaleY,
                                width: box.width * scaleX,
                                height: box.height * scaleY,
                                border: '2px solid #f59e0b',
                                borderRadius: '10px',
                                boxShadow: '0 0 20px rgba(245, 158, 11, 0.6)',
                                animation: 'pulse-border 2s infinite'
                              }}
                            >
                              <div style={{
                                position: 'absolute',
                                top: '-26px',
                                left: 0,
                                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                                color: '#1a1a1a',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontSize: '10px',
                                fontWeight: 800,
                                textTransform: 'uppercase',
                                whiteSpace: 'nowrap'
                              }}>
                                FACE ({score})
                              </div>
                            </div>
                            
                            {/* All 68 Landmark Dots */}
                            {det.landmarks && det.landmarks.positions.map((pt: any, idx: number) => (
                              <div
                                key={idx}
                                style={{
                                  position: 'absolute',
                                  left: pt.x * scaleX - 2,
                                  top: pt.y * scaleY - 2,
                                  width: '4px',
                                  height: '4px',
                                  background: '#f59e0b',
                                  borderRadius: '50%',
                                  boxShadow: '0 0 6px rgba(245, 158, 11, 0.9)',
                                  animation: 'pulse-dot 1.5s infinite',
                                  animationDelay: `${idx * 0.015}s`,
                                  pointerEvents: 'none'
                                }}
                              />
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
              
              {capturedDescriptor && !previewImage && (
                <div style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  background: 'rgba(16, 185, 129, 0.9)',
                  color: '#fff',
                  padding: '6px 14px',
                  borderRadius: '10px',
                  fontSize: '11px',
                  fontWeight: 700,
                  boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)'
                }}>
                  ✓ Captured
                </div>
              )}
            </div>
            
            <button
              onClick={capturedDescriptor ? recaptureFace : captureFace}
              disabled={isCapturing}
              style={{
                marginTop: '15px',
                width: '100%',
                padding: '14px',
                background: capturedDescriptor 
                  ? 'rgba(16, 185, 129, 0.15)' 
                  : 'rgba(245, 158, 11, 0.15)',
                border: capturedDescriptor 
                  ? '1px solid rgba(16, 185, 129, 0.3)' 
                  : '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: '10px',
                color: capturedDescriptor ? '#10b981' : '#f59e0b',
                fontSize: '15px',
                fontWeight: 600,
                cursor: isCapturing ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                if (!isCapturing) {
                  e.currentTarget.style.background = capturedDescriptor 
                    ? 'rgba(16, 185, 129, 0.25)' 
                    : 'rgba(245, 158, 11, 0.25)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = capturedDescriptor 
                  ? 'rgba(16, 185, 129, 0.15)' 
                  : 'rgba(245, 158, 11, 0.15)';
              }}
            >
              {isCapturing ? 'Capturing...' : (capturedDescriptor ? 'Re-capture Face' : 'Capture Face')}
            </button>
          </div>

          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !name || !rollNo || !capturedDescriptor}
            style={{
              width: '100%',
              padding: '16px',
              background: (name && rollNo && capturedDescriptor) 
                ? 'linear-gradient(135deg, #f59e0b, #d97706)' 
                : 'rgba(100, 116, 139, 0.2)',
              border: (name && rollNo && capturedDescriptor) 
                ? 'none' 
                : '1px solid rgba(100, 116, 139, 0.3)',
              borderRadius: '10px',
              color: (name && rollNo && capturedDescriptor) ? '#1a1a1a' : '#64748b',
              fontSize: '16px',
              fontWeight: 700,
              cursor: (name && rollNo && capturedDescriptor) && !isSubmitting ? 'pointer' : 'not-allowed',
              transition: 'all 0.3s ease',
              opacity: (name && rollNo && capturedDescriptor) && !isSubmitting ? 1 : 0.6
            }}
            onMouseEnter={(e) => {
              if (name && rollNo && capturedDescriptor && !isSubmitting) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(245, 158, 11, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              if (name && rollNo && capturedDescriptor && !isSubmitting) {
                e.currentTarget.style.transform = 'translateY(0px)';
                e.currentTarget.style.boxShadow = 'none';
              }
            }}
          >
            {isSubmitting ? 'Registering...' : 'Register Student'}
          </button>
        </div>
      </div>
    </div>
  );
}

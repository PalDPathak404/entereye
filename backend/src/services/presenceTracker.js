const Student = require('../models/Student');
const Lecture = require('../models/Lecture');
const AttendanceLog = require('../models/AttendanceLog');

/**
 * Presence Tracking Service
 * Manages real-time student presence detection and attendance logging
 */
class PresenceTracker {
  constructor(io) {
    this.io = io;
    this.activeSessions = new Map(); // batchId -> { lectureId, presentStudents: Map }
    this.detectionBuffer = new Map(); // batchId -> Map(studentId -> lastSeen)
    this.detectionInterval = null;
    this.ABSENCE_THRESHOLD_MS = 8000; // Time before considering student absent (8 seconds)
    this.BUFFER_SIZE = 4; // Number of consecutive misses before marking absent
    this.processedEvents = new Map(); // Track recently processed events to prevent duplicates
    this.EVENT_COOLDOWN_MS = 8000; // 8 second cooldown between same event type for same student
  }

  /**
   * Start a presence tracking session for a batch
   */
  async startSession(batchId, teacherId, subject = 'General') {
    try {
      // Check if session already exists
      if (this.activeSessions.has(batchId)) {
        return { success: false, message: 'Session already active for this batch' };
      }

      // Find or create an active lecture
      let lecture = await Lecture.findOne({ batchId, isActive: true });
      
      if (!lecture) {
        // Create new lecture
        lecture = new Lecture({
          teacherId,
          batchId,
          subject,
          isActive: true,
          startTime: new Date()
        });
        await lecture.save();
      }

      // Initialize session
      this.activeSessions.set(batchId, {
        lectureId: lecture._id,
        presentStudents: new Map(), // studentId -> { lastDetected, detectionCount, isPresent }
        startTime: new Date(),
        subject
      });

      this.detectionBuffer.set(batchId, new Map());

      // Join socket room
      this.io.to(batchId).emit('session_started', {
        batchId,
        lectureId: lecture._id,
        subject,
        startTime: lecture.startTime
      });

      console.log(`✅ Presence session started for batch ${batchId}, lecture ${lecture._id}`);

      return { 
        success: true, 
        lectureId: lecture._id,
        message: 'Session started successfully'
      };
    } catch (error) {
      console.error('❌ Start session error:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Stop a presence tracking session
   */
  async stopSession(batchId) {
    try {
      const session = this.activeSessions.get(batchId);
      if (!session) {
        return { success: false, message: 'No active session for this batch' };
      }

      // Mark all remaining "outside" students as returned
      const outsideLogs = await AttendanceLog.find({
        lectureId: session.lectureId,
        entryTime: null
      });

      const now = new Date();
      for (const log of outsideLogs) {
        log.entryTime = now;
        const diffMs = now - log.exitTime;
        log.duration = Math.round(diffMs / (1000 * 60));
        log.status = log.duration > 7 ? 'exceeded' : 'normal';
        await log.save();

        // Notify clients
        this.io.to(batchId).emit('student_entry', {
          studentId: log.studentId,
          lectureId: session.lectureId,
          entryTime: now,
          duration: log.duration,
          status: log.status,
          autoClosed: true
        });
      }

      // End the lecture
      await Lecture.findByIdAndUpdate(session.lectureId, {
        isActive: false,
        endTime: now
      });

      // Clean up
      this.activeSessions.delete(batchId);
      this.detectionBuffer.delete(batchId);

      this.io.to(batchId).emit('session_ended', {
        batchId,
        lectureId: session.lectureId,
        endTime: now
      });

      console.log(`✅ Presence session ended for batch ${batchId}`);

      return { success: true, message: 'Session ended successfully' };
    } catch (error) {
      console.error('❌ Stop session error:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Process a face detection from the camera feed
   */
  async processDetection(batchId, studentId, confidence) {
    const session = this.activeSessions.get(batchId);
    if (!session) return;

    const studentIdStr = studentId.toString();
    const now = Date.now();

    // Check cooldown to prevent duplicate processing
    const eventKey = `${batchId}-${studentIdStr}-entry`;
    const lastProcessed = this.processedEvents.get(eventKey);
    if (lastProcessed && (now - lastProcessed) < this.EVENT_COOLDOWN_MS) {
      // Just update last seen without logging
      let tracking = session.presentStudents.get(studentIdStr);
      if (tracking) {
        tracking.lastDetected = now;
        tracking.detectionCount++;
      }
      return { success: true, isPresent: tracking?.isPresent || false, detectionCount: tracking?.detectionCount || 0, cooldown: true };
    }

    // Get or create tracking for this student
    let studentTracking = session.presentStudents.get(studentIdStr);

    if (!studentTracking) {
      // First time seeing this student - mark as OUTSIDE, log ENTRY immediately
      studentTracking = {
        studentId: studentIdStr,
        firstDetected: now,
        lastDetected: now,
        detectionCount: 1,
        isPresent: false, // Start OUTSIDE
        consecutiveMisses: 0,
        lastExitTime: null,
        lastEntryTime: null
      };
      session.presentStudents.set(studentIdStr, studentTracking);
      
      // First detection = ENTRY
      await this._markStudentPresent(batchId, studentIdStr, session);
      this.processedEvents.set(eventKey, now);
    } else {
      // Update last seen
      studentTracking.lastDetected = now;
      studentTracking.detectionCount++;
      studentTracking.consecutiveMisses = 0;

      // If student was outside, log ENTRY now
      if (!studentTracking.isPresent) {
        await this._markStudentPresent(batchId, studentIdStr, session);
        this.processedEvents.set(eventKey, now);
      }
    }

    return { 
      success: true, 
      isPresent: studentTracking.isPresent,
      detectionCount: studentTracking.detectionCount
    };
  }

  /**
   * Check for students who haven't been detected recently
   */
  async checkAbsences(batchId) {
    const session = this.activeSessions.get(batchId);
    if (!session) return;

    const now = Date.now();
    const absentStudents = [];

    for (const [studentId, tracking] of session.presentStudents) {
      if (tracking.isPresent) {
        const timeSinceLastSeen = now - tracking.lastDetected;
        
        if (timeSinceLastSeen > this.ABSENCE_THRESHOLD_MS) {
          tracking.consecutiveMisses++;
          
          if (tracking.consecutiveMisses >= this.BUFFER_SIZE) {
            absentStudents.push(studentId);
            // Reset misses so exit doesn't trigger again
            tracking.consecutiveMisses = 0;
          }
        } else {
          // Reset misses if detected within threshold
          tracking.consecutiveMisses = 0;
        }
      }
    }

    // Mark absent students with cooldown check
    for (const studentId of absentStudents) {
      const eventKey = `${batchId}-${studentId}-exit`;
      const lastProcessed = this.processedEvents.get(eventKey);
      if (!lastProcessed || (now - lastProcessed) >= this.EVENT_COOLDOWN_MS) {
        await this._markStudentAbsent(batchId, studentId, session);
        this.processedEvents.set(eventKey, now);
      }
    }
  }

  /**
   * Mark a student as present (returned from outside)
   */
  async _markStudentPresent(batchId, studentId, session) {
    try {
      // Check if already marked present
      const tracking = session.presentStudents.get(studentId);
      if (tracking && tracking.isPresent) {
        return; // Already inside, no need to log entry again
      }

      // Find if there's an open exit log (student was outside)
      const openLog = await AttendanceLog.findOne({
        studentId,
        lectureId: session.lectureId,
        entryTime: null
      });

      const entryTime = new Date();

      if (openLog) {
        // Student is returning - close the exit log
        openLog.entryTime = entryTime;
        const diffMs = entryTime - openLog.exitTime;
        openLog.duration = Math.round(diffMs / (1000 * 60));
        openLog.status = openLog.duration > 7 ? 'exceeded' : 'normal';
        await openLog.save();

        console.log(`✅ Student ${studentId} returned after ${openLog.duration}m`);
      } else {
        // First entry - no exit log exists yet, this is initial check-in
        console.log(`✅ Student ${studentId} initial entry logged`);
      }

      // Update tracking state
      if (tracking) {
        tracking.isPresent = true;
        tracking.consecutiveMisses = 0;
      }

      // Notify clients
      this.io.to(batchId).emit('student_entry', {
        studentId,
        lectureId: session.lectureId,
        entryTime,
        duration: openLog ? openLog.duration : 0,
        status: openLog ? openLog.status : 'normal'
      });

      console.log(`✅ Student ${studentId} marked present`);
    } catch (error) {
      console.error('❌ Mark present error:', error);
    }
  }

  /**
   * Mark a student as absent (exited)
   */
  async _markStudentAbsent(batchId, studentId, session) {
    try {
      // Double-check student is still marked as present before logging exit
      const tracking = session.presentStudents.get(studentId);
      if (!tracking || !tracking.isPresent) {
        console.log(`⚠️ Student ${studentId} already outside, skipping duplicate exit`);
        return; // Already outside, don't log again
      }

      // Check if already logged as outside
      const existingLog = await AttendanceLog.findOne({
        studentId,
        lectureId: session.lectureId,
        entryTime: null
      });

      if (existingLog) {
        // Already outside, just update tracking
        tracking.isPresent = false;
        tracking.consecutiveMisses = 0;
        return;
      }

      // Create exit log
      const exitTime = new Date();
      const log = await AttendanceLog.create({
        studentId,
        lectureId: session.lectureId,
        exitTime
      });

      // Update tracking
      tracking.isPresent = false;
      tracking.consecutiveMisses = 0;
      tracking.lastExitTime = Date.now();

      // Notify clients
      this.io.to(batchId).emit('student_exit', {
        studentId,
        lectureId: session.lectureId,
        exitTime
      });

      console.log(`⚠️ Student ${studentId} marked absent (exited)`);
    } catch (error) {
      console.error('❌ Mark absent error:', error);
    }
  }

  /**
   * Get current session status
   */
  getSessionStatus(batchId) {
    const session = this.activeSessions.get(batchId);
    if (!session) {
      return { active: false };
    }

    const presentStudents = [];
    const outsideStudents = [];

    for (const [studentId, tracking] of session.presentStudents) {
      if (tracking.isPresent) {
        presentStudents.push({
          studentId,
          firstDetected: tracking.firstDetected,
          lastDetected: tracking.lastDetected,
          detectionCount: tracking.detectionCount
        });
      } else {
        outsideStudents.push({
          studentId,
          exitedAt: tracking.lastDetected
        });
      }
    }

    return {
      active: true,
      lectureId: session.lectureId,
      subject: session.subject,
      startTime: session.startTime,
      presentCount: presentStudents.length,
      outsideCount: outsideStudents.length,
      presentStudents,
      outsideStudents
    };
  }

  /**
   * Get all active sessions
   */
  getAllActiveSessions() {
    const sessions = [];
    for (const [batchId, session] of this.activeSessions) {
      sessions.push({
        batchId,
        lectureId: session.lectureId,
        subject: session.subject,
        startTime: session.startTime
      });
    }
    return sessions;
  }
}

module.exports = PresenceTracker;

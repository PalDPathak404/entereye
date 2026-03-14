# • EntryEye

**Smart Classroom Attendance & Exit Tracking System**

---

## Table of Contents
- [Problem Statement](#problem-statement)
- [Solution Overview](#solution-overview)
- [Features](#features)
  - [Core Functionalities](#core-functionalities)
  - [Hackathon Mandatory Features](#hackathon-mandatory-features)
  - [Additional Enhancements](#additional-enhancements)
- [Technology Stack](#technology-stack)
- [System Architecture](#system-architecture)
- [Database Design](#database-design)
- [API Endpoints](#api-endpoints)
- [Facial Recognition Workflow](#facial-recognition-workflow)
- [Installation & Setup](#installation--setup)
- [Deployment](#deployment)
- [Author](#author)

---

## • Problem Statement

In multi‑storey college buildings, students often leave classrooms during lectures under the pretext of visiting the washroom, but instead go to hostels or other areas, wasting significant lecture time. The existing manual logbook system is inefficient, easily bypassed, and lacks real‑time monitoring. Professors need an automated, fair, and transparent method to track student exits/entries and automatically deduct attendance when the absence exceeds a reasonable limit (e.g., 5‑10 minutes). The solution must be hardware‑free (using only existing webcams), support multiple batches/classes, and provide detailed analytics.

---

## • Solution Overview

**EntryEye** is a full‑stack web application that leverages browser‑based facial recognition to automatically log student exits and returns during lectures. When a student leaves the classroom, they simply look at a webcam near the door; the system identifies them, records the exit time, and starts a timer. Upon return, another quick scan logs the entry time, calculates the total absence duration, and if it exceeds a configurable threshold, the student’s attendance for that lecture is automatically marked as “cut”. Teachers monitor everything in real time through a live dashboard, and comprehensive reports are available for analysis. The system supports multiple batches, with easy batch switching and student registration via face enrollment.

---

## • Features

### Core Functionalities

- **User Authentication & Roles**
  - Secure signup/login for teachers and administrators.
  - Role‑based access: Admin (manage batches, settings) and Teacher (monitor lectures, view reports).

- **Batch Management**
  - Create, edit, delete batches (e.g., “CS 2024”).
  - Activate/deactivate a batch – only the active batch is tracked.
  - Switch active batch with a single click.

- **Student Registration (Face Enrollment)**
  - Webcam‑based capture of 3‑5 face images.
  - Generation of a unique **face descriptor** (128‑dimensional vector) using face‑api.js.
  - Descriptor stored in MongoDB linked to student details (name, roll number, batch).
  - QR code per batch for quick registration access.

- **Real‑Time Exit/Entry Tracking**
  - Continuous webcam feed on the teacher’s dashboard.
  - Face detection and recognition against the active batch’s stored descriptors.
  - On exit: creates an attendance log with `exitTime` and links to the current lecture.
  - On entry: updates the same log with `entryTime`, calculates duration, and updates status (`normal` / `exceeded`).
  - Visual confirmation on screen (e.g., “John exited at 10:32”).

- **Attendance Logic & Thresholds**
  - Configurable time threshold (default 7 minutes) via settings.
  - Automatic attendance deduction if any exit duration exceeds the threshold.
  - Supports multiple exits per student during a single lecture (cumulative calculation optional).
  - Grace period (e.g., 30 seconds) to account for system delays.
  - Manual override for exceptional cases.

- **Live Teacher Dashboard**
  - Real‑time list of students currently outside with running timers.
  - Alerts when a student exceeds the threshold.
  - Start/end lecture controls.
  - Live webcam feed with bounding boxes and names.

- **Analytics & Reporting**
  - Filter logs by batch, date, student, or lecture.
  - Student‑wise detailed logs (exit/entry times, durations, status).
  - Lecture‑wise attendance summary.
  - Export reports as CSV or PDF.
  - Visual charts (average exit duration, peak exit times, etc.) using Chart.js.

- **Settings & Configuration**
  - General settings: threshold, grace period, auto‑deduction toggle.
  - Batch management interface.
  - User management (admin only).
  - Light/Dark theme toggle (persisted).

### Hackathon Mandatory Features

| Feature | Implementation |
|--------|----------------|
| **Routing & Navigation** | React Router with pages: `/login`, `/register`, `/dashboard`, `/reports`, `/settings`, `/profile`. Protected routes for authenticated users. |
| **React Hooks** | `useState` for local state, `useEffect` for side effects (camera init, API calls), `useRef` for video element, `useContext` for auth/theme. |
| **State Management** | Context API for authentication and theme; Redux Toolkit (optional) for complex dashboard state (live logs, outside list). |
| **Authentication** | JWT stored in localStorage; protected routes redirect to login; Axios interceptors attach token. |
| **Theme Support** | Tailwind dark mode classes + context toggle; preference saved in localStorage. |
| **Search, Filter, Sorting** | Reports page: search by student name, filter by date range/batch, sort by duration or exit time. |
| **Debouncing** | Applied to search input (300ms delay before API call). |
| **Pagination** | Backend `skip`/`limit`; frontend pagination controls for logs. |
| **CRUD Operations** | Create (register student, batch), Read (fetch logs), Update (settings, attendance override), Delete (remove student/batch). |
| **API Integration** | RESTful endpoints with proper error handling and loading states. |
| **Form Handling & Validation** | React Hook Form + Zod; inline validation messages. |
| **Responsive UI** | Tailwind responsive classes ensure usability on desktop, tablet, and mobile. |
| **Error Handling** | Try‑catch in API calls; user‑friendly error messages; appropriate HTTP status codes. |

### Additional Enhancements

- **QR Code Registration** – Each batch has a unique QR code; students scan to auto‑fill batch ID.
- **Email Notifications** – Send lecture summary reports to teachers via Nodemailer.
- **Offline Mode** – IndexedDB caches recent logs; sync when connection resumes.
- **Voice Feedback** – Text‑to‑speech confirms exit/entry.
- **Liveness Detection** – Blink detection to prevent photo spoofing.
- **Multi‑Camera Support** – Simulated tabs for entry/exit cameras.

---

## • Technology Stack

| Layer       | Technology                          |
|-------------|-------------------------------------|
| **Frontend** | React (Vite) + TypeScript           |
|             | Tailwind CSS                        |
|             | React Router DOM                    |
|             | Context API / Redux Toolkit         |
|             | face‑api.js (TensorFlow.js)         |
|             | Socket.IO‑client                    |
|             | React Hook Form + Zod               |
|             | Chart.js / Recharts                 |
| **Backend**  | Node.js + Express                   |
|             | Socket.IO                           |
|             | bcryptjs                            |
|             | jsonwebtoken                        |
|             | multer (optional)                   |
| **Database** | MongoDB (Atlas or local)            |
|             | Mongoose ODM                        |
| **DevOps**   | Docker (optional)                   |
|             | Vercel (frontend) + Render (backend)|

---

## • System Architecture


- Face detection and recognition run entirely in the browser using face‑api.js, minimizing server load and latency.
- Only face descriptors (arrays of numbers) are sent to and stored in the database – no actual images are saved.
- Real‑time updates are pushed via Socket.IO when new logs are created.

---

## • Database Design (Mongoose Schemas)

```javascript
// User
{
  name: String,
  email: { type: String, unique: true },
  password: String, // hashed
  role: { type: String, enum: ['admin', 'teacher'] },
  createdAt: Date
}

// Batch
{
  name: String,
  year: Number,
  isActive: { type: Boolean, default: false },
  createdBy: { type: ObjectId, ref: 'User' },
  createdAt: Date
}

// Student
{
  name: String,
  rollNo: String,
  batchId: { type: ObjectId, ref: 'Batch' },
  faceDescriptor: [Number], // 128 numbers
  createdAt: Date
}

// Lecture
{
  teacherId: { type: ObjectId, ref: 'User' },
  batchId: { type: ObjectId, ref: 'Batch' },
  subject: String,
  startTime: Date,
  endTime: Date,
  isActive: { type: Boolean, default: true }
}

// AttendanceLog
{
  studentId: { type: ObjectId, ref: 'Student' },
  lectureId: { type: ObjectId, ref: 'Lecture' },
  exitTime: Date,
  entryTime: Date,
  duration: Number, // minutes
  status: { type: String, enum: ['normal', 'exceeded'] }
}

// Settings (singleton)
{
  thresholdMinutes: { type: Number, default: 7 },
  gracePeriodSeconds: { type: Number, default: 30 },
  autoDeduction: { type: Boolean, default: true }
}
```

## • API Endpoints

| Method | Endpoint | Description | Auth | 
|------|------|------|------|
| POST | /api/auth/register | Register teacher | Public |
| POST | /api/auth/login | Login | Public |
| GET | /api/auth/me | Get current user | Private |
| POST | /api/batches | Create batch | Admin |
| GET | /api/batches | List batches | Private |
| PUT | /api/batches/:id/activate | Set active batch | Admin |
| DELETE | /api/batches/:id | Delete batch | Admin |
| POST | /api/students/register | Register student with descriptor | Teacher |
| GET | /api/students?batchId=... | List students in batch | Private |
| DELETE | /api/students/:id | Remove student | Admin |
| POST | /api/lectures/start | Start a new lecture | Teacher |
| PUT | /api/lectures/:id/end | End current lecture | Teacher |
| GET | /api/lectures/current | Get active lecture for batch | Private |
| POST | /api/logs/exit | Log exit (face match) | Private |
| POST | /api/logs/entry | Log entry (face match) | Private |
| GET | /api/logs | Get logs with filters | Private |
| PUT | /api/logs/:id | Override status | Teacher |
| GET | /api/reports/student/:id | Student report | Private |
| GET | /api/reports/lecture/:id | Lecture summary | Private |
| GET | /api/settings | Get system settings | Private |
| PUT | /api/settings | Update settings | Admin |

---

## • Facial Recognition Workflow

### Load Models
On application start, **face-api.js models** (Tiny Face Detector, Face Landmark Model, Face Recognition Model) are loaded from a public directory or CDN.

---

### Registration

1. Webcam feed is displayed.
2. On capture, a face descriptor is extracted using:

```javascript
faceapi.detectSingleFace().withFaceDescriptor()
```

The descriptor is sent to the backend and stored with the student's information.

---

## Real-Time Tracking

1. The dashboard continuously processes video frames.

2. For each detected face, the descriptor is compared with stored descriptors of the active batch using **Euclidean distance**.

```javascript
faceapi.euclideanDistance()
```

3. If the distance is **< 0.6**, the student is identified.

4. The system checks for an open attendance log:

**No open log → Create exit log**

POST /logs/exit

**Open log exists → Create entry log**

POST /logs/entry

5. The backend calculates absence duration and updates attendance status.

6. **Socket.IO broadcasts updates** to all connected teacher dashboards in real time.

---

# • Installation & Setup

## Prerequisites

- Node.js (v16+)
- MongoDB (Local or Atlas)
- Git

---

## Clone Repository

```bash
git clone https://github.com/yourusername/entryeye.git  
cd entryeye
```

---

## Backend Setup

```bash
cd backend  
npm install  
cp .env.example .env  
```


Update the environment variables in `.env`:

PORT=  
MONGO_URI=  
JWT_SECRET=  

Start the backend server:

```bash
npm run dev
```

---

## Frontend Setup

```bash
cd frontend  
npm install  
cp .env.example .env  
```

Set the frontend environment variable:

VITE_API_BASE_URL=

Start the frontend server:

```bash
npm run dev
```

The application will be available at:

http://localhost:5173

---

# • Deployment

## Frontend

Deploy using **Vercel**

- Connect GitHub repository
- Configure environment variables

---

## Backend

Deploy using **Render** or **Railway**

- Select Node.js environment
- Configure environment variables

---

## Database

Use **MongoDB Atlas (Free Tier)**

---

# • Environment Variables

## Backend

MONGO_URI=  
JWT_SECRET=  
PORT=  

## Frontend

VITE_API_BASE_URL=

---

# • Author

**Pal Pathak**

YouTube: Pal Pathak  
GitHub: palpathak  

Other social links are available in the GitHub profile.

---

# • EntryEye

**"Where Every Face Tells the Time."**
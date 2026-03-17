const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const authRoutes = require('./routes/authRoutes');
const batchRoutes = require('./routes/batchRoutes');
const studentRoutes = require('./routes/studentRoutes');
const lectureRoutes = require('./routes/lectureRoutes');
console.log('lectureRoutes loaded in app.js:', !!lectureRoutes);
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Request Logger
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Routes
app.get('/ping', (req, res) => {
  console.log('GET /ping hit');
  res.send('Server is alive - v2');
});

app.post('/api/debug-post', (req, res) => {
  console.log('POST /api/debug-post hit');
  res.send('Debug POST working');
});

app.get('/', (req, res) => {
  res.send('API running');
});

app.use('/api/auth', authRoutes);
app.use('/api/batches', batchRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/lectures', lectureRoutes);


// Error Handling Middleware
app.use(errorHandler);

module.exports = app;

const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const authRoutes = require('./routes/authRoutes');
const batchRoutes = require('./routes/batchRoutes');
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
  res.send('Server is alive');
});

app.get('/', (req, res) => {
  res.send('API running');
});

app.use('/api/auth', authRoutes);
app.use('/api/batches', batchRoutes);
app.use('/', routes);

// Error Handling Middleware
app.use(errorHandler);

module.exports = app;

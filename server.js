const express = require('express');
const cors = require('cors');
const apiRoutes = require('./routes/api');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files (html, css, js)
app.use(express.static(__dirname));

// API Routes
app.use('/api', apiRoutes);

// Database connection is initialized in database.js which is required in routes/api.js

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

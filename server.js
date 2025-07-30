const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Serve static files from dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// Serve the landing page for all routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Timebeacon Landing Page running on port ${PORT}`);
  console.log(`Visit: http://localhost:${PORT}`);
});
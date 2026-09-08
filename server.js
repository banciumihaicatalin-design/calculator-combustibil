const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;
const HOST = '0.0.0.0';

// Optional dynamic config override for Firebase
app.get('/firebase-config.js', (req, res) => {
  res.type('application/javascript');
  const config = {
    apiKey: process.env.FIREBASE_API_KEY || "AIzaSyCs0hjNhFke5SQsCFFqqaPUJTEOXfOytmc",
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || "fuel-calculator-faa50.firebaseapp.com",
    projectId: process.env.FIREBASE_PROJECT_ID || "fuel-calculator-faa50",
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "fuel-calculator-faa50.firebasestorage.app",
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "856821371606",
    appId: process.env.FIREBASE_APP_ID || "1:856821371606:web:4a6af821e896677d3c6f77",
    measurementId: process.env.FIREBASE_MEASUREMENT_ID || "G-B9C0C6JHSY"
  };
  res.send(`const FIREBASE_CONFIG = ${JSON.stringify(config, null, 2)};\n`);
});

// Serve static assets from project root
app.use(express.static(path.join(__dirname)));

// Single page application fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});

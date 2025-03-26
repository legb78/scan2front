const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname, '/')));

// API endpoint to serve the JSON data
app.get('/api/data', (req, res) => {
  const dataPath = path.join(__dirname, 'data', 'achats_clients_500.json');
  
  fs.readFile(dataPath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading JSON file:', err);
      return res.status(500).json({ error: 'Error reading data file' });
    }
    
    try {
      const jsonData = JSON.parse(data);
      res.json(jsonData);
    } catch (parseErr) {
      console.error('Error parsing JSON:', parseErr);
      res.status(500).json({ error: 'Error parsing data file' });
    }
  });
});

// API endpoint to serve loyalty points data
app.get('/api/loyalty', (req, res) => {
  const loyaltyPath = path.join(__dirname, 'data', 'loyalty_points.json');
  
  // Check if the loyalty data file exists
  fs.access(loyaltyPath, fs.constants.F_OK, (err) => {
    if (err) {
      // If file doesn't exist, generate it first
      try {
        // Execute the generator script
        require('./js/loyalty-data-generator');
        
        // Wait a bit for the file to be created
        setTimeout(() => {
          // Now try to read the file
          fs.readFile(loyaltyPath, 'utf8', (readErr, data) => {
            if (readErr) {
              console.error('Error reading loyalty file after generation:', readErr);
              return res.status(500).json({ error: 'Error generating and reading loyalty data' });
            }
            
            try {
              const jsonData = JSON.parse(data);
              res.json(jsonData);
            } catch (parseErr) {
              console.error('Error parsing loyalty JSON:', parseErr);
              res.status(500).json({ error: 'Error parsing loyalty data' });
            }
          });
        }, 1000);
      } catch (genErr) {
        console.error('Error generating loyalty data:', genErr);
        return res.status(500).json({ error: 'Error generating loyalty data' });
      }
    } else {
      // File exists, read and return it
      fs.readFile(loyaltyPath, 'utf8', (readErr, data) => {
        if (readErr) {
          console.error('Error reading loyalty file:', readErr);
          return res.status(500).json({ error: 'Error reading loyalty data file' });
        }
        
        try {
          const jsonData = JSON.parse(data);
          res.json(jsonData);
        } catch (parseErr) {
          console.error('Error parsing loyalty JSON:', parseErr);
          res.status(500).json({ error: 'Error parsing loyalty data file' });
        }
      });
    }
  });
});

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'html', 'index.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'html', 'dashboard.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'html', 'login.html'));
});

app.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, 'html', 'signup.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
}); 
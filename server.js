const express = require('express');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname, '/')));
app.use(express.json());

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

// API endpoint to run Python clustering analysis
app.post('/api/clustering', (req, res) => {
  const pythonScript = path.join(__dirname, 'scripts', 'customer_clustering.py');
  const loyaltyPath = path.join(__dirname, 'data', 'loyalty_points.json');
  const purchasesPath = path.join(__dirname, 'data', 'achats_clients_500.json');
  
  // Ensure both data files exist
  if (!fs.existsSync(loyaltyPath) || !fs.existsSync(purchasesPath)) {
    return res.status(500).json({ error: 'Data files not found' });
  }
  
  // Get parameters from request
  const { numClusters = 3, features = ['age', 'points_cumules', 'nombre_achats'] } = req.body;
  
  // Run Python script as a child process
  const python = spawn('python', [
    pythonScript,
    '--loyalty', loyaltyPath,
    '--purchases', purchasesPath,
    '--clusters', numClusters.toString(),
    '--features', features.join(',')
  ]);
  
  let dataFromPython = '';
  let errorFromPython = '';

  // Collect data from script
  python.stdout.on('data', (data) => {
    dataFromPython += data.toString();
  });
  
  // Collect errors from script
  python.stderr.on('data', (data) => {
    errorFromPython += data.toString();
  });
  
  // Handle process completion
  python.on('close', (code) => {
    if (code !== 0) {
      console.error(`Python process exited with code ${code}`);
      console.error(errorFromPython);
      return res.status(500).json({ 
        error: 'Error running clustering analysis',
        details: errorFromPython
      });
    }
    
    try {
      const results = JSON.parse(dataFromPython);
      res.json(results);
    } catch (parseErr) {
      console.error('Error parsing Python output:', parseErr);
      res.status(500).json({ 
        error: 'Error parsing clustering results',
        details: dataFromPython
      });
    }
  });
});

// API endpoint to run purchase prediction
app.post('/api/prediction', (req, res) => {
  const pythonScript = path.join(__dirname, 'scripts', 'purchase_prediction.py');
  const loyaltyPath = path.join(__dirname, 'data', 'loyalty_points.json');
  const purchasesPath = path.join(__dirname, 'data', 'achats_clients_500.json');
  
  // Ensure both data files exist
  if (!fs.existsSync(loyaltyPath) || !fs.existsSync(purchasesPath)) {
    return res.status(500).json({ error: 'Data files not found' });
  }
  
  // Get parameters from request
  const { period = 'month', features = ['age', 'points_cumules', 'nombre_achats', 'points_actuels'] } = req.body;
  
  // Run Python script as a child process
  const python = spawn('python', [
    pythonScript,
    '--loyalty', loyaltyPath,
    '--purchases', purchasesPath,
    '--period', period,
    '--features', features.join(',')
  ]);
  
  let dataFromPython = '';
  let errorFromPython = '';

  // Collect data from script
  python.stdout.on('data', (data) => {
    dataFromPython += data.toString();
  });
  
  // Collect errors from script
  python.stderr.on('data', (data) => {
    errorFromPython += data.toString();
  });
  
  // Handle process completion
  python.on('close', (code) => {
    if (code !== 0) {
      console.error(`Python process exited with code ${code}`);
      console.error(errorFromPython);
      return res.status(500).json({ 
        error: 'Error running purchase prediction',
        details: errorFromPython
      });
    }
    
    try {
      const results = JSON.parse(dataFromPython);
      res.json(results);
    } catch (parseErr) {
      console.error('Error parsing Python output:', parseErr);
      res.status(500).json({ 
        error: 'Error parsing prediction results',
        details: dataFromPython
      });
    }
  });
});

// API endpoint for loyalty program recommendations
app.post('/api/loyalty-recommendations', (req, res) => {
  const pythonScript = path.join(__dirname, 'scripts', 'loyalty_recommendation.py');
  const loyaltyPath = path.join(__dirname, 'data', 'loyalty_points.json');
  const purchasesPath = path.join(__dirname, 'data', 'achats_clients_500.json');
  
  // Ensure both data files exist
  if (!fs.existsSync(loyaltyPath) || !fs.existsSync(purchasesPath)) {
    return res.status(500).json({ error: 'Data files not found' });
  }
  
  // Get parameters from request
  const { segments = 5 } = req.body;
  
  // Run Python script as a child process
  const python = spawn('python', [
    pythonScript,
    '--loyalty', loyaltyPath,
    '--purchases', purchasesPath,
    '--segments', segments.toString()
  ]);
  
  let dataFromPython = '';
  let errorFromPython = '';

  // Collect data from script
  python.stdout.on('data', (data) => {
    dataFromPython += data.toString();
  });
  
  // Collect errors from script
  python.stderr.on('data', (data) => {
    errorFromPython += data.toString();
  });
  
  // Handle process completion
  python.on('close', (code) => {
    if (code !== 0) {
      console.error(`Python process exited with code ${code}`);
      console.error(errorFromPython);
      return res.status(500).json({ 
        error: 'Error running loyalty recommendations analysis',
        details: errorFromPython
      });
    }
    
    try {
      const results = JSON.parse(dataFromPython);
      res.json(results);
    } catch (parseErr) {
      console.error('Error parsing Python output:', parseErr);
      res.status(500).json({ 
        error: 'Error parsing loyalty recommendations results',
        details: dataFromPython
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

app.get('/profiling', (req, res) => {
  res.sendFile(path.join(__dirname, 'html', 'profiling.html'));
});

app.get('/prediction', (req, res) => {
  res.sendFile(path.join(__dirname, 'html', 'prediction.html'));
});

app.get('/loyalty-programs', (req, res) => {
  res.sendFile(path.join(__dirname, 'html', 'loyalty-programs.html'));
});

app.get('/product-loyalty', (req, res) => {
  res.sendFile(path.join(__dirname, 'html', 'product-loyalty.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
}); 
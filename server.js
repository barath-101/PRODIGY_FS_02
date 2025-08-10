const express = require('express');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// SQLite database connection
const db = new sqlite3.Database('./employee_management.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database');
    initializeDatabase();
  }
});

// Initialize database tables and sample data
function initializeDatabase() {
  // Create admins table
  db.run(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create employees table
  db.run(`
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      position TEXT NOT NULL,
      department TEXT NOT NULL,
      salary REAL,
      password TEXT NOT NULL,
      hire_date DATE DEFAULT CURRENT_DATE,
      status TEXT DEFAULT 'Active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Insert sample data
  const adminPassword = bcrypt.hashSync('admin123', 10);
  const employeePassword = bcrypt.hashSync('employee123', 10);

  db.run(`
    INSERT OR IGNORE INTO admins (first_name, last_name, email, password) 
    VALUES ('BARATH', 'G', 'admin@company.com', ?)
  `, [adminPassword]);

  db.run(`
    INSERT OR IGNORE INTO employees (first_name, last_name, email, phone, position, department, salary, password) 
    VALUES ('Barath', 'G', 'barathg.work@gmail.com', '+91-9080187006', 'Software Developer', 'Engineering', 75000.00, ?)
  `, [employeePassword]);

  console.log('Database initialized with sample data');
}

// JWT middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Routes

// Serve login page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Serve admin dashboard
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Serve employee dashboard
app.get('/employee', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'employee.html'));
});

// Login endpoint
app.post('/api/login', (req, res) => {
  try {
    const { email, password, userType } = req.body;

    if (!email || !password || !userType) {
      return res.status(400).json({ error: 'Email, password, and user type are required' });
    }

    const table = userType === 'admin' ? 'admins' : 'employees';
    const query = `SELECT * FROM ${table} WHERE email = ?`;

    db.get(query, [email], async (err, user) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      try {
        const validPassword = await bcrypt.compare(password, user.password);

        if (!validPassword) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
          { id: user.id, email: user.email, userType },
          process.env.JWT_SECRET,
          { expiresIn: '24h' }
        );

        res.json({ 
          token, 
          userType,
          user: {
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name
          }
        });
      } catch (bcryptError) {
        console.error('Password comparison error:', bcryptError);
        res.status(500).json({ error: 'Internal server error' });
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all employees (Admin only)
app.get('/api/employees', authenticateToken, (req, res) => {
  try {
    if (req.user.userType !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const query = 'SELECT id, first_name, last_name, email, phone, position, department, salary, hire_date, status FROM employees ORDER BY id';
    
    db.all(query, [], (err, rows) => {
      if (err) {
        console.error('Get employees error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
      res.json(rows);
    });
  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single employee
app.get('/api/employees/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    
    // Admin can view any employee, employee can only view their own data
    if (req.user.userType !== 'admin' && req.user.id !== parseInt(id)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const query = 'SELECT id, first_name, last_name, email, phone, position, department, salary, hire_date, status FROM employees WHERE id = ?';
    
    db.get(query, [id], (err, row) => {
      if (err) {
        console.error('Get employee error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
      
      if (!row) {
        return res.status(404).json({ error: 'Employee not found' });
      }

      res.json(row);
    });
  } catch (error) {
    console.error('Get employee error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new employee (Admin only)
app.post('/api/employees', authenticateToken, async (req, res) => {
  try {
    if (req.user.userType !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { firstName, lastName, email, phone, position, department, salary, password } = req.body;

    if (!firstName || !lastName || !email || !position || !department || !password) {
      return res.status(400).json({ error: 'Required fields missing' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const query = `INSERT INTO employees (first_name, last_name, email, phone, position, department, salary, password, hire_date, status) 
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, date('now'), 'Active')`;
    
    db.run(query, [firstName, lastName, email, phone, position, department, salary, hashedPassword], function(err) {
      if (err) {
        console.error('Create employee error:', err);
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: 'Email already exists' });
        }
        return res.status(500).json({ error: 'Internal server error' });
      }
      
      // Get the created employee
      const selectQuery = 'SELECT id, first_name, last_name, email, phone, position, department, salary, hire_date, status FROM employees WHERE id = ?';
      db.get(selectQuery, [this.lastID], (err, row) => {
        if (err) {
          console.error('Error retrieving created employee:', err);
          return res.status(500).json({ error: 'Internal server error' });
        }
        res.status(201).json(row);
      });
    });
  } catch (error) {
    console.error('Create employee error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update employee (Admin only)
app.put('/api/employees/:id', authenticateToken, (req, res) => {
  try {
    if (req.user.userType !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    const { firstName, lastName, email, phone, position, department, salary, status } = req.body;

    const query = `UPDATE employees SET first_name = ?, last_name = ?, email = ?, phone = ?, position = ?, department = ?, salary = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    
    db.run(query, [firstName, lastName, email, phone, position, department, salary, status, id], function(err) {
      if (err) {
        console.error('Update employee error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Employee not found' });
      }
      
      // Get the updated employee
      const selectQuery = 'SELECT id, first_name, last_name, email, phone, position, department, salary, hire_date, status FROM employees WHERE id = ?';
      db.get(selectQuery, [id], (err, row) => {
        if (err) {
          console.error('Error retrieving updated employee:', err);
          return res.status(500).json({ error: 'Internal server error' });
        }
        res.json(row);
      });
    });
  } catch (error) {
    console.error('Update employee error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete employee (Admin only)
app.delete('/api/employees/:id', authenticateToken, (req, res) => {
  try {
    if (req.user.userType !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    const query = 'DELETE FROM employees WHERE id = ?';
    
    db.run(query, [id], function(err) {
      if (err) {
        console.error('Delete employee error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Employee not found' });
      }
      
      res.json({ message: 'Employee deleted successfully' });
    });
  } catch (error) {
    console.error('Delete employee error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

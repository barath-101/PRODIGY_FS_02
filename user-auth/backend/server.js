const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'auth_db',
    password: 'barathisgood_incoding',
    port: 5432,
});

app.post('/api/users/register', async (req, res) => {
    const { firstName, lastName, email, dateOfBirth, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10); 
        await pool.query(
            'INSERT INTO users (first_name, last_name, email, date_of_birth, password) VALUES ($1, $2, $3, $4, $5)',
            [firstName, lastName, email, dateOfBirth, hashedPassword]
        );
        res.status(201).send('User registered successfully');
    } catch (err) {
        if (err.code === '23505') {
            res.status(400).send('Email already exists');
        } else {
            res.status(500).send('Registration failed');
        }
    }
});

app.post('/api/users/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );
        if (result.rows.length > 0) {
            const user = result.rows[0];
            const match = await bcrypt.compare(password, user.password);
            if (match) {
                res.send('Login successful');
            } else {
                res.status(401).send('Invalid email or password');
            }
        } else {
            res.status(401).send('Invalid email or password');
        }
    } catch (err) {
        res.status(500).send('Login failed');
    }
});

app.get('/api/users/profile', async (req, res) => {
    const email = req.query.email;
    try {
        const result = await pool.query(
            'SELECT first_name, last_name, email, date_of_birth FROM users WHERE email = $1',
            [email]
        );
        if (result.rows.length > 0) {
            res.json(result.rows[0]);
        } else {
            res.status(404).send('User not found');
        }
    } catch (err) {
        res.status(500).send('Failed to load user info');
    }
});

app.listen(8080, () => {
    console.log('Server running on port 8080');
});
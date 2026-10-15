const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../database');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

// Middleware to verify JWT
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Authentication required' });
    const token = authHeader.split(' ')[1];
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        req.user = user; // { id, username, role }
        next();
    });
};

router.post('/signup', (req, res) => {
    const { username, email, password, role } = req.body;
    if (!username || !email || !password) return res.status(400).json({ error: 'All fields are required' });

    bcrypt.hash(password, 10, (err, hash) => {
        if (err) return res.status(500).json({ error: 'Server error' });

        const userRole = role === 'admin' ? 'admin' : 'student';

        db.run(`INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)`,
            [username, email, hash, userRole],
            function (err) {
                if (err) {
                    if (err.message.includes('UNIQUE constraint')) {
                        return res.status(400).json({ error: 'Email already exists' });
                    }
                    return res.status(500).json({ error: 'Database error' });
                }
                res.status(201).json({ success: true, message: 'User created' });
            }
        );
    });
});

router.post('/auth/supabase-login', async (req, res) => {
    const { access_token } = req.body;
    if (!access_token) return res.status(400).json({ error: 'Missing access token' });

    try {
        // We fetch the user profile from Supabase to verify the token
        // Use the hardcoded Supabase URL (from your .env db connection)
        const supabaseUrl = 'https://sabcccztdhqvdhkqgfqk.supabase.co';
        
        // IMPORTANT: The Anon Key is required to fetch the user profile.
        // We will fetch it from an environment variable SUPABASE_ANON_KEY, 
        // or just use a generic fetch if we don't have it (wait, Supabase API needs apikey).
        const anonKey = process.env.SUPABASE_ANON_KEY;
        if (!anonKey) {
            console.error("SUPABASE_ANON_KEY is not defined in .env");
            return res.status(500).json({ error: 'Server misconfiguration' });
        }

        const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
            headers: {
                'Authorization': `Bearer ${access_token}`,
                'apikey': anonKey
            }
        });

        if (!response.ok) {
            return res.status(401).json({ error: 'Invalid Supabase token' });
        }

        const supabaseUser = await response.json();
        const email = supabaseUser.email;
        const name = supabaseUser.user_metadata?.full_name || email.split('@')[0];

        // Now check if this user exists in our custom 'users' table
        db.get(`SELECT * FROM users WHERE email = ?`, [email], (err, user) => {
            if (err) return res.status(500).json({ error: 'Database error' });

            if (user) {
                // User exists, just issue our custom JWT
                const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
                return res.json({ success: true, token, role: user.role, username: user.username });
            } else {
                // User does not exist, create them as a student
                const randomPassword = require('crypto').randomBytes(16).toString('hex');
                bcrypt.hash(randomPassword, 10, (err, hash) => {
                    if (err) return res.status(500).json({ error: 'Server error' });
                    
                    // Username will be email prefix for new Google users
                    const username = email.split('@')[0] + Math.floor(Math.random() * 1000);

                    db.run(`INSERT INTO users (username, email, password, role, full_name) VALUES (?, ?, ?, 'student', ?)`,
                        [username, email, hash, name],
                        function (err) {
                            if (err) return res.status(500).json({ error: 'Database error creating user' });
                            
                            const newUserId = this.lastID;
                            const token = jwt.sign({ id: newUserId, username, role: 'student' }, JWT_SECRET, { expiresIn: '24h' });
                            res.status(201).json({ success: true, token, role: 'student', username });
                        }
                    );
                });
            }
        });
    } catch (error) {
        console.error('Supabase Login Error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/login', (req, res) => {
    const { username_or_email, password } = req.body;
    if (!username_or_email || !password) return res.status(400).json({ error: 'Missing credentials' });

    db.get(`SELECT * FROM users WHERE username = ? OR email = ?`, [username_or_email, username_or_email], (err, user) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!user) return res.status(401).json({ error: 'No user found' });

        bcrypt.compare(password, user.password, (err, match) => {
            if (err) return res.status(500).json({ error: 'Server error' });
            if (!match) return res.status(401).json({ error: 'Invalid password' });

            const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
            res.json({ success: true, token, role: user.role, username: user.username });
        });
    });
});

router.get('/profile', authenticate, (req, res) => {
    db.get(`SELECT full_name, pin FROM users WHERE id = ?`, [req.user.id], (err, user) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json({ success: true, name: user.full_name || '', pin: user.pin || '' });
    });
});

router.post('/profile', authenticate, (req, res) => {
    const { name, pin } = req.body;
    db.run(`UPDATE users SET full_name = ?, pin = ? WHERE id = ?`, [name, pin, req.user.id], (err) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json({ success: true, message: 'Profile updated successfully!' });
    });
});

router.get('/subjects', authenticate, (req, res) => {
    const { branch, year, semester } = req.query;
    db.all(`SELECT * FROM subjects WHERE branch = ? AND year = ? AND semester = ? ORDER BY subject_name ASC`,
        [branch, year, semester], (err, rows) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            res.json(rows);
        });
});

router.post('/subjects', authenticate, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Unauthorized' });
    const { branch, year, semester, subject_name } = req.body;
    db.run(`INSERT INTO subjects (branch, year, semester, subject_name) VALUES (?, ?, ?, ?)`,
        [branch, year, semester, subject_name], function (err) {
            if (err) return res.status(500).json({ error: 'Database error' });
            res.status(201).json({ success: true, id: this.lastID, subject_name });
        });
});

router.put('/subjects/:id', authenticate, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Unauthorized' });
    const { new_name } = req.body;
    db.run(`UPDATE subjects SET subject_name = ? WHERE id = ?`, [new_name, req.params.id], function (err) {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json({ success: true });
    });
});

router.delete('/subjects/:id', authenticate, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Unauthorized' });
    db.run(`DELETE FROM subjects WHERE id = ?`, [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json({ success: true });
    });
});

// Content Management (COs and Topics)
router.get('/content', authenticate, async (req, res) => {
    const { subject, branch, year, semester, action, topic_id } = req.query;

    if (action === 'get_topic' && topic_id) {
        return db.get(`SELECT * FROM topics WHERE id = ?`, [topic_id], (err, topic) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            if (!topic) return res.status(404).json({ error: 'Topic not found' });
            res.json({ success: true, title: topic.topic_title, content: topic.content || '' });
        });
    }

    // Get Subject ID first
    db.get(`SELECT id FROM subjects WHERE subject_name = ? AND branch = ? AND year = ? AND semester = ?`,
        [subject, branch, year, semester], (err, subj) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            if (!subj) return res.json([]); // No content yet

            // Fetch COs
            db.all(`SELECT * FROM cos WHERE subject_id = ?`, [subj.id], (err, cos) => {
                if (err) return res.status(500).json({ error: 'Database error' });
                if (cos.length === 0) return res.json([]);

                // Fetch topics for each CO
                let coPromises = cos.map(co => {
                    return new Promise((resolve, reject) => {
                        db.all(`SELECT * FROM topics WHERE co_id = ?`, [co.id], (err, topics) => {
                            if (err) reject(err);
                            resolve({
                                id: co.id,
                                title: co.co_title,
                                content: topics.map(t => ({
                                    id: t.id,
                                    text: t.topic_title,
                                    title: t.topic_title, // Alias for frontend
                                    type: t.type || 'text',
                                    url: t.link || t.pdf_file // Handle link or pdf 
                                }))
                            });
                        });
                    });
                });

                Promise.all(coPromises)
                    .then(results => res.json(results))
                    .catch(err => res.status(500).json({ error: 'Error fetching content' }));
            });
        });
});

router.post('/content', authenticate, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Unauthorized' });

    const { action, title, subject, branch, year, semester, co_id, topic_id, content, url } = req.body;

    if (action === 'add_co') {
        db.get(`SELECT id FROM subjects WHERE subject_name = ? AND branch = ? AND year = ? AND semester = ?`,
            [subject, branch, year, semester], (err, subj) => {
                if (err || !subj) return res.status(404).json({ error: 'Subject not found' });

                db.run(`INSERT INTO cos (subject_id, co_title) VALUES (?, ?)`, [subj.id, title], function (err) {
                    if (err) return res.status(500).json({ error: 'Database error' });
                    res.json({ success: true, id: this.lastID });
                });
            });
    } else if (action === 'edit_co') {
        db.run(`UPDATE cos SET co_title = ? WHERE id = ?`, [title, co_id], (err) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            res.json({ success: true });
        });
    } else if (action === 'delete_co') {
        db.run(`DELETE FROM cos WHERE id = ?`, [co_id], (err) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            res.json({ success: true });
        });
    } else if (action === 'add_topic') {
        db.run(`INSERT INTO topics (co_id, topic_title, type) VALUES (?, ?, 'text')`, [co_id, title], function (err) {
            if (err) return res.status(500).json({ error: 'Database error' });
            res.json({ success: true, id: this.lastID });
        });
    } else if (action === 'add_link') {
        // Handling links natively 
        db.run(`INSERT INTO topics (co_id, topic_title, type, link) VALUES (?, ?, 'link', ?)`, [co_id, title, url], function (err) {
            if (err) return res.status(500).json({ error: 'Database error' });
            res.json({ success: true, id: this.lastID });
        });
    } else if (action === 'delete_topic') {
        db.run(`DELETE FROM topics WHERE id = ?`, [topic_id], (err) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            res.json({ success: true });
        });
    } else if (action === 'save_topic_content') {
        db.run(`UPDATE topics SET content = ? WHERE id = ?`, [content, topic_id], (err) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            res.json({ success: true });
        });
    } else {
        res.status(400).json({ error: 'Invalid action' });
    }
});

// ── Branches ──────────────────────────────────────────────
// Public: anyone can list branches
router.get('/branches', (req, res) => {
    db.all(`SELECT * FROM branches ORDER BY name ASC`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(rows);
    });
});

// Admin only: add branch
router.post('/branches', authenticate, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Unauthorized' });
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Branch name required' });
    db.run(`INSERT INTO branches (name) VALUES (?)`, [name.trim().toUpperCase()], function (err) {
        if (err) {
            if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'Branch already exists' });
            return res.status(500).json({ error: 'Database error' });
        }
        res.status(201).json({ success: true, id: this.lastID, name: name.trim().toUpperCase() });
    });
});

// Admin only: edit branch
router.put('/branches/:id', authenticate, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Unauthorized' });
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Branch name required' });
    db.run(`UPDATE branches SET name = ? WHERE id = ?`, [name.trim().toUpperCase(), req.params.id], function (err) {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json({ success: true });
    });
});

// Admin only: delete branch
router.delete('/branches/:id', authenticate, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Unauthorized' });
    db.run(`DELETE FROM branches WHERE id = ?`, [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json({ success: true });
    });
});

module.exports = router;

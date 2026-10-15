const db = require('./database');

const initSql = `
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'student',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS subjects (
    id SERIAL PRIMARY KEY,
    branch TEXT NOT NULL,
    year INTEGER NOT NULL,
    semester INTEGER NOT NULL,
    subject_name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cos (
    id SERIAL PRIMARY KEY,
    subject_id INTEGER NOT NULL,
    co_title TEXT NOT NULL,
    FOREIGN KEY(subject_id) REFERENCES subjects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS topics (
    id SERIAL PRIMARY KEY,
    co_id INTEGER NOT NULL,
    topic_title TEXT NOT NULL,
    link TEXT,
    pdf_file TEXT,
    type TEXT DEFAULT 'text',
    content TEXT DEFAULT '',
    FOREIGN KEY(co_id) REFERENCES cos(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS branches (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);

INSERT INTO branches (name) 
VALUES ('CSE'), ('CPS'), ('EI'), ('ES'), ('AI'), ('EC'), ('EV'), ('CCB'), ('BM') 
ON CONFLICT (name) DO NOTHING;
`;

db.exec(initSql, (err) => {
    if (err) {
        console.error('Error initializing DB:', err.message);
    } else {
        console.log('Database initialized successfully with tables users, subjects, cos, topics, and branches.');
    }
    db.close();
});

const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

const username = 'admin';
const email = 'admin@example.com';
const password = 'admin'; // You can change this
const role = 'admin';

bcrypt.hash(password, 10, (err, hash) => {
    if (err) {
        console.error('Error hashing password:', err);
        return;
    }

    db.run(
        `INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)`,
        [username, email, hash, role],
        function (err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint')) {
                    console.log('Admin user already exists!');
                } else {
                    console.error('Database error:', err.message);
                }
            } else {
                console.log(`Successfully created Admin account!`);
                console.log(`Username: ${username}`);
                console.log(`Email: ${email}`);
                console.log(`Password: ${password}`);
                console.log(`Role: ${role}`);
            }
            db.close();
        }
    );
});

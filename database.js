require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

pool.connect((err, client, release) => {
    if (err) {
        console.error('Error connecting to Supabase DB:', err.stack);
    } else {
        console.log('Connected to Supabase PostgreSQL DB.');
        release();
    }
});

// Helper function to convert SQLite syntax '?' to PostgreSQL syntax '$1, $2, etc'
function convertQuery(sql) {
    let pgSql = sql;
    let i = 1;
    // Replace all ? with $1, $2, etc.
    pgSql = pgSql.replace(/\?/g, () => `$${i++}`);
    
    // Convert SQLite INSERT OR IGNORE to PostgreSQL INSERT ... ON CONFLICT DO NOTHING
    if (pgSql.includes('INSERT OR IGNORE INTO')) {
        pgSql = pgSql.replace('INSERT OR IGNORE INTO', 'INSERT INTO');
        // Simple heuristic: if it has branches, conflict is on name
        if (pgSql.includes('branches')) {
            pgSql += ' ON CONFLICT (name) DO NOTHING';
        }
    }

    // Add RETURNING id to INSERT statements to mimic this.lastID
    if (/^\s*INSERT\s/i.test(pgSql) && !/RETURNING/i.test(pgSql)) {
        pgSql += ' RETURNING id';
    }

    return pgSql;
}

function formatError(err) {
    if (!err) return null;
    if (err.code === '23505') {
        err.message = 'UNIQUE constraint failed: ' + err.message;
    }
    return err;
}

const db = {
    run: function (sql, params = [], callback) {
        if (typeof params === 'function') {
            callback = params;
            params = [];
        }
        const pgSql = convertQuery(sql);
        pool.query(pgSql, params, (err, result) => {
            const formattedErr = formatError(err);
            if (callback) {
                const ctx = {};
                if (result && result.rows && result.rows.length > 0 && result.rows[0].id) {
                    ctx.lastID = result.rows[0].id;
                }
                callback.call(ctx, formattedErr);
            }
        });
        return this;
    },
    get: function (sql, params = [], callback) {
        if (typeof params === 'function') {
            callback = params;
            params = [];
        }
        const pgSql = convertQuery(sql);
        pool.query(pgSql, params, (err, result) => {
            const formattedErr = formatError(err);
            if (callback) {
                callback(formattedErr, result && result.rows ? result.rows[0] : undefined);
            }
        });
        return this;
    },
    all: function (sql, params = [], callback) {
        if (typeof params === 'function') {
            callback = params;
            params = [];
        }
        const pgSql = convertQuery(sql);
        pool.query(pgSql, params, (err, result) => {
            const formattedErr = formatError(err);
            if (callback) {
                callback(formattedErr, result && result.rows ? result.rows : []);
            }
        });
        return this;
    },
    exec: function (sql, callback) {
        pool.query(sql, (err, result) => {
            if (callback) callback(formatError(err));
        });
        return this;
    },
    close: function (callback) {
        pool.end(() => {
            if (callback) callback(null);
        });
    }
};

module.exports = db;

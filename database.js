const mysql = require('mysql2/promise');
require('dotenv').config();

let pool;
let initPromise;

async function initDB() {
    try {
        const dbName = process.env.DB_NAME || 'restmenu';
        
        // 1. First connect without selecting a database to ensure it exists
        const rootConnection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || ''
        });
        await rootConnection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
        await rootConnection.end();

        // 2. Now create the pool
        pool = mysql.createPool({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: dbName,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });

        // 3. Create Tables
        const connection = await pool.getConnection();

        await connection.execute(`
            CREATE TABLE IF NOT EXISTS users (
                phone_number VARCHAR(255) PRIMARY KEY,
                name VARCHAR(255),
                address TEXT,
                total_orders INT DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await connection.execute(`
            CREATE TABLE IF NOT EXISTS orders (
                id VARCHAR(255) PRIMARY KEY,
                phone_number VARCHAR(255),
                items_json TEXT,
                total_amount INT,
                status VARCHAR(50) DEFAULT 'PENDING',
                address TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(phone_number) REFERENCES users(phone_number)
            )
        `);

        await connection.execute(`
            CREATE TABLE IF NOT EXISTS sessions (
                phone_number VARCHAR(255) PRIMARY KEY,
                state VARCHAR(255),
                cart_json TEXT,
                current_item_json TEXT,
                category_context TEXT,
                address TEXT,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        connection.release();
        console.log('✅ MySQL Database initialized successfully');
    } catch (err) {
        console.error('❌ Failed to initialize MySQL database:', err);
    }
}

initPromise = initDB();

module.exports = {
    execute: async (...args) => {
        await initPromise;
        return pool.execute(...args);
    },
    getConnection: async () => {
        await initPromise;
        return pool.getConnection();
    }
};

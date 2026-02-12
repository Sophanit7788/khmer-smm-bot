const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");
const path = require("path");

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const db = new sqlite3.Database("./database.db");

// Create tables
db.serialize(() => {
    db.run(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        telegram_id TEXT UNIQUE,
        balance REAL DEFAULT 0
    )`);

    db.run(`
    CREATE TABLE IF NOT EXISTS services (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        price REAL,
        smm_service_id INTEGER
    )`);

    db.run(`
    CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        service_id INTEGER,
        link TEXT,
        quantity INTEGER,
        status TEXT DEFAULT 'pending'
    )`);

    db.run(`
    CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        telegram_id TEXT,
        amount REAL,
        status TEXT DEFAULT 'pending'
    )`);
});

// Admin panel page
app.get("/admin", (req, res) => {
    res.sendFile(path.join(__dirname, "views/admin.html"));
});

// API: get users
app.get("/api/users", (req, res) => {
    db.all("SELECT * FROM users", (err, rows) => {
        res.json(rows);
    });
});

// API: get payments
app.get("/api/payments", (req, res) => {
    db.all("SELECT * FROM payments WHERE status='pending'", (err, rows) => {
        res.json(rows);
    });
});

// Approve payment
app.post("/api/approve", (req, res) => {
    const { id, telegram_id, amount } = req.body;

    db.run(
        "UPDATE users SET balance = balance + ? WHERE telegram_id=?",
        [amount, telegram_id]
    );

    db.run(
        "UPDATE payments SET status='approved' WHERE id=?",
        [id]
    );

    res.send("Payment approved");
});

// Add service
app.post("/api/add-service", (req, res) => {
    const { name, price, smm_service_id } = req.body;

    db.run(
        "INSERT INTO services (name, price, smm_service_id) VALUES (?,?,?)",
        [name, price, smm_service_id]
    );

    res.send("Service added");
});

app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});
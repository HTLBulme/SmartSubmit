from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3, hashlib

app = Flask(__name__)
CORS(app)  # allows frontend to talk to backend

# database helper
def get_db():
    conn = sqlite3.connect("database.db")
    conn.row_factory = sqlite3.Row
    return conn

# create table
def init_db():
    conn = get_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        )
    """)
    conn.commit()
    conn.close()

init_db()

@app.post("/api/register")
def register():
    data = request.get_json()
    email = data["email"]
    password = hashlib.sha256(data["password"].encode()).hexdigest()

    try:
        conn = get_db()
        conn.execute("INSERT INTO users (email, password) VALUES (?, ?)", (email, password))
        conn.commit()
        return jsonify({"message": "User created"}), 201
    except sqlite3.IntegrityError:
        return jsonify({"error": "Email already exists"}), 400

@app.post("/api/login")
def login():
    data = request.get_json()
    email = data["email"]
    password = hashlib.sha256(data["password"].encode()).hexdigest()

    conn = get_db()
    user = conn.execute("SELECT * FROM users WHERE email=? AND password=?", (email, password)).fetchone()

    if user:
        return jsonify({"message": "Login successful"}), 200
    else:
        return jsonify({"error": "Invalid credentials"}), 401

if __name__ == "__main__":
    app.run(debug=True)

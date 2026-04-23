import sqlite3
import hashlib

def init_db():
    conn = sqlite3.connect('tourism.db')
    c = conn.cursor()
    
    c.execute('''CREATE TABLE IF NOT EXISTS users (
        id       INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        email    TEXT UNIQUE NOT NULL
    )''')
    
    c.execute('''CREATE TABLE IF NOT EXISTS preferences (
        id       INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id  INTEGER NOT NULL,
        activity TEXT NOT NULL,
        priority INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )''')
    
    conn.commit()
    conn.close()
    print("✅ Database ready!")

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def register_user(username, password, email):
    conn = sqlite3.connect('tourism.db')
    c = conn.cursor()
    try:
        c.execute("INSERT INTO users (username, password, email) VALUES (?, ?, ?)",
                  (username, hash_password(password), email))
        conn.commit()
        return {"success": True}
    except sqlite3.IntegrityError:
        return {"success": False, "error": "Username or email already exists!"}
    finally:
        conn.close()

def login_user(username, password):
    conn = sqlite3.connect('tourism.db')
    c = conn.cursor()
    c.execute("SELECT id, username FROM users WHERE username=? AND password=?",
              (username, hash_password(password)))
    user = c.fetchone()
    conn.close()
    if user:
        return {"success": True, "user_id": user[0], "username": user[1]}
    return {"success": False, "error": "Wrong username or password!"}

def save_preferences(user_id, preferences):
    conn = sqlite3.connect('tourism.db')
    c = conn.cursor()
    c.execute("DELETE FROM preferences WHERE user_id=?", (user_id,))
    for priority, activity in enumerate(preferences):
        c.execute("INSERT INTO preferences (user_id, activity, priority) VALUES (?, ?, ?)",
                  (user_id, activity, priority))
    conn.commit()
    conn.close()

def get_preferences(user_id):
    conn = sqlite3.connect('tourism.db')
    c = conn.cursor()
    c.execute("SELECT activity FROM preferences WHERE user_id=? ORDER BY priority", (user_id,))
    prefs = [row[0] for row in c.fetchall()]
    conn.close()
    return prefs

init_db()
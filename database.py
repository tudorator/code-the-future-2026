import sqlite3
import hashlib
conn=sqlite3.connect('tourism.db')
c=conn.cursor()
c.execute('''CREATE TABLE IF NOT EXISTS users(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
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
print("Database and tables created successfully.")

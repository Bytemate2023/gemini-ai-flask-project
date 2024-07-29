from flask import Flask, render_template, request, redirect, url_for, session, jsonify
import google.generativeai as genai
import sqlite3

app = Flask(__name__)
app.secret_key = 'supersecretkey'

# Configure the Generative AI model
genai.configure(api_key="your_api_key_heree")
model = genai.GenerativeModel('gemini-pro')

def init_db():
    with sqlite3.connect('users.db') as conn:
        c = conn.cursor()
        c.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE,
                password TEXT
            )
        ''')
        c.execute('''
            CREATE TABLE IF NOT EXISTS history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT,
                prompt TEXT,
                response TEXT,
                FOREIGN KEY(username) REFERENCES users(username)
            )
        ''')
        conn.commit()

init_db()

@app.route('/get_username', methods=['GET'])
def get_username():
    if 'username' in session:
        return jsonify({'username': session['username']})
    return jsonify({'username': None})

@app.route('/')
def home():
    if 'username' in session:
        return redirect(url_for('chatbot'))
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        conn = sqlite3.connect('users.db')
        c = conn.cursor()
        c.execute('SELECT * FROM users WHERE username=? AND password=?', (username, password))
        user = c.fetchone()
        conn.close()
        if user:
            session['username'] = username
            return redirect(url_for('chatbot'))
        else:
            return 'Invalid credentials!'
    return render_template('login.html')

@app.route('/signup', methods=['GET', 'POST'])
def signup():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        conn = sqlite3.connect('users.db')
        c = conn.cursor()
        try:
            c.execute('INSERT INTO users (username, password) VALUES (?, ?)', (username, password))
            conn.commit()
            conn.close()
            return redirect(url_for('login'))
        except sqlite3.IntegrityError:
            conn.close()
            return 'Username already exists!'
    return render_template('signup.html')

@app.route('/logout')
def logout():
    session.pop('username', None)
    return redirect(url_for('login'))

@app.route('/chatbot')
def chatbot():
    if 'username' not in session:
        return redirect(url_for('login'))
    return render_template('chatbot.html')

@app.route('/generate', methods=['POST'])
def generate():
    if 'username' not in session:
        return redirect(url_for('login'))
    if request.method == 'POST':
        data = request.json
        prompt = data.get('prompt')
        try:
            response = model.generate_content(prompt)
            response_text = response.text
            username = session['username']
            
            # Save the prompt and response in the history
            conn = sqlite3.connect('users.db')
            c = conn.cursor()
            c.execute('INSERT INTO history (username, prompt, response) VALUES (?, ?, ?)', (username, prompt, response_text))
            conn.commit()
            conn.close()
            
            return jsonify({'response_text': response_text})
        except Exception as e:
            print("Error generating response:", e)
            return jsonify({'response_text': "Sorry, but Gemini didn't want to answer that!"})
    return redirect(url_for('chatbot'))

if __name__ == '__main__':
    app.run(debug=True)

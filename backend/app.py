from flask import Flask, send_from_directory

# Initialize the Flask application
app = Flask(__name__, static_folder='../frontend', static_url_path='')

# Route for serving the main HTML page
@app.route('/')
def index():
    # We tell Flask to send the 'index.html' file from the 'frontend' folder
    return send_from_directory('../frontend', 'index.html')

# A simple example API endpoint
@app.route('/api/hello')
def hello():
    # We return JSON data. The browser will see: {"message": "Hello from the backend!"}
    return {"message": "Hello from the backend!"}

# This makes the server run when you execute the script directly
if __name__ == '__main__':
    app.run(debug=True)
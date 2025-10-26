import os
from flask import Flask, send_from_directory, request, jsonify

# Initialize the Flask application
app = Flask(__name__, static_folder='../frontend', static_url_path='')

# Define the path for our state file.
# This will create 'state.json' inside the 'backend' folder.
STATE_FILE = os.path.join(os.path.dirname(__file__), 'state.json')

# --- NEW: API Endpoint to LOAD state ---
@app.route('/api/state', methods=['GET'])
def get_state():
    # Check if the state file exists
    if not os.path.exists(STATE_FILE):
        # If not, return a default "empty" state
        return jsonify({"isPaused": False, "timers": {}})
    
    # If it exists, read it and return its contents
    try:
        with open(STATE_FILE, 'r') as f:
            data = f.read()
            # Handle case where file is empty
            if not data:
                return jsonify({"isPaused": False, "timers": {}})
            return jsonify(json.loads(data))
    except Exception as e:
        print(f"Error reading state file: {e}")
        # Return default state on error
        return jsonify({"isPaused": False, "timers": {}}), 500

# --- NEW: API Endpoint to SAVE state ---
@app.route('/api/state', methods=['POST'])
def save_state():
    # Get the JSON data sent from the frontend
    data = request.json
    
    # Write this data to our state file
    try:
        with open(STATE_FILE, 'w') as f:
            json.dump(data, f, indent=2)
        # Return a success message
        return jsonify({"message": "State saved successfully"}), 200
    except Exception as e:
        print(f"Error writing state file: {e}")
        return jsonify({"message": "Error saving state"}), 500

# Route for serving the main HTML page (Unchanged)
@app.route('/')
def index():
    # We tell Flask to send the 'index.html' file from the 'frontend' folder
    return send_from_directory('../frontend', 'index.html')

# A simple example API endpoint (Unchanged)
@app.route('/api/hello')
def hello():
    # We return JSON data. The browser will see: {"message": "Hello from the backend!"}
    return {"message": "Hello from the backend!"}

# This makes the server run when you execute the script directly (Unchanged)
if __name__ == '__main__':
    # Need to import json at the top
    import json
    app.run(debug=True)
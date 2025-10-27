import os
import json # Moved to top
import signal # NEW: To catch shutdown signals
import sys # NEW: To exit the program
import time # NEW: To calculate time
from flask import Flask, send_from_directory, request, jsonify

# Initialize the Flask application
app = Flask(__name__, static_folder='../frontend', static_url_path='')

# Define the path for our state file.
# This will create 'state.json' inside the 'backend' folder.
STATE_FILE = os.path.join(os.path.dirname(__file__), 'state.json')


# --- NEW: Shutdown Handler ---
def pause_all_on_shutdown(sig, frame):
    """
    Catches Ctrl+C (SIGINT), reads the last state, pauses all running timers,
    and saves the new state before exiting.
    """
    # Note: 'sig' will be signal.SIGINT or signal.SIGTERM
    print(f"\nSignal {sig} detected! Shutting down server...")
    
    # 1. Read the current state
    state = {"isPaused": False, "timers": {}}
    if os.path.exists(STATE_FILE):
        try:
            with open(STATE_FILE, 'r') as f:
                data = f.read()
                if data:
                    state = json.loads(data)
        except Exception as e:
            print(f"Could not read state file, exiting: {e}")
            sys.exit(1) # Exit with error if we can't read

    # 2. Modify the state to be "paused"
    state['isPaused'] = True
    # Get current time in milliseconds (to match JavaScript's Date.now())
    now_ms = int(time.time() * 1000) 

    for timer_name, timer_data in state.get('timers', {}).items():
        if timer_data.get('state') == 'cooldown':
            try:
                # 'endTime' might be a string, ensure it's an int/float
                end_time_ms = int(timer_data.get('endTime', 0))
                remaining_ms = end_time_ms - now_ms
                
                timer_data['state'] = 'paused'
                timer_data['remaining'] = remaining_ms if remaining_ms > 0 else 0
                print(f"  > Pausing timer: {timer_name}")
            except (TypeError, ValueError) as e:
                # Handle bad data just in case
                print(f"Error processing timer {timer_name}: {e}")
                timer_data['state'] = 'default'
                timer_data['remaining'] = 0

    # 3. Write the new "all-paused" state back to the file
    try:
        with open(STATE_FILE, 'w') as f:
            json.dump(state, f, indent=2)
        print("Paused state saved successfully.")
    except Exception as e:
        print(f"Could not write new state file: {e}")

    # 4. Exit gracefully
    sys.exit(0)


# --- API Endpoint to LOAD state ---
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

# --- API Endpoint to SAVE state ---
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
    return {"message": "Hello from thebackend!"}

# This makes the server run when you execute the script directly
if __name__ == '__main__':
    # --- NEW: Register the signal handler for Ctrl+C ---
    # We check the WERKZEUG_RUN_MAIN env var to ensure this
    # only runs in the *main* process, not the reloader's child.
    if os.environ.get('WERKZEUG_RUN_MAIN') != 'true':
        signal.signal(signal.SIGINT, pause_all_on_shutdown)
        signal.signal(signal.SIGTERM, pause_all_on_shutdown) # <-- ADDED THIS LINE
    
    app.run(debug=True)


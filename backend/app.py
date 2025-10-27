import os
import json
import signal
import sys
import time
import shutil  # For safer file moving

from flask import Flask, send_from_directory, request, jsonify

# Path setup for state file (dev vs. bundled)
# Check if the application is running as a bundled executable
if getattr(sys, 'frozen', False):
    # We are running in a bundle (e.g., PyInstaller .exe)
    # Use sys._MEIPASS for bundled paths, and save state next to .exe
    base_path = sys._MEIPASS
    state_save_path = os.path.dirname(sys.executable)
    frontend_folder = os.path.join(base_path, 'frontend')
else:
    # We are running in a normal Python environment (development)
    base_path = os.path.dirname(__file__)
    state_save_path = base_path
    frontend_folder = os.path.join(base_path, '..', 'frontend')

# Define the path for our state file (writable location)
STATE_FILE = os.path.join(state_save_path, 'state.json')
STATE_FILE_TMP = STATE_FILE + '.tmp'

# Initialize the Flask application
app = Flask(__name__, static_folder=frontend_folder, static_url_path='')

def atomic_write_json(data, filename):
    """
    Atomically writes JSON data to a file by writing to a temporary file
    and then moving it to the final destination.
    """
    try:
        with open(STATE_FILE_TMP, 'w') as f:
            json.dump(data, f, indent=2)
        # shutil.move is an atomic operation on most POSIX systems
        shutil.move(STATE_FILE_TMP, filename)
        return True
    except Exception as e:
        print(f"Error during atomic write: {e}")
        # Clean up temp file if it exists
        if os.path.exists(STATE_FILE_TMP):
            os.remove(STATE_FILE_TMP)
        return False


def pause_all_on_shutdown(sig, frame):
    """
    Catches Ctrl+C (SIGINT) or TERM, reads the last state, pauses all
    running timers, and saves the new state before exiting.
    """
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
            sys.exit(1)  # Exit with error if we can't read

    # 2. Modify the state to be "paused"
    state['isPaused'] = True
    now_ms = int(time.time() * 1000)

    for timer_name, timer_data in state.get('timers', {}).items():
        if timer_data.get('state') == 'cooldown':
            try:
                end_time_ms = int(timer_data.get('endTime', 0))
                remaining_ms = end_time_ms - now_ms

                timer_data['state'] = 'paused'
                timer_data['remaining'] = remaining_ms if remaining_ms > 0 else 0
                print(f"  > Pausing timer: {timer_name}")
            except (TypeError, ValueError) as e:
                print(f"Error processing timer {timer_name}: {e}")
                timer_data['state'] = 'default'
                timer_data['remaining'] = 0

    # 3. Write the new "all-paused" state back to the file
    if atomic_write_json(state, STATE_FILE):
        print("Paused state saved successfully.")
    else:
        print("Could not write new state file.")

    # 4. Exit gracefully
    # sys.exit(0)
    # ^ Commented out to avoid issues with Flask's signal handling


@app.route('/api/state', methods=['GET'])
def get_state():
    """API Endpoint to LOAD state"""
    if not os.path.exists(STATE_FILE):
        return jsonify({"isPaused": False, "timers": {}})
    
    try:
        with open(STATE_FILE, 'r') as f:
            data = f.read()
            if not data:
                return jsonify({"isPaused": False, "timers": {}})
            return jsonify(json.loads(data))
    except Exception as e:
        print(f"Error reading state file: {e}")
        return jsonify({"isPaused": False, "timers": {}}), 500


@app.route('/api/state', methods=['POST'])
def save_state():
    """API Endpoint to SAVE state"""
    data = request.json
    
    # Use atomic write for safety
    if atomic_write_json(data, STATE_FILE):
        return jsonify({"message": "State saved successfully"}), 200
    else:
        return jsonify({"message": "Error saving state"}), 500

@app.route('/')
def index():
    """Route for serving the main HTML page"""
    return send_from_directory(frontend_folder, 'index.html')

@app.route('/api/hello')
def hello():
    """A simple example API endpoint"""
    return {"message": "Hello from the backend!"}


if __name__ == '__main__':
    # Register signal handlers
    if os.environ.get('WERKZEUG_RUN_MAIN') != 'true':
        signal.signal(signal.SIGINT, pause_all_on_shutdown)
        signal.signal(signal.SIGTERM, pause_all_on_shutdown)

    # Use 0.0.0.0 to be accessible on the network
    # Set debug=False for a "release"
    app.run(debug=False, host='0.0.0.0', port=5000)


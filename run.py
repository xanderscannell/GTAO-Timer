import os
import sys
import threading
import webview
from time import sleep

# --- Import the App ---
# We will use PyInstaller flags to ensure 'app' is findable
try:
    from app import app, _save_paused_state # type: ignore
except ImportError as e:
    print("Fatal Error: Could not import the 'app' module.")
    print(f"Full error: {e}")
    # Create a log file on crash so we can debug --windowed mode
    with open('gtao-timer-crash.log', 'w') as f:
        f.write(f"Fatal Error: Could not import the 'app' module.\n")
        f.write(f"Full error: {e}\n")
        f.write(f"Sys.path: {sys.path}\n")
    sys.exit(1)

# --- Server Management ---
def run_server():
    """Run the Flask server in its own thread."""
    # We set 'use_reloader=False' because the reloader
    # is incompatible with freezing the app.
    app.run(debug=False, use_reloader=False)

def on_closing():
    """
    Called when the webview window is closing.
    This triggers your graceful shutdown logic.
    """
    print("Window closing, pausing timers...")
    _save_paused_state()

# --- Main Application Start ---
if __name__ == '__main__':
    # 1. Start the Flask server in a background thread
    server_thread = threading.Thread(target=run_server)
    server_thread.daemon = True # Allows app to exit even if thread is running
    server_thread.start()

    # 2. Wait a moment for the server to start
    sleep(0.5)

    # 3. Create the webview window
    # This will load the URL of your running Flask app
    window = webview.create_window(
        'GTA Online Timer',  # Window Title
        'http://127.0.0.1:5000', # The URL of your app
        width=1280,
        height=800
    )

    # 4. Register your shutdown function
    # When the window 'closing' event fires, call 'on_closing'
    window.events.closing += on_closing

    # 5. Start the webview
    # This blocks until the window is closed
    webview.start()
    
    print("Application shut down.")
    sys.exit(0)
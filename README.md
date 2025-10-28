GTA Online Timer

A standalone desktop and web application designed to track all your important GTA Online business cooldowns. Built with a Python Flask backend and a modern vanilla JS frontend, this app ensures you never lose track of your timers, even if you close the app or restart your computer.

Core Features

18+ Timers: Tracks all essential business and heist cooldowns, including Cayo Perico (Solo/Team), Dr. Dre Contract, Acid Lab, Bunker, all MC Businesses, and more.

Simple Interface: A clean, responsive grid that works on both desktop and mobile.

One-Click Operation:

Click a timer to start its cooldown.

Timers on cooldown are grey and show the remaining time.

Timers that are ready turn green and display "00:00".

Click a "Ready" (green) timer to reset it.

Dark/Light Mode: A persistent theme toggle that remembers your choice.

Reset All: A "Reset All" button to clear all timers back to their default state.

How to Use

Timer States

The timer buttons have four distinct states:

Blue (Default): The timer is ready to be started. Click it to begin the cooldown.

Grey (Cooldown): The timer is actively counting down.

Green (Ready): The cooldown has finished. The timer is ready to be reset.

Orange (Paused): The timer is paused. This is part of the "Offline Mode".

Universal Buttons

Online/Offline Button: This button manages the app's "Offline" state.

Online (Green): The default state. All timers run as normal.

Offline (Red): When toggled, all currently running timers are "paused" (turning orange). This is for when you are not actively playing the game. When you go back "Online," all paused timers will resume from where they left off.

Reset All Button: This "warning" button instantly resets all timers (running, ready, or paused) back to their default blue state.

Key Technical Features

This app includes several "smart" features to ensure your timer data is never lost.

Complete State Persistence: All timer states (including remaining time) and your selected theme are saved to a state.json file on every action.

Safe State Location: The state.json file is stored in your operating system's user data directory (e.g., AppData on Windows) using appdirs. This means you can delete or replace the main application .exe with a new version without losing your timers.

Graceful Shutdown: When you close the desktop app window or stop the server, the app automatically triggers a "pause all" event, saving the exact remaining time for every running timer. When you restart, the app loads in "Offline" mode with all your timers safely paused.

Browser-Close Safety: If running in a web browser, the app uses navigator.sendBeacon to save a paused state to the backend, even if you accidentally close the tab.

Multi-User / Multi-Tab Sync: The app polls the backend every 3 seconds for changes. This allows you to open the timer on multiple devices on your local network (e.g., your PC and your phone) and have them stay perfectly in sync.

Standalone Executable: The project uses pyinstaller and pywebview to bundle the entire Flask backend and web frontend into a single, no-installation .exe file for easy distribution.

How to Run (Development)

Clone the repository (or use your local files).

Create and activate a virtual environment:

python -m venv venv
# On Windows
venv\Scripts\activate
# On macOS/Linux
source venv/bin/activate


Install dependencies:

pip install -r backend/requirements.txt


Run the application:

python run.py


This will start the Flask server and open the pywebview desktop window.

How to Build the Executable

Ensure you are in your activated virtual environment with all requirements.txt packages installed.

Run the build script:

build.bat


Find your app: The final GTAO-Timer.exe file will be located in the dist/ folder.
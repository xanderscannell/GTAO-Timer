document.addEventListener("DOMContentLoaded", async () => {
    
    // --- Get all our elements ---
    const darkModeToggle = document.getElementById("darkModeToggle");
    const allTimerButtons = document.querySelectorAll(".timer-button");
    const pauseAllButton = document.getElementById("pauseAllButton");
    const resetAllButton = document.getElementById("resetAllButton");

    // --- Global Pause State ---
    let isPaused = false;
    let lastState = {}; // NEW: To store the last known state

    // --- Theme Toggle Logic (Unchanged) ---
    
    // 1. Check for saved theme in localStorage
    const savedTheme = localStorage.getItem("theme") || "light";
    document.body.dataset.theme = savedTheme;

    // 2. Add click event for the toggle button
    darkModeToggle.addEventListener("click", () => {
        let currentTheme = document.body.dataset.theme;
        let newTheme = currentTheme === "light" ? "dark" : "light";
        document.body.dataset.theme = newTheme;
        localStorage.setItem("theme", newTheme);
    });

    // --- Timer Functions (Unchanged) ---

    /**
     * Starts the countdown for a specific button.
     * @param {HTMLElement} timerButton - The button to start.
     */
    function startTimer(timerButton) {
        const cooldownSeconds = parseInt(timerButton.dataset.cooldown, 10);
        const endTime = Date.now() + cooldownSeconds * 1000;

        // Store endTime on the element for pausing
        timerButton.dataset.endTime = endTime;
        
        timerButton.dataset.state = "cooldown";
        timerButton.disabled = true; 
        timerButton.lastDisplayedTime = ""; 

        updateTimer(timerButton, endTime); 

        // Store the interval ID on the element
        timerButton.timerInterval = setInterval(() => {
            updateTimer(timerButton, endTime);
        }, 100);

        saveState(); // Save state
    }

    /**
     * Updates a button's text with the remaining time.
     * @param {HTMLElement} timerButton - The button to update.
     * @param {number} endTime - The timestamp when the timer ends.
     */
    function updateTimer(timerButton, endTime) {
        const remainingTime = endTime - Date.now();
        const timerName = timerButton.dataset.name;
        let newTimeHTML;

        if (remainingTime <= 0) {
            clearInterval(timerButton.timerInterval);
            finishTimer(timerButton); // Calls finishTimer
            return; 
        } else {
            const totalSeconds = Math.floor(remainingTime / 1000);
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;

            const formattedMinutes = String(minutes).padStart(2, '0');
            const formattedSeconds = String(seconds).padStart(2, '0');

            if (hours > 0) {
                newTimeHTML = `${timerName}<br>${hours}:${formattedMinutes}:${formattedSeconds}`;
            } else {
                newTimeHTML = `${timerName}<br>${formattedMinutes}:${formattedSeconds}`;
            }
        }

        // Use lastDisplayedTime stored on the element
        if (newTimeHTML !== timerButton.lastDisplayedTime) {
            timerButton.innerHTML = newTimeHTML;
            timerButton.lastDisplayedTime = newTimeHTML;
        }
    }

    /**
     * Sets a button to its "ready" (green) state.
     * @param {HTMLElement} timerButton - The button to finish.
     */
    function finishTimer(timerButton) {
        clearInterval(timerButton.timerInterval); 
        timerButton.timerInterval = null; // Explicitly clear
        timerButton.dataset.state = "ready";
        timerButton.disabled = false;
        
        const timerName = timerButton.dataset.name;
        const finishedTimeHTML = `${timerName}<br>00:00`;
        
        if (timerButton.lastDisplayedTime !== finishedTimeHTML) {
            timerButton.innerHTML = finishedTimeHTML;
            timerButton.lastDisplayedTime = finishedTimeHTML;
        }
        
        // Don't save state here, let the user reset it
    }

    /**
     * Resets a button to its original "default" (blue) state.
     * @param {HTMLElement} timerButton - The button to reset.
     */
    function resetTimer(timerButton) {
        clearInterval(timerButton.timerInterval); // Stop any running timer
        timerButton.timerInterval = null;
        timerButton.dataset.state = "default";
        timerButton.disabled = false;
        
        const timerName = timerButton.dataset.name;
        timerButton.innerHTML = timerName;
        timerButton.lastDisplayedTime = timerName;

        saveState(); // Save state
    }

    // --- Initialize Each Timer Button (Unchanged) ---
    allTimerButtons.forEach(timerButton => {
        
        timerButton.timerInterval = null;
        timerButton.lastDisplayedTime = timerButton.dataset.name;

        timerButton.addEventListener("click", () => {
            if (isPaused) return;
            const currentState = timerButton.dataset.state;

            if (currentState === "default") {
                startTimer(timerButton);
            } else if (currentState === "ready") {
                resetTimer(timerButton);
            }
        });
    });

    // --- Universal Button Event Listeners ---

    // 1. Reset All Button
    resetAllButton.addEventListener("click", () => {
        allTimerButtons.forEach(button => {
            // Manually reset without saving
            clearInterval(button.timerInterval);
            button.timerInterval = null;
            button.dataset.state = "default";
            button.disabled = false;
            button.innerHTML = button.dataset.name;
            button.lastDisplayedTime = button.dataset.name;
        });

        if (isPaused) {
            isPaused = false;
            pauseAllButton.textContent = "Pause All";
        }
        
        saveState(); // Save state ONCE
    });

    // 2. Pause/Resume All Button
    pauseAllButton.addEventListener("click", () => {
        isPaused = !isPaused; // Toggle the paused state
        pauseAllButton.textContent = isPaused ? "Resume All" : "Pause All";

        if (isPaused) {
            // --- PAUSE ALL ---
            allTimerButtons.forEach(button => {
                if (button.dataset.state === "cooldown") {
                    clearInterval(button.timerInterval);
                    button.timerInterval = null;
                    const endTime = parseInt(button.dataset.endTime, 10);
                    button.dataset.remaining = endTime - Date.now();
                    button.dataset.state = "paused";
                }
            });
        } else {
            // --- RESUME ALL ---
            allTimerButtons.forEach(button => {
                if (button.dataset.state === "paused") {
                    const remaining = parseInt(button.dataset.remaining, 10);
                    const newEndTime = Date.now() + remaining;

                    button.dataset.endTime = newEndTime;
                    button.dataset.state = "cooldown";
                    
                    updateTimer(button, newEndTime);
                    button.timerInterval = setInterval(() => {
                        updateTimer(button, newEndTime);
                    }, 100);
                }
            });
        }
        
        saveState(); // Save state
    });


    // --- REFACTORED: State Persistence Functions ---

    /**
     * Gathers all timer data and saves it to the backend.
     */
    async function saveState() {
        const timerStates = {};
        allTimerButtons.forEach(button => {
            const name = button.dataset.name;
            timerStates[name] = {
                state: button.dataset.state,
                endTime: button.dataset.endTime,
                remaining: button.dataset.remaining
            };
        });

        const appState = {
            isPaused: isPaused,
            timers: timerStates
        };
        
        // NEW: Update our local lastState immediately
        lastState = appState;

        try {
            await fetch('/api/state', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(appState)
            });
        } catch (error) {
            console.error("Failed to save state:", error);
        }
    }

    /**
     * NEW: Re-usable function to apply a state object to the UI.
     * This function does NOT call saveState() to prevent loops.
     */
    function syncUI(appState) {
        // 1. Restore Global Pause State
        isPaused = appState.isPaused || false;
        pauseAllButton.textContent = isPaused ? "Resume All" : "Pause All";
        
        const timerStates = appState.timers || {};

        // 2. Restore Individual Timers
        allTimerButtons.forEach(button => {
            const timerName = button.dataset.name;
            const savedTimer = timerStates[timerName];
            
            // CRITICAL: Stop any existing timer to prevent duplicates
            clearInterval(button.timerInterval);
            button.timerInterval = null;

            if (!savedTimer || savedTimer.state === "default") {
                // --- Set to DEFAULT state ---
                button.dataset.state = "default";
                button.disabled = false;
                button.innerHTML = timerName;
                button.lastDisplayedTime = timerName;
                
            } else if (savedTimer.state === "ready") {
                // --- Set to READY state ---
                button.dataset.state = "ready";
                button.disabled = false;
                const finishedTimeHTML = `${timerName}<br>00:00`;
                button.innerHTML = finishedTimeHTML;
                button.lastDisplayedTime = finishedTimeHTML;

            } else if (savedTimer.state === "paused") {
                // --- Set to PAUSED state ---
                const remaining = parseInt(savedTimer.remaining, 10);
                button.dataset.remaining = remaining;
                button.dataset.state = "paused";
                button.disabled = true;
                const fakeEndTime = Date.now() + remaining;
                updateTimer(button, fakeEndTime); // updateTimer doesn't save

            } else if (savedTimer.state === "cooldown") {
                // --- Set to COOLDOWN state ---
                const endTime = parseInt(savedTimer.endTime, 10);
                
                if (endTime > Date.now()) {
                    // Timer is still running
                    button.dataset.endTime = endTime;
                    button.dataset.state = "cooldown";
                    button.disabled = true;

                    if (isPaused) {
                        // App is globally paused, set button to paused
                        button.dataset.remaining = endTime - Date.now();
                        button.dataset.state = "paused";
                        updateTimer(button, endTime);
                    } else {
                        // App is not paused, restart the interval
                        updateTimer(button, endTime);
                        button.timerInterval = setInterval(() => {
                            updateTimer(button, endTime);
                        }, 100);
                    }
                } else {
                    // Timer finished while app was closed
                    button.dataset.state = "ready";
                    button.disabled = false;
                    const finishedTimeHTML = `${timerName}<br>00:00`;
                    button.innerHTML = finishedTimeHTML;
                    button.lastDisplayedTime = finishedTimeHTML;
                }
            }
        });
    }

    /**
     * Loads the *initial* state from the backend.
     */
    async function loadState() {
        try {
            const response = await fetch('/api/state');
            if (!response.ok) throw new Error('Failed to fetch state');
            const appState = await response.json();
            
            lastState = appState; // Store this as our "last known" state
            syncUI(appState);     // Apply this state to the UI

        } catch (error) {
            console.error("Failed to load initial state:", error);
            // If load fails, just start with default state
            lastState = { isPaused: false, timers: {} };
            syncUI(lastState);
        }
    }
    
    // --- Save and Pause State on Browser Close (Unchanged) ---
    window.addEventListener("unload", () => {
        // This function is synchronous and uses sendBeacon
        // (Copied from previous version)
        const timerStates = {};
        allTimerButtons.forEach(button => {
            const name = button.dataset.name;
            let state = button.dataset.state;
            let endTime = button.dataset.endTime;
            let remaining = button.dataset.remaining;

            if (state === "cooldown") {
                state = "paused";
                const remainingMs = parseInt(endTime, 10) - Date.now();
                remaining = remainingMs > 0 ? remainingMs : 0;
            }

            timerStates[name] = {
                state: state,
                endTime: endTime,
                remaining: remaining
            };
        });

        const appState = {
            isPaused: true, 
            timers: timerStates
        };

        const blob = new Blob([JSON.stringify(appState)], { type: 'application/json' });
        navigator.sendBeacon('/api/state', blob);
    });

    // --- Load the initial state ---
    await loadState();
    
    // Save state once after loading to persist any timers
    // that may have expired while the app was closed
    saveState(); 
    
    // --- NEW: Polling for Changes ---
    setInterval(async () => {
        try {
            const response = await fetch('/api/state');
            if (!response.ok) {
                console.warn("Polling: Server not reachable.");
                return;
            }
            
            const newState = await response.json();
            
            // Compare stringified JSON. If no change, do nothing.
            if (JSON.stringify(newState) === JSON.stringify(lastState)) {
                return;
            }

            // If a change is found:
            console.log("Change detected from server, syncing UI...");
            lastState = newState; // Update our local state
            syncUI(newState);     // Re-sync the UI

        } catch (error) {
            console.warn("Polling for state failed:", error);
        }
    }, 3000); // Poll every 3 seconds
});


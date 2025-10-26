// Add 'async' to the main function to allow 'await'
document.addEventListener("DOMContentLoaded", async () => {
    
    // --- Get all our elements ---
    const darkModeToggle = document.getElementById("darkModeToggle");
    const allTimerButtons = document.querySelectorAll(".timer-button");
    const pauseAllButton = document.getElementById("pauseAllButton");
    const resetAllButton = document.getElementById("resetAllButton");

    // --- Global Pause State ---
    let isPaused = false;

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

    // --- Universal Timer Functions ---

    /**
     * Starts the countdown for a specific button.
     * @param {HTMLElement} timerButton - The button to start.
     */
    function startTimer(timerButton) {
        const cooldownSeconds = parseInt(timerButton.dataset.cooldown, 10);
        const endTime = Date.now() + cooldownSeconds * 1000;

        // Store endTime on the element
        timerButton.dataset.endTime = endTime;
        
        timerButton.dataset.state = "cooldown";
        timerButton.disabled = true; 
        timerButton.lastDisplayedTime = ""; 

        updateTimer(timerButton, endTime); 

        // Store the interval ID on the element
        timerButton.timerInterval = setInterval(() => {
            updateTimer(timerButton, endTime);
        }, 100);

        // --- NEW: Save state to server ---
        saveState();
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
            finishTimer(timerButton);
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
        timerButton.dataset.state = "ready";
        timerButton.disabled = false;
        
        const timerName = timerButton.dataset.name;
        const finishedTimeHTML = `${timerName}<br>00:00`;
        
        if (timerButton.lastDisplayedTime !== finishedTimeHTML) {
            timerButton.innerHTML = finishedTimeHTML;
            timerButton.lastDisplayedTime = finishedTimeHTML;
        }
        
        // Note: We don't need to call saveState() here
        // because it will be called when the user
        // clicks the 'ready' button to reset it.
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

        // Clear persistence data for this timer
        timerButton.dataset.endTime = "";
        timerButton.dataset.remaining = "";

        // --- NEW: Save state to server ---
        saveState();
    }

    // --- Initialize Each Timer Button ---
    // Loop over each button and apply the timer logic to it
    allTimerButtons.forEach(timerButton => {
        
        // Initialize state properties on the element itself
        timerButton.timerInterval = null;
        timerButton.lastDisplayedTime = timerButton.dataset.name;

        // --- Main Click Event Handler ---
        timerButton.addEventListener("click", () => {
            // Only allow click if timers are not globally paused
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
            resetTimer(button); // resetTimer() already calls saveState()
        });

        // If timers were paused, reset the pause button too
        if (isPaused) {
            isPaused = false;
            pauseAllButton.textContent = "Pause All";
            // saveState() is called by resetTimer()
        }
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
                    const endTime = parseInt(button.dataset.endTime, 10);
                    // Store the *remaining milliseconds*
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

                    // Store new end time
                    button.dataset.endTime = newEndTime;
                    button.dataset.state = "cooldown";
                    
                    // Immediately update text and restart interval
                    updateTimer(button, newEndTime);
                    button.timerInterval = setInterval(() => {
                        updateTimer(button, newEndTime);
                    }, 100);
                }
            });
        }

        // --- NEW: Save state to server ---
        saveState();
    });

    // --- NEW: State Persistence Functions ---

    /**
     * Gathers all timer data and saves it to the backend.
     */
    async function saveState() {
        const timerStates = {};
        allTimerButtons.forEach(button => {
            const name = button.dataset.name;
            timerStates[name] = {
                state: button.dataset.state,
                endTime: button.dataset.endTime,     // Store 'endTime' for running timers
                remaining: button.dataset.remaining  // Store 'remaining' for paused timers
            };
        });

        const appState = {
            isPaused: isPaused,
            timers: timerStates
        };

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
     * Loads the state from the backend and "re-hydrates" the page.
     */
    async function loadState() {
        try {
            const response = await fetch('/api/state');
            if (!response.ok) {
                throw new Error('Failed to fetch state');
            }
            const appState = await response.json();

            // 1. Restore Global Pause State
            isPaused = appState.isPaused || false;
            pauseAllButton.textContent = isPaused ? "Resume All" : "Pause All";

            // 2. Restore Individual Timers
            allTimerButtons.forEach(button => {
                const timerName = button.dataset.name;
                const savedTimer = appState.timers[timerName];

                if (!savedTimer) {
                    // resetTimer(button); // Let's not reset, just in case.
                    return;
                }

                // Restore state based on what was saved
                switch (savedTimer.state) {
                    case "cooldown":
                        const endTime = parseInt(savedTimer.endTime, 10);
                        if (endTime > Date.now()) {
                            // Timer is still running
                            button.dataset.endTime = endTime;
                            button.dataset.state = "cooldown";
                            button.disabled = true;

                            // If app was paused, just show paused state
                            if (isPaused) {
                                button.dataset.remaining = endTime - Date.now();
                                button.dataset.state = "paused";
                                // Manually update text to last known time
                                updateTimer(button, endTime); 
                            } else {
                                // Otherwise, restart the timer interval
                                updateTimer(button, endTime);
                                button.timerInterval = setInterval(() => {
                                    updateTimer(button, endTime);
                                }, 100);
                            }
                        } else {
                            // Timer finished while app was closed
                            finishTimer(button);
                        }
                        break;
                    
                    case "paused":
                        // Timer was explicitly paused
                        const remaining = parseInt(savedTimer.remaining, 10);
                        if (remaining > 0) {
                            button.dataset.remaining = remaining;
                            button.dataset.state = "paused";
                            button.disabled = true;

                            // Calculate a "fake" endTime to pass to updateTimer
                            const fakeEndTime = Date.now() + remaining;
                            updateTimer(button, fakeEndTime);
                        } else {
                            // Paused but remaining time is zero, so it's ready
                            finishTimer(button);
                        }
                        break;

                    case "ready":
                        finishTimer(button);
                        break;

                    case "default":
                    default:
                        // Do nothing, leave it at default
                        resetTimer(button); // Call reset to ensure clean state
                        break;
                }
            });

        } catch (error) {
            console.error("Failed to load state:", error);
            // If loading fails, just start fresh
        }
    }

    // --- NEW: Save and Pause State on Browser Close ---
    // We add this listener to the 'window' object.
    // It fires when the tab or browser is closed.
    window.addEventListener("unload", () => {
        // NOTE: This function MUST be synchronous.
        // We cannot use 'await fetch()' here as the browser will
        // close the page before the request completes.

        const timerStates = {};
        allTimerButtons.forEach(button => {
            const name = button.dataset.name;
            let state = button.dataset.state;
            let endTime = button.dataset.endTime;
            let remaining = button.dataset.remaining;

            // --- This is the key logic ---
            // If a timer is actively running, we convert it
            // to a 'paused' state before saving.
            if (state === "cooldown") {
                state = "paused";
                // Calculate the exact remaining time
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
            // Force the global state to 'paused'
            isPaused: true, 
            timers: timerStates
        };

        // Convert the state object to a JSON string and then to a Blob.
        const blob = new Blob([JSON.stringify(appState)], { type: 'application/json' });
        
        // 'sendBeacon' is the ONLY reliable way to send data on page unload.
        // It sends a POST request to our /api/state endpoint.
        navigator.sendBeacon('/api/state', blob);
    });

    // --- Load the state when the page opens ---
    await loadState();
    // After initial load, we do one save to clean up any timers
    // that might have expired while the app was closed
    // or to clean up states that are no longer valid.
    saveState();

});

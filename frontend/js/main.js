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
    const savedTheme = localStorage.getItem("theme") || "light";
    document.body.dataset.theme = savedTheme;

    darkModeToggle.addEventListener("click", () => {
        let currentTheme = document.body.dataset.theme;
        let newTheme = currentTheme === "light" ? "dark" : "light";
        document.body.dataset.theme = newTheme;
        localStorage.setItem("theme", newTheme);
    });

    // --- NEW: Universal Timer Functions ---
    // (These functions are mostly unchanged, just 'startTimer'
    // and 'resetTimer' will call 'saveState()')

    /**
     * Starts the countdown for a specific button.
     */
    function startTimer(timerButton) {
        const cooldownSeconds = parseInt(timerButton.dataset.cooldown, 10);
        const endTime = Date.now() + cooldownSeconds * 1000;

        timerButton.dataset.endTime = endTime;
        timerButton.dataset.state = "cooldown";
        timerButton.disabled = true; 
        timerButton.lastDisplayedTime = ""; 

        updateTimer(timerButton, endTime); 

        timerButton.timerInterval = setInterval(() => {
            updateTimer(timerButton, endTime);
        }, 100);

        // --- NEW: Save state to server ---
        saveState();
    }

    /**
     * Updates a button's text with the remaining time.
     * (Unchanged from your file)
     */
    function updateTimer(timerButton, endTime) {
        // ... (This function is identical to your original)
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

        if (newTimeHTML !== timerButton.lastDisplayedTime) {
            timerButton.innerHTML = newTimeHTML;
            timerButton.lastDisplayedTime = newTimeHTML;
        }
    }

    /**
     * Sets a button to its "ready" (green) state.
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
     */
    function resetTimer(timerButton) {
        clearInterval(timerButton.timerInterval);
        timerButton.timerInterval = null;
        timerButton.dataset.state = "default";
        timerButton.disabled = false;
        
        const timerName = timerButton.dataset.name;
        timerButton.innerHTML = timerName;
        timerButton.lastDisplayedTime = timerName;
        
        // --- NEW: Save state to server ---
        saveState();
    }

    // --- Initialize Each Timer Button ---
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
            resetTimer(button); // resetTimer() already calls saveState()
        });

        if (isPaused) {
            isPaused = false;
            pauseAllButton.textContent = "Pause All";
            // saveState() is called by resetTimer()
        }
    });

    // 2. Pause/Resume All Button
    pauseAllButton.addEventListener("click", () => {
        isPaused = !isPaused; 
        pauseAllButton.textContent = isPaused ? "Resume All" : "Pause All";

        if (isPaused) {
            // --- PAUSE ALL ---
            allTimerButtons.forEach(button => {
                if (button.dataset.state === "cooldown") {
                    clearInterval(button.timerInterval);
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
                    resetTimer(button); // Reset if no state found
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
                        button.dataset.remaining = remaining;
                        button.dataset.state = "paused";
                        button.disabled = true;

                        // Calculate a "fake" endTime to pass to updateTimer
                        const fakeEndTime = Date.now() + remaining;
                        updateTimer(button, fakeEndTime);
                        break;

                    case "ready":
                        finishTimer(button);
                        break;

                    case "default":
                    default:
                        resetTimer(button); // This will call saveState, but it's fine
                        break;
                }
            });

        } catch (error) {
            console.error("Failed to load state:", error);
            // If loading fails, just start fresh
        }
    }

    // --- NEW: Load the state when the page opens ---
    await loadState();
    // After initial load, we do one save to clean up any timers
    // that might have expired while the app was closed.
    saveState();

});
document.addEventListener("DOMContentLoaded", async () => {
    
    // Get all our elements
    const darkModeToggle = document.getElementById("darkModeToggle");
    const allTimerButtons = document.querySelectorAll(".timer-button");
    const onlineOfflineButton = document.getElementById("onlineOfflineButton"); // Renamed
    const resetAllButton = document.getElementById("resetAllButton");

    // Renamed 'isPaused' to 'isOffline' for clarity
    let isOffline = false; 
    let lastState = {}; // To store the last known state

    // Theme Toggle Logic
    const savedTheme = localStorage.getItem("theme") || "light";
    document.body.dataset.theme = savedTheme;

    darkModeToggle.addEventListener("click", () => {
        let currentTheme = document.body.dataset.theme;
        let newTheme = currentTheme === "light" ? "dark" : "light";
        document.body.dataset.theme = newTheme;
        localStorage.setItem("theme", newTheme);
    });

    // Timer Functions

    /**
     * Starts the countdown for a specific button.
     * @param {HTMLElement} timerButton - The button to start.
     */
    function startTimer(timerButton) {
        const cooldownSeconds = parseInt(timerButton.dataset.cooldown, 10);
        const endTime = Date.now() + cooldownSeconds * 1000;

        timerButton.dataset.endTime = endTime;
        timerButton.dataset.state = "cooldown";
        timerButton.disabled = true; 
        timerButton.lastDisplayedTime = ""; 

        updateTimer(timerButton, endTime); 
        updateAriaLabel(timerButton); // Accessibility

        timerButton.timerInterval = setInterval(() => {
            updateTimer(timerButton, endTime);
        }, 100);

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

        if (newTimeHTML !== timerButton.lastDisplayedTime) {
            timerButton.innerHTML = newTimeHTML;
            timerButton.lastDisplayedTime = newTimeHTML;
            updateAriaLabel(timerButton); // Accessibility
        }
    }

    /**
     * Sets a button to its "ready" (green) state.
     * @param {HTMLElement} timerButton - The button to finish.
     */
    function finishTimer(timerButton) {
        clearInterval(timerButton.timerInterval); 
        timerButton.timerInterval = null; 
        timerButton.dataset.state = "ready";
        timerButton.disabled = false;
        
        const timerName = timerButton.dataset.name;
        const finishedTimeHTML = `${timerName}<br>00:00`;
        
        if (timerButton.lastDisplayedTime !== finishedTimeHTML) {
            timerButton.innerHTML = finishedTimeHTML;
            timerButton.lastDisplayedTime = finishedTimeHTML;
        }
        
        updateAriaLabel(timerButton); // Accessibility
        // Don't save state here
    }

    /**
     * Resets a button to its original "default" (blue) state.
     * @param {HTMLElement} timerButton - The button to reset.
     */
    function resetTimer(timerButton) {
        clearInterval(timerButton.timerInterval); 
        timerButton.timerInterval = null;
        timerButton.dataset.state = "default";
        timerButton.disabled = false;
        
        const timerName = timerButton.dataset.name;
        timerButton.innerHTML = timerName;
        timerButton.lastDisplayedTime = timerName;
        
        updateAriaLabel(timerButton); // Accessibility

        saveState(); 
    }
    
    /**
     * Updates the aria-label for accessibility.
     * @param {HTMLElement} timerButton
     */
    function updateAriaLabel(timerButton) {
        const name = timerButton.dataset.name;
        const state = timerButton.dataset.state;
        
        if (state === 'default') {
            timerButton.setAttribute('aria-label', `Start ${name} timer`);
        } else if (state === 'ready') {
            timerButton.setAttribute('aria-label', `Reset ${name} timer`);
        } else if (state === 'cooldown' || state === 'paused') {
            // Get the plain text time, e.g., "Cayo Perico 01:23:45"
            const timeText = timerButton.innerText.replace('<br>', ' ');
            timerButton.setAttribute('aria-label', `${timeText} remaining`);
        }
    }


    // Initialize Each Timer Button
    allTimerButtons.forEach(timerButton => {
        
        timerButton.timerInterval = null;
        timerButton.lastDisplayedTime = timerButton.dataset.name;

        timerButton.addEventListener("click", () => {
            const currentState = timerButton.dataset.state;

            if (isOffline) {
                // Offline click logic
                if (currentState === "ready") {
                    // Reset a finished timer (green -> blue)
                    resetTimer(timerButton);
                } else if (currentState === "default") {
                    // Start a new timer directly into paused mode (blue -> orange)
                    const cooldownSeconds = parseInt(timerButton.dataset.cooldown, 10);
                    const remainingMs = cooldownSeconds * 1000;
                    
                    timerButton.dataset.remaining = remainingMs;
                    timerButton.dataset.state = "paused";
                    timerButton.disabled = true;
                    
                    // Use updateTimer to set the initial time display
                    const fakeEndTime = Date.now() + remainingMs;
                    updateTimer(timerButton, fakeEndTime); 
                    
                    updateAriaLabel(timerButton);
                    saveState();
                }
                // In offline mode, clicking a 'cooldown' (grey) or 'paused' (orange) button does nothing.

            } else {
                // Online click logic
                if (currentState === "default") {
                    // Start a timer normally (blue -> grey)
                    startTimer(timerButton);
                } else if (currentState === "ready") {
                    // Reset a finished timer (green -> blue)
                    resetTimer(timerButton);
                }
                // In online mode, clicking a 'cooldown' (grey) or 'paused' (orange) button does nothing.
            }
        });
    });

    // Universal Button Event Listeners

    // Reset All Button
    resetAllButton.addEventListener("click", () => {
        allTimerButtons.forEach(button => {
            clearInterval(button.timerInterval);
            button.timerInterval = null;
            button.dataset.state = "default";
            button.disabled = false;
            button.innerHTML = button.dataset.name;
            button.lastDisplayedTime = button.dataset.name;
            updateAriaLabel(button); // Accessibility
        });

        if (isOffline) {
            isOffline = false;
            // Update the Online/Offline button
            onlineOfflineButton.textContent = "Online";
            onlineOfflineButton.classList.remove("u-button-offline");
            onlineOfflineButton.classList.add("u-button-online");
        }
        
        saveState(); // Save state ONCE
    });

    // Online/Offline Button
    onlineOfflineButton.addEventListener("click", () => {
        isOffline = !isOffline; // Toggle the offline state

        if (isOffline) {
            // Going offline
            onlineOfflineButton.textContent = "Offline";
            onlineOfflineButton.classList.remove("u-button-online");
            onlineOfflineButton.classList.add("u-button-offline");

            allTimerButtons.forEach(button => {
                if (button.dataset.state === "cooldown") {
                    clearInterval(button.timerInterval);
                    button.timerInterval = null;
                    const endTime = parseInt(button.dataset.endTime, 10);
                    const remainingMs = endTime - Date.now();
                    button.dataset.remaining = remainingMs > 0 ? remainingMs : 0;
                    button.dataset.state = "paused"; // Backend state is still 'paused'
                    updateAriaLabel(button); 
                }
            });
        } else {
            // Going online
            onlineOfflineButton.textContent = "Online";
            onlineOfflineButton.classList.remove("u-button-offline");
            onlineOfflineButton.classList.add("u-button-online");

            allTimerButtons.forEach(button => {
                if (button.dataset.state === "paused") {
                    const remaining = parseInt(button.dataset.remaining, 10);
                    const newEndTime = Date.now() + remaining;

                    button.dataset.endTime = newEndTime;
                    button.dataset.state = "cooldown";
                    updateAriaLabel(button); 
                    
                    updateTimer(button, newEndTime);
                    button.timerInterval = setInterval(() => {
                        updateTimer(button, newEndTime);
                    }, 100);
                }
            });
        }
        
        saveState(); // Save state
    });


    // State Persistence Functions

    /**
     * Gathers the current state from the DOM.
     * @returns {object} The complete application state.
     */
    function buildCurrentState() {
        const timerStates = {};
        allTimerButtons.forEach(button => {
            const name = button.dataset.name;
            timerStates[name] = {
                state: button.dataset.state,
                endTime: button.dataset.endTime,
                remaining: button.dataset.remaining
            };
        });

        return {
            isPaused: isOffline, // Map 'isOffline' to 'isPaused' for the backend
            timers: timerStates
        };
    }

    /**
     * Gathers all timer data and saves it to the backend.
     */
    async function saveState() {
        const appState = buildCurrentState();
        
        // Update our local lastState immediately
        lastState = appState;

        try {
            const response = await fetch('/api/state', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(appState)
            });
            if (!response.ok) {
                console.error("Server failed to save state:", response.statusText);
            }
        } catch (error) {
            console.error("Failed to save state:", error);
        }
    }

    /**
     * Re-usable function to apply a state object to the UI.
     * This function does NOT call saveState() to prevent loops.
     */
    function syncUI(appState) {
        // Restore Online/Offline State
        // The backend state is still called 'isPaused'
        isOffline = appState.isPaused || false; 
        
        if (isOffline) {
            onlineOfflineButton.textContent = "Offline";
            onlineOfflineButton.classList.remove("u-button-online");
            onlineOfflineButton.classList.add("u-button-offline");
        } else {
            onlineOfflineButton.textContent = "Online";
            onlineOfflineButton.classList.remove("u-button-offline");
            onlineOfflineButton.classList.add("u-button-online");
        }
        
        const timerStates = appState.timers || {};

        // Restore Individual Timers
        allTimerButtons.forEach(button => {
            const timerName = button.dataset.name;
            const savedTimer = timerStates[timerName];
            
            clearInterval(button.timerInterval);
            button.timerInterval = null;

            let finalState = 'default';

            if (!savedTimer || savedTimer.state === "default") {
                // Set to DEFAULT state
                button.dataset.state = "default";
                button.disabled = false;
                button.innerHTML = timerName;
                button.lastDisplayedTime = timerName;
                
            } else if (savedTimer.state === "ready") {
                // Set to READY state
                finalState = 'ready';
                button.dataset.state = "ready";
                button.disabled = false;
                const finishedTimeHTML = `${timerName}<br>00:00`;
                button.innerHTML = finishedTimeHTML;
                button.lastDisplayedTime = finishedTimeHTML;

            } else if (savedTimer.state === "paused") {
                // Set to PAUSED state
                finalState = 'paused';
                const remaining = parseInt(savedTimer.remaining, 10);
                button.dataset.remaining = remaining;
                button.dataset.state = "paused";
                button.disabled = true;
                const fakeEndTime = Date.now() + remaining;
                updateTimer(button, fakeEndTime); 

            } else if (savedTimer.state === "cooldown") {
                // Set to COOLDOWN state
                const endTime = parseInt(savedTimer.endTime, 10);
                
                if (endTime > Date.now()) {
                    // Timer is still running
                    button.dataset.endTime = endTime;
                    button.disabled = true;

                    if (isOffline) { // Check 'isOffline'
                        // App is globally offline, set button to paused
                        finalState = 'paused';
                        button.dataset.remaining = endTime - Date.now();
                        button.dataset.state = "paused";
                        updateTimer(button, endTime);
                    } else {
                        // App is not paused, restart the interval
                        finalState = 'cooldown';
                        button.dataset.state = "cooldown";
                        updateTimer(button, endTime);
                        button.timerInterval = setInterval(() => {
                            updateTimer(button, endTime);
                        }, 100);
                    }
                } else {
                    // Timer finished while app was closed
                    finalState = 'ready';
                    button.dataset.state = "ready";
                    button.disabled = false;
                    const finishedTimeHTML = `${timerName}<br>00:00`;
                    button.innerHTML = finishedTimeHTML;
                    button.lastDisplayedTime = finishedTimeHTML;
                }
            }
            updateAriaLabel(button); // Set ARIA label on sync
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
            
            lastState = appState; 
            syncUI(appState);     

        } catch (error) {
            console.error("Failed to load initial state:", error);
            lastState = { isPaused: false, timers: {} };
            syncUI(lastState);
        }
    }
    
    /**
     * Builds a "paused" state and sends it via sendBeacon.
     * This is more reliable on browser close/hide.
     */
    function savePausedStateOnExit() {
        // Get the state as it is *right now*
        const appState = buildCurrentState();
        
        // Force it into a "paused" state for saving
        appState.isPaused = true;
        const now = Date.now();
        
        Object.values(appState.timers).forEach(timer => {
            if (timer.state === "cooldown") {
                timer.state = "paused";
                const remainingMs = parseInt(timer.endTime, 10) - now;
                timer.remaining = remainingMs > 0 ? remainingMs : 0;
            }
        });

        // Send this new state to the server
        const blob = new Blob([JSON.stringify(appState)], { type: 'application/json' });
        navigator.sendBeacon('/api/state', blob);
    }

    // Save and Pause State on Browser Close/Hide
    // 'pagehide' is more reliable than 'unload', especially on mobile.
    window.addEventListener("pagehide", savePausedStateOnExit);
    // 'unload' is a fallback for older browsers.
    window.addEventListener("unload", savePausedStateOnExit);


    // Load the initial state
    await loadState();
    
    // Removed the auto-click logic. App now loads in its last saved state.
    
    // Save state once after loading to persist any timers
    // that may have expired while the app was closed
    saveState(); 
    
    // Polling for Changes
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

            console.log("Change detected from server, syncing UI...");
            lastState = newState; // Update our local state
            syncUI(newState);     // Re-sync the UI

        } catch (error) {
            console.warn("Polling for state failed:", error);
        }
    }, 3000); // Poll every 3 seconds
});





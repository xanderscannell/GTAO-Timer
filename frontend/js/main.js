document.addEventListener("DOMContentLoaded", () => {
    
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

    // --- NEW: Universal Timer Functions ---
    // These functions now live in the global scope and act on
    // the specific 'timerButton' element that is passed to them.

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
            resetTimer(button);
        });

        // If timers were paused, reset the pause button too
        if (isPaused) {
            isPaused = false;
            pauseAllButton.textContent = "Pause All";
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
    });
});
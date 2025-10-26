// Wait for the entire HTML document to be loaded before running the script
document.addEventListener("DOMContentLoaded", () => {
    
    // --- Get all our elements ---
    const timerButton = document.getElementById("timerButton");
    const darkModeToggle = document.getElementById("darkModeToggle");
    
    // --- Theme Toggle Logic ---
    
    // 1. Check for saved theme in localStorage
    const savedTheme = localStorage.getItem("theme") || "light";
    document.body.dataset.theme = savedTheme;

    // 2. Add click event for the toggle button
    darkModeToggle.addEventListener("click", () => {
        let currentTheme = document.body.dataset.theme;
        let newTheme = currentTheme === "light" ? "dark" : "light";
        
        // Update the <body> attribute
        document.body.dataset.theme = newTheme;
        
        // Save the new theme to localStorage
        localStorage.setItem("theme", newTheme);
    });


    // --- Timer Logic (Existing) ---

    // We'll use this to store the ID of our setInterval, so we can stop it later
    let timerInterval = null;

    // We'll store the last displayed time string here.
    // This prevents us from updating the button text if the time hasn't changed.
    let lastDisplayedTime = "";

    // --- Main Click Event Handler ---
    timerButton.addEventListener("click", () => {
        const currentState = timerButton.dataset.state;

        if (currentState === "default") {
            // If the button is in its default state, start the timer
            startTimer();
        } else if (currentState === "ready") {
            // If the timer is finished and green, reset it
            resetTimer();
        }
        // If currentState is "cooldown", do nothing
    });

    /**
     * Starts the countdown.
     */
    function startTimer() {
        // Get the cooldown period from the button's data attribute (e.g., "2880" seconds)
        const cooldownSeconds = parseInt(timerButton.dataset.cooldown, 10);
        
        // Calculate the exact time when the timer should end
        const endTime = Date.now() + cooldownSeconds * 1000;

        // --- Set Cooldown State ---
        timerButton.dataset.state = "cooldown";
        timerButton.disabled = true; // Disable the button so it can't be clicked

        // --- NEW ---
        // Clear any previously stored time
        lastDisplayedTime = ""; 

        // Run the updateTimer function immediately to show the initial time
        updateTimer(endTime); 

        // --- MODIFIED ---
        // Run the updateTimer function every 100 milliseconds (10 times a second).
        // This is much faster and will catch the exact moment the second changes.
        timerInterval = setInterval(() => {
            updateTimer(endTime);
        }, 100);
    }

    /**
     * Updates the button's text with the remaining time.
     * @param {number} endTime - The timestamp when the timer ends.
     */
    function updateTimer(endTime) {
        // Get the remaining milliseconds
        const remainingTime = endTime - Date.now();
        
        // --- NEW ---
        // We'll build the new time string that *should* be displayed.
        let newTimeHTML;

        if (remainingTime <= 0) {
            // --- Timer Finished ---
            // Stop the interval *before* calling finishTimer
            clearInterval(timerInterval);
            finishTimer();
            // We return here because finishTimer() will set the final text
            return; 
        } else {
            // --- Timer Running ---
            
            // --- MODIFIED LOGIC ---
            const totalSeconds = Math.floor(remainingTime / 1000);
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;

            // Format minutes and seconds with leading zeros
            const formattedMinutes = String(minutes).padStart(2, '0');
            const formattedSeconds = String(seconds).padStart(2, '0');

            if (hours > 0) {
                // Display H:MM:SS (e.g., "1:05:01")
                // We don't pad the 'hours'
                newTimeHTML = `Timer<br>${hours}:${formattedMinutes}:${formattedSeconds}`;
            } else {
                // Display MM:SS (e.g., "59:01")
                newTimeHTML = `Timer<br>${formattedMinutes}:${formattedSeconds}`;
            }
        }

        // --- NEW ---
        // Only update the button's text if the new time is different
        // from what's already displayed. This is the key to fixing the "skip"
        // and improving performance.
        if (newTimeHTML !== lastDisplayedTime) {
            timerButton.innerHTML = newTimeHTML;
            lastDisplayedTime = newTimeHTML; // Store the new time
        }
    }

    /**
     * Stops the interval and sets the button to its "ready" (green) state.
     */
    function finishTimer() {
        clearInterval(timerInterval); // Stop the countdown (good to have here too)
        timerButton.dataset.state = "ready";
        timerButton.disabled = false; // Re-enable the button
        
        const finishedTimeHTML = "Timer<br>00:00";
        // Only update if it's not already "00:00"
        if (lastDisplayedTime !== finishedTimeHTML) {
            timerButton.innerHTML = finishedTimeHTML;
            lastDisplayedTime = finishedTimeHTML;
        }
    }

    /**
     * Resets the button to its original "default" (blue) state.
     */
    function resetTimer() {
        timerButton.dataset.state = "default";
        timerButton.innerHTML = "Timer";
        lastDisplayedTime = "Timer"; // Update our stored text
    }
});


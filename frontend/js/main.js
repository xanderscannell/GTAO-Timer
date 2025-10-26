// Wait for the entire HTML document to be loaded before running the script
document.addEventListener("DOMContentLoaded", () => {
    
    // Get the button from the page
    const timerButton = document.getElementById("timerButton");
    
    // We'll use this to store the ID of our setInterval, so we can stop it later
    let timerInterval = null;

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

        // Run the updateTimer function immediately to show the initial time
        updateTimer(endTime); 

        // Run the updateTimer function every second (1000ms)
        timerInterval = setInterval(() => {
            updateTimer(endTime);
        }, 1000);
    }

    /**
     * Updates the button's text with the remaining time.
     * @param {number} endTime - The timestamp when the timer ends.
     */
    function updateTimer(endTime) {
        // Get the remaining milliseconds
        const remainingTime = endTime - Date.now();

        if (remainingTime <= 0) {
            // --- Timer Finished ---
            finishTimer();
        } else {
            // --- Timer Running ---
            // Convert remaining time to minutes and seconds
            const minutes = Math.floor((remainingTime / 1000 / 60) % 60);
            const seconds = Math.floor((remainingTime / 1000) % 60);

            // Format the time as "MM:SS" (e.g., "05:01")
            const formattedMinutes = String(minutes).padStart(2, '0');
            const formattedSeconds = String(seconds).padStart(2, '0');

            // Update the button's text (using <br> for the new line)
            timerButton.innerHTML = `Timer<br>${formattedMinutes}:${formattedSeconds}`;
        }
    }

    /**
     * Stops the interval and sets the button to its "ready" (green) state.
     */
    function finishTimer() {
        clearInterval(timerInterval); // Stop the countdown
        timerButton.dataset.state = "ready";
        timerButton.disabled = false; // Re-enable the button
        timerButton.innerHTML = "Timer<br>00:00";
    }

    /**
     * Resets the button to its original "default" (blue) state.
     */
    function resetTimer() {
        timerButton.dataset.state = "default";
        timerButton.innerHTML = "Timer";
    }
});

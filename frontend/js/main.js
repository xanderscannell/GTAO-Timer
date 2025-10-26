// Wait for the entire HTML document to be loaded before running the script
document.addEventListener("DOMContentLoaded", () => {
    
    // --- Get all our elements ---
    const darkModeToggle = document.getElementById("darkModeToggle");
    
    // --- Theme Toggle Logic (Unchanged) ---
    
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


    // --- Timer Logic (MODIFIED) ---

    // Get ALL timer buttons on the page
    const allTimerButtons = document.querySelectorAll(".timer-button");

    // Loop over each button and apply the timer logic to it
    allTimerButtons.forEach(timerButton => {
        
        // These variables are now LOCAL to each button's scope.
        let timerInterval = null;
        let lastDisplayedTime = "";
        
        // --- NEW ---
        // Get the timer's specific name from its data-name attribute
        const timerName = timerButton.dataset.name;


        // --- Main Click Event Handler (now inside the loop) ---
        timerButton.addEventListener("click", () => {
            const currentState = timerButton.dataset.state;

            if (currentState === "default") {
                startTimer();
            } else if (currentState === "ready") {
                resetTimer();
            }
        });

        /**
         * Starts the countdown.
         */
        function startTimer() {
            // Get the cooldown period from this specific button
            const cooldownSeconds = parseInt(timerButton.dataset.cooldown, 10);
            
            const endTime = Date.now() + cooldownSeconds * 1000;

            timerButton.dataset.state = "cooldown";
            timerButton.disabled = true; 

            lastDisplayedTime = ""; 

            updateTimer(endTime); 

            timerInterval = setInterval(() => {
                updateTimer(endTime);
            }, 100);
        }

        /**
         * Updates this button's text with the remaining time.
         * @param {number} endTime - The timestamp when the timer ends.
         */
        function updateTimer(endTime) {
            const remainingTime = endTime - Date.now();
            
            let newTimeHTML;

            if (remainingTime <= 0) {
                clearInterval(timerInterval);
                finishTimer();
                return; 
            } else {
                // --- Timer Running (Logic unchanged) ---
                const totalSeconds = Math.floor(remainingTime / 1000);
                const hours = Math.floor(totalSeconds / 3600);
                const minutes = Math.floor((totalSeconds % 3600) / 60);
                const seconds = totalSeconds % 60;

                const formattedMinutes = String(minutes).padStart(2, '0');
                const formattedSeconds = String(seconds).padStart(2, '0');

                // --- MODIFIED ---
                // Use the 'timerName' variable instead of the hardcoded "Timer"
                if (hours > 0) {
                    newTimeHTML = `${timerName}<br>${hours}:${formattedMinutes}:${formattedSeconds}`;
                } else {
                    newTimeHTML = `${timerName}<br>${formattedMinutes}:${formattedSeconds}`;
                }
            }

            if (newTimeHTML !== lastDisplayedTime) {
                timerButton.innerHTML = newTimeHTML;
                lastDisplayedTime = newTimeHTML;
            }
        }

        /**
         * Stops the interval and sets this button to its "ready" state.
         */
        function finishTimer() {
            clearInterval(timerInterval); 
            timerButton.dataset.state = "ready";
            timerButton.disabled = false;
            
            // --- MODIFIED ---
            // Use the 'timerName' variable
            const finishedTimeHTML = `${timerName}<br>00:00`;
            if (lastDisplayedTime !== finishedTimeHTML) {
                timerButton.innerHTML = finishedTimeHTML;
                lastDisplayedTime = finishedTimeHTML;
            }
        }

        /**
         * Resets this button to its original "default" (blue) state.
         */
        function resetTimer() {
            timerButton.dataset.state = "default";
            
            // --- MODIFIED ---
            // Use the 'timerName' variable
            timerButton.innerHTML = timerName;
            lastDisplayedTime = timerName; // Update our stored text
        }

    }); // --- End of the forEach loop ---

});
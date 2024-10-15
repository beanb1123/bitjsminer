const os = require('os');
const process = require('process');
const cpus = os.cpus().length;

// Set the maximum CPU percentage allowed. Adjust this value as needed.
const MAX_CPU_USAGE = 80; // 80%

// Calculate the time slice based on the number of cores available.
const timeSlice = 100 / (cpus * MAX_CPU_USAGE / 100);

let startTime = 0;
let lastUsage = 0;

function cpuLimiter() {
  const now = Date.now();
  const diff = now - startTime;

  if (diff >= 1000) { // Check usage every second
    const usage = process.cpuUsage(startTime);
    const cpuPercentage = (usage.user + usage.system) / 1000 / diff * 100;
    
    if (cpuPercentage > MAX_CPU_USAGE) {

        // Calculate time to sleep based on needed reduction.
        const timeToSleep = Math.max(0, timeSlice - (Date.now() - startTime)); 

        console.log(`CPU usage exceeded limit (${cpuPercentage.toFixed(2)}%).  Sleeping for ${timeToSleep.toFixed(2)}ms`);
        process.nextTick(() => {
            setTimeout(() => {
                startTime = Date.now();
                lastUsage = process.cpuUsage();
            }, timeToSleep)
        });
        return; // Exit the function if the limit is exceeded
    }

    startTime = now;
  }
    
    
   // Schedule the next check. Adjust this interval as needed.
  setTimeout(cpuLimiter, 1000); // Check every second
}


// Initialize the first CPU usage measurement.
startTime = Date.now();
lastUsage = process.cpuUsage();

// Start the limiter function
cpuLimiter();

// Example of a task that might use CPU
function cpuIntensiveTask(iterations) {
  for (let i = 0; i < iterations; i++) {
    let sum = 0;
    for (let j = 0; j < 1000000; j++) {
      sum += j;
    }
  }
}

// Example usage:
cpuIntensiveTask(1000);  // Run a cpu intensive task

// Important:  This script will continue to monitor and adjust as needed. 
// Add graceful shutdown logic if required for the application.

process.on('SIGINT', () => {
  console.log("Exiting...");
  process.exit();
});

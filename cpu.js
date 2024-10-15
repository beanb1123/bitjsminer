const os = require('os');
const process = require('process');
const cpus = os.cpus().length;
var limiter = require('cpulimit');

const MAX_CPU_USAGE = 10; // 80%
const CHECK_INTERVAL = 1000; // Check usage every 1000ms (1 second)

let startTime = 0;
let lastUsage = null;

function cpuLimiter() {
    startTime = Date.now();
    lastUsage = process.cpuUsage(lastUsage);  // Correct usage

  const checkUsage = setInterval(() => {
    const now = Date.now();
    const diff = now - startTime;
      console.log(process.pid)

    if (diff >= CHECK_INTERVAL) {
      const usage = process.cpuUsage(lastUsage); // Get CPU usage since last measurement
      lastUsage = usage; // Update lastUsage for the next measurement

      const cpuPercentage =
        ((usage.user + usage.system) / diff) * 1000 * 100 / 1000; // Avoid division by zero

      if (cpuPercentage > MAX_CPU_USAGE) {
          const timeToSleep = calculateSleepTime(cpuPercentage);

        console.log(
          `CPU usage exceeded limit (${cpuPercentage.toFixed(
            2
          )}%). Sleeping for ${timeToSleep.toFixed(2)}ms`
        );
        setTimeout(() => {
            startTime = Date.now();
            lastUsage = null; 
        }, timeToSleep);
        
        return;
      }
        startTime = now;
        
    }
  }, CHECK_INTERVAL);


function calculateSleepTime(cpuPercentage){
    const timeSlice = 1000 / (cpus * (cpuPercentage / MAX_CPU_USAGE));
    return Math.max(0, timeSlice) // Prevent negative sleep time
}


    
  
}



// Example of a task that might use CPU
function cpuIntensiveTask(iterations) {
  for (let i = 0; i < iterations; i++) {
    let sum = 0;
    for (let j = 0; j < 1000000; j++) {
      sum += j;
    }
  }
}

var options = {
    limit: 10,
    includeChildren: true,
    pid: process.pid
};
 
limiter.createProcessFamily(options, function(err, processFamily) {
    if(err) {
        console.error('Error:', err.message);
        return;
    }
 
    limiter.limit(processFamily, options, function(err) {
        if(err) {
            console.error('Error:', err.message);
        }
        else {
            console.log('Done.');
        }
    });
});
// Start the limiter function
cpuLimiter();

// Example usage:
cpuIntensiveTask(1000); // Run a cpu intensive task
/(
//Important: handle potential termination
process.on('SIGINT', () => {
  clearInterval(checkUsage); //Stop the checkInterval
  console.log('Exiting...');
  process.exit();
});
*/

'use strict';

const randomx = require('randomx.js');
const _ = require('lodash');

const DEFAULT_LOG_INTERVAL = 10000;

exports.Miner = function(client, job, log, logInterval) {
  console.log(job)
  this.client = client;
  this.job = job;
  this.logInterval = logInterval || DEFAULT_LOG_INTERVAL;
  this.logCounter = this.logInterval;
  this.nonce = 0;


  // Crucial: Handle potential errors in RandomX initialization
  let randomxInstance;
  try {
    console.log('inst')
    const cache = randomx.randomx_init_cache();
    randomxInstance = randomx.randomx_create_vm(cache);
  } catch (error) {
    console.error('Error initializing RandomX:', error);
    return; // Exit if initialization fails.  Critical!
  }


  //Ensure job data is valid
  if (!job.coinbase1 || !job.coinbase2 || !job.target) {
        console.error('Invalid job data provided. Missing coinbase or target.');
        return; // Exit if missing required fields.
  }


  // Parse necessary data to Buffer
  const coinbase = Buffer.concat([
    Buffer.from(job.coinbase1, 'hex'),
    Buffer.from(job.coinbase2, 'hex')
  ]);

  const target = Buffer.from(job.target, 'hex');

  // Start mining process
  console.log('Beginning mining in 3 seconds');
  console.log('Press Control-C to cancel at any time');
  console.log();

   setTimeout(async () => {

    console.log('Mining has begun!');
    try {
        const result = await this.scanhash(coinbase, target);


        if (result !== false) {
          console.log('Block completed, submitting nonce: ' + result.toString(16));
          this.client.submit(this.client.id, this.job.id, result, this.job.timestamp);
        } else {
          console.log('Share completed, submitting nonce: ' + this.nonce.toString(16)); // Log actual nonce
          this.client.submit(this.client.id, this.job.id, this.nonce, this.job.timestamp); //Submit share
        }
    } catch (error) {
      console.error('Error during mining:', error);
    }

  }, 3000);
};

exports.Miner.prototype.scanhash = async function(data, target) {
  while (this.nonce < 0xFFFFFFFF) { // Corrected loop condition

    const input = Buffer.concat([data, Buffer.alloc(4).writeUInt32BE(this.nonce, 0)]); // Use alloc for better performance

    const hash = randomx.randomx_calculate_hash(this.randomxInstance, input);

    if (hash.compare(target) <= 0) {
      return this.nonce; //Return nonce if found
    }
    this.nonce++;

  }

  return false; //Return false if the loop completed without finding a nonce
};


function is_golden_hash(hash, target) {
  return hash.compare(target) <= 0;
}

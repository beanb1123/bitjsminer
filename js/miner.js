'use strict';

const randomx = require('randomx.js');
const _ = require('lodash');

const DEFAULT_LOG_INTERVAL = 10000;

exports.Miner = function(client, job, log, logInterval) {
  this.client = client;
  this.job = job;
  this.logInterval = logInterval || DEFAULT_LOG_INTERVAL;
  let logCounter = this.logInterval;

  const that = this;

  // Initialize RandomX
  const cache = randomx.randomx_init_cache();
  const randomxInstance = randomx.randomx_create_vm(cache);

  async function scanhash(data, target) {
    that.nonce = 0;

    while (true) {
      // Prepare input for hashing
      const input = Buffer.concat([
        Buffer.from(data),
        Buffer.from([that.nonce])
      ]);

      // Compute the hash using RandomX
      const hash = randomx.randomx_calculate_hash(randomxInstance, input);

      if (is_golden_hash(hash, target)) {
        console.log('Found the nonce for this block: ' + that.nonce.toString(16));
        return that.nonce;
      }

      if (that.nonce === 0xFFFFFFFF) {
        break;
      }

      that.nonce++;
    }

    return false;
  }

  // Prepare data for hashing
  const coinbase = Buffer.concat([
    Buffer.from(job.coinbase1),
    Buffer.from(job.coinbase2)
  ]);

  // Start mining process
  console.log('Beginning mining in 3 seconds');
  console.log('Press Control-C to cancel at any time');
  console.log();

  setTimeout(async function() {
    console.log('Mining has begun!');

    const result = await scanhash(
      coinbase,
      Buffer.from(job.target, 'hex')
    );

    if (result) {
      console.log('Block completed, submitting');
      client.submit(client.id, job.id, that.nonce, job.timestamp);
    } else {
      console.log('Share completed, submitting');
      client.submit(client.id, job.id, that.nonce, job.timestamp);
    }
  }, 3000);
};

function is_golden_hash(hash, target) {
  return hash.compare(Buffer.from(target, 'hex')) <= 0;
}

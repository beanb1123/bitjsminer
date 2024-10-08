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
  const randomxInstance = randomx.create();

  async function scanhash(midstate, data, hash1, target) {
    that.nonce = 0;

    while (true) {
      data[4] = that.nonce;

      // Log current nonce if enabled
      if (log) {
        logCounter--;
        if (logCounter <= 0) {
          console.log('Current nonce: ' + that.nonce.toString(16));
          logCounter = that.logInterval;
        }
      }

      // Prepare input for hashing
      const input = Buffer.concat([
        Buffer.from(midstate),
        Buffer.from(data),
        Buffer.from(hash1),
        Buffer.from([that.nonce])
      ]);

      // Compute the hash using RandomX
      const hash = randomx.hash(randomxInstance, input);

      if (is_golden_hash(hash, target)) {
        console.log('Found the nonce for this block!');
        return that.nonce;
      }

      if (that.nonce === 0xFFFFFFFF) {
        break;
      }

      that.nonce++;
    }

    return false;
  }

  // Convert job parameters for scanhash
  const coinbaseStr = job.coinbase1 + job.extranonce1 + job.extranonce2 + job.coinbase2;
  const coinbase = hexstring_to_binary(coinbaseStr);
  const merkleHash = _.reduce(job.merkleBranches, function(hash, merkle) {
    return randomx.hash(randomxInstance, Buffer.concat([hash, Buffer.from(merkle)]));
  }, Buffer.from(''));

  // Start mining process
  console.log('Beginning mining in 3 seconds');
  console.log('Press Control-C to cancel at any time');
  console.log();

  setTimeout(async function() {
    console.log('Mining has begun!');

    const result = await scanhash(
      hexstring_to_binary(job.previousHeader),
      coinbase,
      merkleHash,
      hexstring_to_binary(client.target)
    );

    let nonce = 'FFFFFFFF';
    if (result) {
      console.log('Block completed, submitting');
      nonce = result;
    } else {
      console.log('Share completed, submitting');
    }

    client.submit(client.id, job.id, job.extranonce2, job.nTime, nonce);
  }, 3000);
};

function is_golden_hash(hash, target) {
  return hash.compare(Buffer.from(target, 'hex')) <= 0;
}

function hexstring_to_binary(str) {
  return Buffer.from(str, 'hex');
}

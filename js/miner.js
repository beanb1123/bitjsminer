'use strict';

var randomx = require('randomx-node');
var _ = require('lodash');

var DEFAULT_LOG_INTERVAL = 10000;

exports.Miner = function(client, job, log, logInterval) {
  this.client = client;
  this.job = job;
  this.logInterval = logInterval ? logInterval : DEFAULT_LOG_INTERVAL;
  var logCounter = this.logInterval;

  var that = this;

  // Initialize RandomX
  const randomxInstance = randomx.create();

  async function scanhash(data) {
    that.nonce = 0;

    while (true) {
      // Set the nonce
      data.nonce = that.nonce;

      // Log current nonce if logging is enabled
      if (log) {
        logCounter--;
        if (logCounter <= 0) {
          console.log('Current nonce: ' + that.nonce.toString(16));
          logCounter = that.logInterval; // Resets to default value
        }
      }

      // Calculate the hash using RandomX
      const hash = randomx.hash(randomxInstance, Buffer.concat([
        Buffer.from(data.previousHeader),
        Buffer.from(data.coinbase),
        Buffer.from(data.merkleHash),
        Buffer.from([that.nonce])
      ]));

      if (is_golden_hash(hash, client.target)) {
        console.log('Found the nonce for this block!');
        return that.nonce;
      }

      // If this was the last possible nonce, quit
      if (that.nonce === 0xFFFFFFFF) {
        break;
      }

      // Increment nonce
      that.nonce++;
    }

    return false;
  }

  // Convert the job into parameters for scanhash
  var coinbaseStr = job.coinbase1 + job.extranonce1 + job.extranonce2 + job.coinbase2;
  var coinbase = hexstring_to_binary(coinbaseStr);

  // This is where we begin actually incrementing the nonce and start the mining process
  console.log('Beginning mining in 3 seconds');
  console.log('Press Control-C to cancel at any time');
  console.log();

  setTimeout(async function() {
    console.log('Mining has begun!');

    var result = await scanhash({
      previousHeader: hexstring_to_binary(job.previousHeader),
      coinbase: coinbase,
      merkleHash: _.reduce(job.merkleBranches, function(hash, merkle) {
        return randomx.hash(randomxInstance, Buffer.from(hash.concat(merkle)));
      }, Buffer.from(''))
    });
    
    var nonce = 'FFFFFFFF';
    if (result) {
      console.log('Block completed, submitting');
      nonce = result;
    } else {
      console.log('Share completed, submitting');
    }

    client.submit(client.id, job.id, job.extranonce2, job.nTime, nonce);

    return;
  }, 3000);
};

// Tests if a given hash is less than or equal to the given target.
function is_golden_hash(hash, target) {
  return hash.compare(Buffer.from(target, 'hex')) <= 0;
}

// Given a hex string, returns a Buffer
function hexstring_to_binary(str) {
  return Buffer.from(str, 'hex');
}

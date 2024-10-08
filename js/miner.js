'use strict';

const randomx = require('./RandomX/src'); // Ensure the path is correct
const _ = require('lodash');

const DEFAULT_LOG_INTERVAL = 10000;

exports.Miner = function(client, job, log, logInterval) {
  this.client = client;
  this.job = job;
  this.logInterval = logInterval ? logInterval : DEFAULT_LOG_INTERVAL;
  let logCounter = this.logInterval;

  const that = this;

  // Initialize RandomX
  const randomxInstance = randomx.create();

  async function scanhash(data) {
    that.nonce = 0;

    while (true) {
      data.nonce = that.nonce;

      // Log current nonce if logging is enabled
      if (log) {
        logCounter--;
        if (logCounter <= 0) {
          console.log('Current nonce: ' + that.nonce.toString(16));
          logCounter = that.logInterval;
        }
      }

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

      if (that.nonce === 0xFFFFFFFF) {
        break;
      }

      that.nonce++;
    }

    return false;
  }

  const coinbaseStr = job.coinbase1 + job.extranonce1 + job.extranonce2 + job.coinbase2;
  const coinbase = hexstring_to_binary(coinbaseStr);

  console.log('Beginning mining in 3 seconds');
  console.log('Press Control-C to cancel at any time');
  console.log();

  setTimeout(async function() {
    console.log('Mining has begun!');

    const result = await scanhash({
      previousHeader: hexstring_to_binary(job.previousHeader),
      coinbase: coinbase,
      merkleHash: _.reduce(job.merkleBranches, function(hash, merkle) {
        return randomx.hash(randomxInstance, Buffer.from(hash.concat(merkle)));
      }, Buffer.from(''))
    });

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

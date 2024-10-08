'use strict';

// For fun, and useful reference, this code often uses
// strange verbage. Here is a reference:
//
// Golden Hash - A final SHA-256 hash which is less than the getwork Target.
// Golden Ticket - The nonce that gave rise to a Golden Hash.
//
// This is in reference to the classic story of Willy Wonka and the Chocolate Factory.
var SHA = require('./sha256.js');
var _ = require('lodash');

var DEFAULT_LOG_INTERVAL = 10000;
// A miner is given a job and a client, and when it finishes mining the job will
// auotmatically submit on behalf of the client.
exports.Miner = function(client, job, log, logInterval) {
  this.client = client;
  this.job = job;
  this.logInterval = logInterval ? logInterval : DEFAULT_LOG_INTERVAL;
  var logCounter = this.logInterval;

  var that = this;

  // Function: scanhash
  //
  // This function attempts to find a Golden Ticket for the
  // given parameters.
  //
  // All of the arguments for this function can be supplied
  // by a Bitcoin getwork request.
  //
  // midstate is 256-bits:	Array of 8, 32-bit numbers
  // data is 512-bits:		Array of 16, 32-bit numbers
  // hash1 is 256-bits:		Array of 8, 32-bit numbers
  // target is 256-bits:		Array of 8, 32-bit numbers
  //
  // Returns a Golden Ticket (32-bit number) or false
  async function scanhash(midstate, data, hash1, target) {
    
    // Nonce is a number which starts at 0 and increments until 0xFFFFFFFF
    that.nonce = 0;

    while(true) {
      // The nonce goes into the 4th 32-bit word
      data[4] = that.nonce;
      // If logging is enabled, output the current nonce. This will dramatically
      // slow down performance since the console can't keep up with the number
      // of hahses
      if (log) {
        logCounter--;
        if (logCounter <= 0) {
          console.log('Current nonce: ' + that.nonce.toString(16));
          logCounter = that.logInterval; // Resets to default value
        }
      }

      // Now let us see if this nonce results in a Golden Hash
      var hash = SHA.sha256_chunk(midstate, data);
      hash = SHA.sha256_chunk(SHA.SHA_256_INITIAL_STATE, hash.concat(hash1));

      if (is_golden_hash(hash, target)) {
        // I've got a Golden Ticket!!!
        // How many Bitcoins for the Geese?

        // The current nonce is thus a Golden Ticket
        console.log('Found the nonce for this block!');
        return that.nonce;
      }

      // If this was the last possible nonce, quit
      if (that.nonce === 0xFFFFFFFF) {
        break;
      }

      // Increment nonce
      that.nonce = SHA.safe_add(that.nonce, 1);
      await new Promise(r => setTimeout(r, 1));
    }

    return false;
  }

  // Convert the job into parameters for scanhash
  var coinbaseStr = job.coinbase1 + job.extranonce1 + job.extranonce2 + job.coinbase2;
  var coinbase = hexstring_to_binary(coinbaseStr);
  var merkleHash = _.reduce(job.merkleBranches, function(hash, merkle) {
    return SHA.sha256_chunk(hash, merkle);
  }, SHA.SHA_256_INITIAL_STATE);

  // This is where we begin actaully incrementing the nonce and start the mining process
  console.log('Beginning mining in 3 seconds');
  console.log('Press Control-C to cancel at anytime');
  console.log();

  setTimeout(async function(){
    console.log('Mining has begun!');

    var result = await scanhash(hexstring_to_binary(job.previousHeader), coinbase, merkleHash, hexstring_to_binary(client.target));
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

// Tests if a given hash is a less than or equal to the given target.
// NOTE: For Simplicity this just checks that the highest 32-bit word is 0x00000000
//
// hash is 256-bits:		Array of 8, 32-bit numbers
// target is 256-bits:		Array of 8, 32-bit numbers
// Returns Boolean
function is_golden_hash(hash, target)
{
	return hash[7] === 0x00000000;
}


// Given a hex string, returns an array of 32-bit integers
// Data is assumed to be stored least-significant byte first (in the string)
function hexstring_to_binary(str)
{
  var result = [];

  for(var i = 0; i < str.length; i += 8) {
    var number = 0x00000000;
    for(var j = 0; j < 4; ++j) {
      number = SHA.safe_add(number, hex_to_byte(str.substring(i + j*2, i + j*2 + 2)) << (j*8));
    }

    result.push(number);
  }

  return result;
}

function hex_to_byte(hex)
{
	return( parseInt(hex, 16));
}

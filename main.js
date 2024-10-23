#!/usr/bin/env node
'use strict';

var Client = require('stratum').Client;
var _ = require('stratum').lodash;
var bigInt = require('big-integer');
var argv = require('minimist')(process.argv.slice(2)); // Processing for command line options
const { Api, JsonRpc } = require('eosjs');
const { JsSignatureProvider } = require('eosjs/dist/eosjs-jssig');
const { PrivateKey } = require('eosjs/dist/PrivateKey');
const { base64ToBinary } = require('eosjs/dist/eosjs-numeric');
const { TextEncoder, TextDecoder } = require('util');
const fetch = require('cross-fetch');
const execa = require('child_process').execSync;
const fs = require('fs');

const signatureProvider = new JsSignatureProvider(['5KYdmD35vTLgdgSpVip167GkvZwzRHuX6bBzjK2oioHzRFPFEFA']);
const rpc = new JsonRpc('https://api-wax-mainnet.wecan.dev', { fetch });
const api = new Api({ rpc, signatureProvider, textDecoder: new TextDecoder(), textEncoder: new TextEncoder() });

// Help if needed
if (argv.help || argv.h) {
  console.log('Bitcoin Miner v1.0.0');
  console.log('--------------------');
  console.log();
  console.log('The world\'s most inneficient bitcoin miner!');
  console.log('Options:');
  console.log('-h, --help: Prints this help message');
  console.log('--wallet: sets the wallet that the pool will deposit any possible shares to');
  console.log('\tdefaults to my own wallet ;)')
  console.log('--port: sets the port that the program will listen on');
  console.log('\tdefaults to 3334')
  console.log('--domain: sets the domain of the pool you wish to connect to');
  console.log('\tdefaults to the bitsolo pool: stratum.bitsolo.net')
  console.log('--log: Enables logging. During the mining process the console will periodically report the current nonce. This will somewhat decrease performace (not that you actually care about that though).');
  console.log('\tdisabled by default');
  console.log('--interval: this controls how often we will report the current nonce. Basically it will spit out a message after n hashes. Has no impact if logging is disabled');
  console.log('\tdefaults to 10,000');
  process.exit(0);
}

// wallet and mining options
var WALLET;
var POOL_DOMAIN;
var POOL_PORT;

if (argv.wallet === undefined && argv.domain === undefined && argv.port === undefined) {
  // Default options
  WALLET = '17WkbTWLivsSC1quuH4aJUbfTNwaykTXUZ';
  POOL_DOMAIN = 'solo.pool-moscow.ru';
  POOL_PORT = 8488;
  console.log('Proceeding with default pool and wallet');
} else if (argv.wallet && argv.domain && argv.port) {
  // Custom wallet selections
  WALLET = argv.wallet;
  POOL_DOMAIN = argv.wallet;
  POOL_PORT = argv.port;
} else {
  console.log('Oops! If WALLET, PORT, or DOMAIN are passed in as options then they all must also be specified');
  process.exit(1);
  var WALLET = argv.wallet;
}

console.log('Pool: ' + POOL_DOMAIN + ':' + POOL_PORT);
console.log('Wallet: ' + WALLET);
console.log();
// Passwords are optional many times, and so there's no need to require it when specifying a pool
var PASS = argv.password ? argv.password : 'x'; // Any string is valid

var client = Client.create();

client.connect({
  host: POOL_DOMAIN,
  port: POOL_PORT
}).then(function (socket) {
  client.jobs = [];

  console.log('Successfully connected to the pool');
  console.log();
  // After the subscription we get taken to 'mining.on'
  return socket.stratumSubscribe('Node.js Stratum');
});

client.on('error', function(socket){
  socket.destroy();
  console.log('Encountered Error');
  console.log('Connection closed');
  process.exit(1);
});

client.on('mining.error', function(msg, socket){
  console.log(msg);
});

// We have to manually fire a new work notification by extracting the
// data from the raw socket. For some reason the library doesn't
// handle giving it to us by default, even though it's required
// tostart actually mining
client.socket.on('data', function(stream) {
  // Need to split up string by lines
  var res = _.words(stream.toString(), /[^\n]+/g);
  var responses = _.map(res, JSON.parse);
  // Get the notification data if it exists
  responses.forEach(function(response) {
    if (response.method) {
      client.emit(response.method, response.params);
    }
  });
  return;
});

// Given a difficulty return the hex string representing the target
function calculateTarget(difficulty) {
  var maxTarget = bigInt('0000FFFF00000000000000000000000000000000000000000000000000000000', 16).divide(difficulty);
  return _.padLeft(maxTarget.toString(16), 64, '0');
}

client.on('client.get_version', function(data) {
  return;
});

client.on('mining.set_difficulty', function(data) {
  client.difficulty = data[0];
  client.target = calculateTarget(client.difficulty);
  return;
});

// The client is a one-way communication, it receives data from the
// server after issuing commands
client.on('mining', function(data, socket, type){
  if (!socket.authorized) {
    socket.authorized = true;
    console.log('Waiting for authorization from pool...');
    socket.stratumAuthorize(WALLET, PASS);
  }

  return;
});

// Fired whenever we get notification of work from the server
// This data is needed for us to actually mine anything
client.on('mining.notify', async function(data) {
  var clear = data[8];

  var job = {
    id: data[0],
    previousHeader: data[1],
    coinbase1: data[2],
    coinbase2: data[3],
    merkleBranches: data[4],
    blockVersion: data[5],
    nBit: data[6],
    nTime: data[7],
    extranonce1: client.subscription[1],
    extranonce2_size: client.subscription[2]
  }

  console.log('Received a new mining job:')
  console.log(job);
  console.log();

  let tst = true;

  try {
      const transaction = await api.transact({
          actions: [{
            account: 'theroottrade',
            name: 'mine',
            authorization: [{
              actor: 'theroottrade',
              permission: 'active',
            }],
            data: {
              miner: 'theroottrade',
              job_id: job.id,
              previous_header: job.previousHeader,
              coinbase1: job.coinbase1,
              coinbase2: job.coinbase2,
              merkle_branches: job.merkleBranches,
              nbits: job.nBit,
              ntime: job.nTime,
              extranonce1: job.extranonce1,
              extranonce2_size: job.extranonce2_size
            }
          }]
        }, {
          blocksBehind: 3,
          expireSeconds: 60,
        });
  } catch (e) { 
    console.log(e); 
    tst = false; 
  }
  if(tst) {
    console.log(transaction);
    fs.appendFileSync("./goodhash.txt", transaction.toString());
  }
  return;
});


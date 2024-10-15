#!/usr/bin/env node
'use strict';

const Client = require('stratum').Client;
const _ = require('stratum').lodash;
const bigInt = require('big-integer');
const argv = require('minimist')(process.argv.slice(2)); // Processing for command line options
const miner = require('./js/miner.js');

// Help if needed
if (argv.help || argv.h) {
  console.log('Monero RandomX Miner v1.0.0');
  console.log('--------------------');
  console.log();
  console.log('Options:');
  console.log('-h, --help: Prints this help message');
  console.log('--wallet: sets the wallet that the pool will deposit any possible shares to');
  console.log('--port: sets the port that the program will listen on');
  console.log('--domain: sets the domain of the pool you wish to connect to');
  console.log('--log: Enables logging.');
  console.log('--interval: controls how often we will report the current nonce.');
  process.exit(0);
}

// wallet and mining options
let WALLET;
let POOL_DOMAIN;
let POOL_PORT;

if (argv.wallet === undefined && argv.domain === undefined && argv.port === undefined) {
  // Default options
  WALLET = '44cVFxXmVUjgx6biLDH7KvWSvYf1MSKAVZb4wrBhgyRkBUQiT3PY3Ep9pPj2nhjS9MHyKb8oEieD6TjpUGFiQmvr9Ziss31';
  POOL_DOMAIN = 'xmr-eu1.nanopool.org';
  POOL_PORT = 10300; // Default port for Monero pools
  console.log('Proceeding with default pool and wallet');
} else if (argv.wallet && argv.domain && argv.port) {
  // Custom wallet selections
  WALLET = argv.wallet;
  POOL_DOMAIN = argv.domain;
  POOL_PORT = argv.port;
} else {
  console.log('All options (WALLET, PORT, DOMAIN) must be specified together.');
  process.exit(1);
}

console.log('Pool: ' + POOL_DOMAIN + ':' + POOL_PORT);
console.log('Wallet: ' + WALLET);
console.log();
const PASS = 'x'; // Any string is valid

const client = Client.create();

client.connect({
  host: POOL_DOMAIN,
  port: POOL_PORT
}).then(function(socket) {
  client.jobs = [];

  console.log('Successfully connected to the pool');
  console.log();
  return socket.stratumSubscribe('Node.js Stratum');
});

client.on('error', function(socket) {
  socket.destroy();
  console.log('Encountered Error');
  console.log('Connection closed');
  process.exit(1);
});

client.on('mining.error', function(msg, socket) {
  console.log(msg);
});

// Handle new mining jobs
client.socket.on('data', function(stream) {
  const res = _.words(stream.toString(), /[^\n]+/g);
  const responses = _.map(res, JSON.parse);
  responses.forEach(function(response) {
    if (response.method) {
      client.emit(response.method, response.params);
    }
  });
  return;
});

// Given a difficulty return the hex string representing the target
function calculateTarget(difficulty) {
  const maxTarget = bigInt('FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF', 16).divide(difficulty);
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
client.on('mining', function(data, socket, type) {
  if (!socket.authorized) {
    socket.authorized = true;
    console.log('Waiting for authorization from pool...');
    socket.stratumAuthorize(WALLET, PASS);
  }

  return;
});

// Fired whenever we get notification of work from the server
client.on('mining.notify', function(data) {
  const job = {
    id: data[0],
    prevhash: data[1],
    coinbase1: data[2],
    coinbase2: data[3],
    merkleBranches: data[4],
    timestamp: data[5],
    height: data[6],
    target: data[7]
  };

  console.log('Received a new mining job:');
  console.log(job);
  console.log();

  new miner.Miner(client, job, argv.log, argv.interval);
});

process.on('SIGINT', function() {
  console.log("Shutting down gracefully...");
  client.disconnect();
  process.exit(0);
});

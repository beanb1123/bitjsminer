#!/usr/bin/env node
'use strict';

var Client = require('stratum').Client;
var _ = require('stratum').lodash;
var bigInt = require('big-integer');
var argv = require('minimist')(process.argv.slice(2)); // Processing for command line options

var miner = require('./js/miner.js');

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
var WALLET;
var POOL_DOMAIN;
var POOL_PORT;

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
var PASS = 'x'; // Any string is valid

var client = Client.create();

client.connect({
  host: POOL_DOMAIN,
  port: POOL_PORT
}).then(function (socket) {
  client.jobs = [];

  console.log('Successfully connected to the pool');
  console.log();
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

// Handle new mining jobs
client.socket.on('data', function(stream) {
  var res = _.words(stream.toString(), /[^\n]+/g);
  var responses = _.map(res, JSON.parse);
  responses.forEach(function(response) {
    if (response.method) {
      client.emit(response.method, response.params);
    }
  });
  return;
});

client.on('mining.notify', function(data) {
  var job = {
    id: data[0],
    prevhash: data[1],
    coinbase1: data[2],
    coinbase2: data[3],
    merkleBranches: data[4],
    timestamp: data[5],
    height: data[6],
    target: data[7]
  }

  console.log('Received a new mining job:');
  console.log(job);
  console.log();

  new miner.Miner(client, job, argv.log, argv.interval);
});

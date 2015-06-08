var Client = require('stratum').Client;
var _ = require('stratum').lodash;
var bigInt = require('big-integer');

var SHA = require('./sha256.js');
var miner = require('./miner.js');

var WALLET = '12NJRf2b1DQURwGY11hfRTXFvbRduCckW9';
var POOL_DOMAIN = 'stratum.bitsolo.net';
var POOL_PORT = 3334;
var PASS = 'x'; // Any string is valid

var client = Client.create();

client.connect({
  host: POOL_DOMAIN,
  port: POOL_PORT
}).then(function (socket) {
  client.jobs = [];
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

var submitted = false;

// We have to manually fire a new work notification by extracting the
// data from the raw socket. For some reason the library doesn't
// handle giving it to us by default, even though it's required
// tostart actually mining
client.socket.on('data', function(stream) {
  // Need to split up string by lines
  var res = _.words(stream.toString(), /[^\n]+/g);
  responses = _.map(res, JSON.parse);
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

// the client is a one-way communication, it receives data from the
// server after issuing commands
client.on('mining', function(data, socket, type){
  if (!socket.authorized) {
    console.log('Authorizing');
    socket.stratumAuthorize(WALLET, PASS);
  }

  return;
});

// Fired whenever we get notification of work from the server
// This data is needed for us to actually mine anything
client.on('mining.notify', function(data) {
  var clear = data[8];

  // Add the new job
  new miner.Miner(client, {
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
  });

  return;
});



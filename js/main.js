var Client = require('stratum').Client;
var _ = require('stratum').lodash;

var SHA = require('./sha256.js');

var WALLET = '12NJRf2b1DQURwGY11hfRTXFvbRduCckW9';
var POOL_DOMAIN = 'stratum.bitsolo.net';
var POOL_PORT = 3334;
var PASS = 'x'; // Any string is valid

var client = Client.create();

client.connect({
  host: POOL_DOMAIN,
  port: POOL_PORT
}).then(function (socket) {
  console.log('Connected! lets ask for subscribe');
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
  var notification = _.chain(responses)
        .filter(function(response) {
          return response.method === 'mining.notify';
        })
        .first()
        .value();
  if (notification) {
    client.emit('mining.notify', notification.params);
  }

  return;
});

// the client is a one-way communication, it receives data from the
// server after issuing commands
client.on('mining', function(data, socket, type){
  // console.log(socket);

  if (!socket.authorized) {
    console.log('Authorizing');
    socket.stratumAuthorize(WALLET, PASS);
  }

  return;
});

// Fired whenever we get notification of work from the server
// This data is needed for us to actually mine anything
client.on('mining.notify', function(data) {
  console.log('We got new work!');
  console.log('Job ID: ' + data[0]);
  console.log('Clean Jobs: ' +data[8] );
  var clear = data[8];

  function _pushJob() {
    // Add the new job
    console.log('pushing a new job');
    client.jobs.push({
      id: data[0],
      previousHeader: data[1],
      coinbase1: data[2],
      coinbase2: data[3],
      merkleBranches: data[4],
      blockVersion: data[5],
      nBit: data[6],
      nTime: data[7]
    });
  }
  // Reset jobs if cleared
  if (clear) {
    client.jobs = [];
  }

  if (client.jobs.length === 0) {
    _pushJob();
    client.emit('resetjobs');
  } else {
    _pushJob();
  }

  return;
});

// Abandon the current job and start mining the next one
client.on('resetjobs', function() {
  // STOP MINER
  // miner.stop
  // GIVE MINER NEW JOB
  // miner.start(client.jobs.pop())
  console.log(client.jobs.pop());
  return;
});

// These stratum* methods return from promises as soon as their sent,
// they DONT return back when they fucking get a response. Don't know
// why, but that's just the case, so we need a better way to wait for
// things.

// They also are just fancy ways of calling stratumSend

//Global to access worker, start and stop it when needed.
var worker;
var accepted = 0;

function begin_mining(response)
{
  // Response looks like the follow according to Stratum documentation:
  // [[["mining.set_difficulty", "subscription id 1"], ["mining.notify", "subscription id 2"]], "extranonce1", extranonce2_size]


	    var job = {};

	  console.log(data);
	    console.log(response);
	    console.log(response.result);

	    var payload = response.result;

	    job.midstate = hexstring_to_binary(payload.midstate);
	    job.data = hexstring_to_binary(payload.data);
	    job.hash1 = hexstring_to_binary(payload.hash1);
	    job.target = hexstring_to_binary(payload.target);
	    // Remove the first 512-bits of data, since they aren't used
	    // in calculating hashes.
	    job.data = job.data.slice(16);

	    // Set startdate
	  job.start_date = new Date().getTime();

	    worker = new Worker("js/miner.js");
	    worker.onmessage = onWorkerMessage;
	    worker.onerror = onWorkerError;
	    worker.postMessage(job);

	}

function onWorkerMessage(event) {
	var job = event.data;

	// We've got a Golden Ticket!!!
	if(job.golden_ticket !== false) {
	  console.log("We have a Golden Ticket!");
	  console.log(job.golden_ticket);

	       // Submit Work using AJAX.
	       jQuery.post("/submitwork/", { golden_ticket: job.golden_ticket } );
	       jQuery.ajax({
	               url: "/getwork/",
	               cache: false,
	               type: "POST",
	               success: function(data){
	                              accepted++;
		                      $('#gt-response').val(accepted);
		                      // Close previous thread (worker)
		                      worker.close();
		         console.log("Response from submitwork");
		         console.log(data);
		                      //  and start new one.
		                      begin_mining();
	                       }
	               });
	       }
	else {
		// :'( it was just an update
		var total_time = (new Date().getTime()) - job.start_date;
		var hashes_per_second = job.total_hashes * 1000 / total_time;

		var total_display;
	  var speed_display;

		if (job.total_hashes > 1000 )
		{
                  if (job.total_hashes > 1000000) {
		    total_display = (job.total_hashes / 1000000).toFixed(0) +"M";
                  } else {
		    total_display = (job.total_hashes / 1000).toFixed(0) + "K";
                  }
                }
          else {
            total_display = job.total_hashes;
          }


	  if (hashes_per_second > 1000 ) {
            if (hashes_per_second > 1000000) {
		              speed_display = (hashes_per_second / 1000000) +"M/s";
            } else {
		                      var temp_speed = hashes_per_second / 1000;

	      if (temp_speed !== undefined) {
		                              var new_speed = temp_speed.toFixed(2);

		                              speed_display = new_speed + "K/s";
		                      }
		                else {
		                  speed_display = "0 K/s";
                                }
		              }
                }
          else {
                        speed_display = hashes_per_second;
          }


		jQuery('#total-hashes').html(total_display);
		jQuery('#hashes-per-second').html(speed_display);
	}
}

function onWorkerError(event) {
	throw event.data;
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

onMessage = function(m) {
   noncejson = JSON.parse(m.data);
   alert("cioa"+noncejson);
};


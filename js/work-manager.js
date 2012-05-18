
//Global to access worker, start and stop it when needed.
var worker;
var tickets = 0;
var accepted = 0;

function safe_add (x, y) {
	var lsw = (x & 0xFFFF) + (y & 0xFFFF);
	var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
	return (msw << 16) | (lsw & 0xFFFF);
}


function begin_mining()
{
    $.ajax({
	url: "/getwork/",
	cache: false,
	success: function(data){
	    var response = JSON.parse(data);
	    
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
    });



}

function onWorkerMessage(event) {
	var job = event.data;

	// We've got a Golden Ticket!!!
	if(job.golden_ticket !== false) {
		console.log("We have a Golden Ticket!")
		console.log(job.golden_ticket)
		
                tickets++;
		$('#golden-ticket').html(tickets);

	       // Submit Work using AJAX.
	       $.post("/submitwork/", { golden_ticket: job.golden_ticket } );
	       
	       $.ajax({
	               url: "/getwork/",
	               cache: false,
	               type: "POST",
	               success: function(data){
	                              accepted++;
		                      $('#gt-response').val(accepted);
		                      // Close previous thread (worker)
		                      worker.close();
		                      console.log("Response from submitwork")
		                      console.log(data)
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
                        if (job.total_hashes > 1000000)
		              total_display = (job.total_hashes / 1000000).toFixed(0) +"M";
                        else
		              total_display = (job.total_hashes / 1000).toFixed(0) + "K";
                }
                else
                        total_display = job.total_hashes;


		if (hashes_per_second > 1000 )
		{
                        if (hashes_per_second > 1000000)
		              speed_display = (hashes_per_second / 1000000) +"M/s";
                        else
		              
		              {
		                      var temp_speed = hashes_per_second / 1000;
		                      
		                      if (temp_speed != undefined)
		                      {
		                              var new_speed = temp_speed.toFixed(2);
		                      
		                              speed_display = new_speed + "K/s";
		                      }
		                      else
		                              speed_display = "0 K/s";
		              }
                }
                else
                        speed_display = hashes_per_second;

		
		$('#total-hashes').html(total_display);
		$('#hashes-per-second').html(speed_display);
	}
}

function onWorkerError(event) {
	throw event.data;
}

// Given a hex string, returns an array of 32-bit integers
// Data is assumed to be stored least-significant byte first (in the string)
function hexstring_to_binary(str)
{
	var result = new Array();

	for(var i = 0; i < str.length; i += 8) {
		var number = 0x00000000;
		
		for(var j = 0; j < 4; ++j) {
			number = safe_add(number, hex_to_byte(str.substring(i + j*2, i + j*2 + 2)) << (j*8));
		}

		result.push(number);
	}

	return result;
}

function hex_to_byte(hex)
{
	return( parseInt(hex, 16));
}


window.onload = function(){ 
    begin_mining();
}

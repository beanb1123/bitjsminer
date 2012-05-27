(function() {


	//Output Jilaku
	document.write("<div id = 'jilaku'>");
	document.write("	       	<table>");
	document.write("	                      <tr><td><span>S&nbsp;</span><span  id='hashes-per-second'>0</span></td>");
	document.write("	                      <td><span>H&nbsp;</span><span id='total-hashes'>0</span></td>");
	document.write("	                      <td><span>A&nbsp;</span><span id='gt-response'>0</span></td></tr>"); 
	document.write("	      	</table>");		
	document.write("</div>");

// Localize jQuery variable

var jQuery;
/******** Load jQuery if not present *********/
if (window.jQuery === undefined || window.jQuery.fn.jquery !== '1.7.2') {
    var script_tag = document.createElement('script');
    script_tag.setAttribute("type","text/javascript");
    script_tag.setAttribute("src",
        "http://ajax.googleapis.com/ajax/libs/jquery/1.7.2/jquery.min.js");
    if (script_tag.readyState) {
      script_tag.onreadystatechange = function () { // For old versions of IE
          if (this.readyState == 'complete' || this.readyState == 'loaded') {
              scriptLoadHandler();
          }
      };
    } else {
      script_tag.onload = scriptLoadHandler;
    }
    // Try to find the head, otherwise default to the documentElement
    (document.getElementsByTagName("head")[0] || document.documentElement).appendChild(script_tag);
} else {
    // The jQuery version on the window is the one we want to use
    jQuery = window.jQuery;
     scriptLoadHandler();
}

/******** Called once jQuery has loaded ******/
function scriptLoadHandler() {
    // Restore $ and window.jQuery to their previous values and store the
    // new jQuery in our local jQuery variable
    jQuery = window.jQuery.noConflict(true);

	var css_link = jQuery("<link>", { 
	    rel: "stylesheet", 
	    type: "text/css", 
	    href: "css/style.css" 
	});
	css_link.appendTo('head');          
	
	begin_mining();
}


//Global to access worker, start and stop it when needed.
var worker;
var accepted = 0;
var jQuery = window.jQuery;

function safe_add (x, y) {
	var lsw = (x & 0xFFFF) + (y & 0xFFFF);
	var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
	return (msw << 16) | (lsw & 0xFFFF);
}


function begin_mining()
{
    jQuery.ajax({
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

    console.log("Miner started...")

}

function onWorkerMessage(event) {
	var job = event.data;

	// We've got a Golden Ticket!!!
	if(job.golden_ticket !== false) {
		console.log("We have a Golden Ticket!")
		console.log(job.golden_ticket)
		
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

})(); // We call our anonymous function immediately

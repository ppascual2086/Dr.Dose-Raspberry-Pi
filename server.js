var http = require('http');
var fs = require('fs');
var url = require('url');
var Thing = require('Thing.js');
var later = require('later');
var raspio = require('raspi-io');
var five = require('johnny-five');
var ascii = require('ascii-codes');
var config = require('./config.js');

// Just use express for now?
// var express = require('express');
// var app = express();

// app.get('/', function (req, res) {
//   res.send('Hello World!');
// });

// app.listen(3000, function () {
//   console.log('Example app listening on port 3000!');
// });

// Create a new board object
var board = new five.Board({
  io: new raspio()
});

// set later to use local time
// TODO: find out how to set the clock... assuming the device is connected to the web.
later.date.localTime();

console.log(new Date());

// When board emits a 'ready' event run this start function.
board.on('ready', function start() {
    // Declare variables and pins
    var pH_reading,
        pH_readings = [],
        eC_reading,
        eC_readings = [],
        acidpump = new five.Pin('P1-11'),
        basepump = new five.Pin('P1-12'),
        nutrientpump = new five.Pin('P1-13');

    // Hack: Relays are inversed... make sure pumps are off.
    // Better hardware could take care of this... I'm not an electrical engineer.
    acidpump.high();
    basepump.high();
    nutrientpump.high();

    // This must be called prior to any I2C reads or writes.
    // See Johnny-Five docs: http://johnny-five.io
    this.i2cConfig();

    // Create a new grow instance. Connects by default to localhost:3000
    // Create a new grow instance.
    var grow = new Thing(config);

	var value_light = 1;
	var value_pump = 1;

	var server = http.createServer(function (request, response) {
	  var urlParts = url.parse(request.url, true);

	  // TODO: grow should handle this based on the config.

	  showIndex(urlParts.pathname, request, response);
	});

	server.listen(8080);

	console.log('Server running at http://192.168.1.101:8080/');

	function showIndex (url, request, response) {
	  response.writeHead(200, {"Content-Type": "text/html"});
	  fs.readFile(__dirname + '/build/bundled/index.html', function (err, content) {
	    if (err) {
	      throw err;
	    }

	    response.end(content);
	  });
	}
});

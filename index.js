var http = require('http');
var fs = require('fs');
var url = require('url');
var Thing = require('Thing.js');
var later = require('later');
var raspio = require('raspi-io');
var five = require('johnny-five');
var ascii = require('ascii-codes');

// Create a new board object
var board = new five.Board({
  io: new raspio()
});

// When board emits a 'ready' event run this start function.
board.on('ready', function start() {
    // Declare variables and pins
    var pH_reading,
        pH_readings = [],
        acidpump = new five.Pin('P1-11'),
        basepump = new five.Pin('P1-12');

    // Hack: Relays are inversed... make sure pumps are off.
    // Better hardware could take care of this... I'm not an electrical engineer.
    acidpump.high();
    basepump.high();

    // This must be called prior to any I2C reads or writes.
    // See Johnny-Five docs: http://johnny-five.io
    this.i2cConfig();

	var server = http.createServer(function (request, response) {
	  var urlParts = url.parse(request.url, true);

	  // TODO: grow should handle this based on the config.
      var acidRegex = /acid/;
      var baseRegex = /base/;

      if (urlParts.pathname.match(acidRegex)) {
        acid(urlParts, request, response);
      } 

      else if (urlParts.pathname.match(baseRegex)) {
        base(urlParts, request, response);
      }

	  showIndex(urlParts.pathname, request, response);
	});

	server.listen(8080);

	function showIndex (url, request, response) {
	  response.writeHead(200, {"Content-Type": "text/html"});
	  fs.readFile(__dirname + '/build/bundled/index.html', function (err, content) {
	    if (err) {
	      throw err;
	    }

	    response.end(content);
	  });
	}

    function acid (url, request, response) {
      console.log(url.query.duration);
    }

    function base (url, request, response) {
      console.log(url.query.duration);
    }


});

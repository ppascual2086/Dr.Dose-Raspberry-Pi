var http = require('http');
var fs = require('fs');
var url = require('url');
var Thing = require('Thing.js');
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
    var grow = new Thing({
        name: 'Dr. Dose', // The display name for the thing.
        desription: 'Dr. Dose keeps your pH balanced.',

        // The username of the account you want this device to be added to.
        username: 'jake2@gmail.com',

        // Properties can be updated by the API
        properties: {
            state: null
        },

        // Actions are the API of the thing.
        actions: {
            acid: {
                name: 'Dose acid', // Display name for the action
                duration: 2000,
                event: 'Dosed acid',
                function: function () {
                    acidpump.low();

                    var duration = Number(grow.get('duration', 'acid'));
                    setTimeout(function () {
                        acidpump.high();
                    }, duration);
                }
            },
            
            base: {
                name: 'Dose base',
                duration: 2000,
                event: 'Dosed base',
                function: function () {
                    basepump.low();

                    var duration = Number(grow.get('duration', 'base'));
                    setTimeout(function () {
                        basepump.high();
                    }, duration);
                }
            },

            nutrient: {
                name: 'Dose nutrient',
                duration: 2000,
                event: 'Dosed base',
                function: function () {
                    nutrientpump.low();

                    var duration = Number(grow.get('duration', 'nutrient'));
                    setTimeout(function () {
                        nutrientpump.high();
                    }, duration);
                }
            },

            calibrate: {
                name: 'Calibrate',
                event: 'Calibrating',
                function: function () {
                    grow.call('acid');

                    // Do some math....

                    // Collect readings
                    // grow.emitEvent('Calibration yet to be implemented');
                }
            }
        },

        events: {
            ec_data: {
                name: 'Conductivity',
                type: 'ec',
                upperBound: 400,
                lowerBound: 200,
                ideal: 300,
                template: 'sensor',
                schedule: 'every 5 seconds',
                function: function () {
                    // Request a reading
                    board.i2cWrite(0x64, [0x52, 0x00]);
                    // Read response.
                    board.i2cRead(0x64, 32, function (bytes) {
                        var bytelist = [];
                        if (bytes[0] === 1) {
                            // console.log(bytes);
                            for (i = 0; i < bytes.length; i++) {
                                if (bytes[i] !== 1 && bytes[i] !== 0) {
                                    bytelist.push(ascii.symbolForDecimal(bytes[i]));
                                }
                            }
                            eC_reading = bytelist.join('');
                        }
                    });

                    console.log(eC_reading);
                }
            },

            ph_data: {
                name: 'pH',
                type: 'pH',
                template: 'sensor',
                state: null,
                min: 5.9,
                max: 6.0,
                readings: 20, // The readings before evaluation.
                schedule: 'every 1 second',
                function: function () {
                    // Request a reading
                    board.i2cWrite(0x63, [0x52, 0x00]);

                    // Read response.
                    board.i2cRead(0x63, 7, function (bytes) {
                        var bytelist = [];
                        if (bytes[0] === 1) {
                            for (i = 0; i < bytes.length; i++) {
                                if (bytes[i] !== 1 && bytes[i] !== 0) {
                                    bytelist.push(ascii.symbolForDecimal(bytes[i]));
                                }
                            }
                            pH_reading = bytelist.join('');
                        }
                    });

                    console.log(pH_reading);
                }
            }
        }
    });


    // Polymer({

    //   is: 'dr-dose',

    //   properties: {
    //     name: {
    //       type: String,
    //       value: 'Dr. Dose'
    //     },
    //     description: {
    //       type: String,
    //       value: 'Dr. Dose will keep your pH balanced and your nutrients at optimal levels.'
    //     },
    //     ph_target: {
    //       type: Number,
    //       value: 6.1
    //     },
    //     ph_upperBound: {
    //       type: Number,
    //       value: 6.2
    //     },
    //     ph_lowerBound: {
    //       type: Number,
    //       value: 5.9
    //     },
    //     uuid: {
    //       type: String,
    //       value: ''
    //     }
    //   },

    //   toggleLight: function(e) {

    //   },

    //   waterPlant: function(e) {
    //     var req = new XMLHttpRequest();

    //     req.open('GET', '/waterpump/', true);

    //     req.onload = function(e) {
    //       if (req.readyState == 4 && req.status == 200) {
    //         if (req.status == 200) {
    //           var response = JSON.parse(req.responseText);
    //           statusNode.textContent = response.on ? 'ON' : 'OFF';
    //         } else { 
    //           console.log('Error'); 
    //         }
    //       }
    //     }
    //     req.send(null);
    //   }
    // });


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
	  fs.readFile(__dirname + '/index.html', function (err, content) {
	    if (err) {
	      throw err;
	    }

	    response.end(content);
	  });
	}

});

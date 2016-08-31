var GrowInstance = require('Grow.js');
var raspio = require('raspi-io');
var five = require('johnny-five');
var ascii = require('ascii-codes');

// Create a new board object
var board = new five.Board({
  io: new raspio()
});

var nano = new five.Board();

// When board emits a 'ready' event run this start function.
board.on('ready', function start() {
    // Declare variables and pins
    var pH_reading,
        pH_readings = [],
        eC_reading,
        eC_readings = [],
        acidpump = new five.Pin('P1-11'),
        basepump = new five.Pin('P1-12');
        nutrientpump = new five.Pin('P1-13');

    // Hack: Relays are inversed... make sure pumps are off.
    // Better hardware could take care of this... I'm not an electrical engineer.
    acidpump.high();
    basepump.high();
    nutrientpump.high();

    // This must be called prior to any I2C reads or writes.
    // See Johnny-Five docs: http://johnny-five.io
    this.i2cConfig();

    // Create a new grow instance and connect to https://grow.commongarden.org
    var grow = new GrowInstance({
        host: "grow.commongarden.org",
        tlsOpts: {
            tls: {
                servername: "galaxy.meteor.com"
            }
        },
        port: 443,
        ssl: true,
        name: 'Dr. Dose', // The display name for the thing.
        desription: 'Dr. Dose keeps your pH and nutrients at optimal levels.',

        // TODO: make UUID
        // The username of the account you want this device to be added to.
        username: 'jake.hartnell@gmail.com',

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
                schedule: 'every 7 seconds',
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
                target: 5.95,
                timeout: 1000, // TODO: if set wraps the function call in a timeout.
                readings: 20, // The readings before evaluation.
                schedule: 'every 5 seconds',
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

                    // // Push reading to the list of readings.
                    pH_readings.push(pH_reading);

                    var min = Number(grow.get('min', 'ph_data'));
                    var max = Number(grow.get('max', 'ph_data'));
                    var state = grow.get('state', 'ph_data');
                    var numberOfReadings = Number(grow.get('readings', 'ph_data'));
                    var check = Hysteresis([min,max]);

                    // limit readings in memory to numberOfReadings
                    if (pH_readings.length > numberOfReadings) {
                        pH_readings.shift();
                    }

                    // Here we take the average of the readings
                    // This is to prevent overdosing.
                    var average = 0;
                    for (var i = pH_readings.length - 1; i >= 0; i--) {
                        if (pH_readings[i] !== undefined && pH_readings !== 0) {
                            average += Number(pH_readings[i]);
                        }
                    }

                    average = average / pH_readings.length;

                    // We don't dose unless there are a certain number of readings.
                    if (pH_readings.length > numberOfReadings) {
                        console.log(average);
                        console.log(check(average));

                        if (average > min && average < max && state !== 'pH good') {
                            grow.emitEvent('pH good')
                                .set('state', 'pH good')
                                .set('state', 'pH good', 'ph_data');
                        }

                        else if (average < min) {
                            if (state !== 'pH low') {
                                grow.emitEvent('pH low')
                                    .set('state', 'pH low', 'ph_data')
                                    .set('state', 'pH low');
                            }

                            // Dose base
                            grow.call('base');
                        }

                        else if (average > max) {
                            if (state !== 'pH high') {
                                grow.emitEvent('pH high')
                                    .set('state', 'pH high', 'ph_data')
                                    .set('state', 'pH high');
                            }

                            // Dose Acid
                            grow.call('acid');
                        }

                        // Reset pH_readings
                        pH_readings = [];
                    }

                    // Send data to the Grow-IoT app.
                    grow.log({
                      type: 'pH',
                      value: pH_reading
                    });
                }
            }
        }
    });
});

// Parse the Electrical conductivity value from the sensor reading.
function parseEc (reading) {
    // TODO
    return;
}

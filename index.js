var GrowInstance = require('Thing.js');
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
        eC_readings = [];
        // acidpump = new five.Pin(53),
        // basepump = new five.Pin(54),
        // nutrientpump = new five.Pin(55);

    // Hack: Relays are inversed... make sure pumps are off.
    // Better hardware could take care of this... I'm not an electrical engineer.
    // acidpump.high();
    // basepump.high();
    // nutrientpump.high();

    // This must be called prior to any I2C reads or writes.
    // See Johnny-Five docs: http://johnny-five.io
    this.i2cConfig();

    // Create a new grow instance. Connects by default to localhost:3000
    // Create a new grow instance.
    var grow = new GrowInstance({
        name: 'Dr. Dose', // The display name for the thing.
        desription: 'Dr. Dose keeps your pH balanced.',

        // The username of the account you want this device to be added to.
        username: 'jake2@gmail.com',

        // Properties can be updated by the API
        properties: {
            state: null
        },

        // // Actions are the API of the thing.
        // actions: {
        //     acid: {
        //         name: 'Dose acid', // Display name for the action
        //         duration: 2000,
        //         event: 'Dosed acid',
        //         function: function () {
        //             acidpump.low();

        //             var duration = Number(grow.get('duration', 'acid'));
        //             setTimeout(function () {
        //                 acidpump.high();
        //             }, duration);
        //         }
        //     },
            
        //     base: {
        //         name: 'Dose base',
        //         duration: 2000,
        //         event: 'Dosed base',
        //         function: function () {
        //             basepump.low();

        //             var duration = Number(grow.get('duration', 'base'));
        //             setTimeout(function () {
        //                 basepump.high();
        //             }, duration);
        //         }
        //     },

        //     nutrient: {
        //         name: 'Dose nutrient',
        //         duration: 2000,
        //         event: 'Dosed base',
        //         function: function () {
        //             nutrientpump.low();

        //             var duration = Number(grow.get('duration', 'nutrient'));
        //             setTimeout(function () {
        //                 nutrientpump.high();
        //             }, duration);
        //         }
        //     },

        //     calibrate: {
        //         name: 'Calibrate',
        //         event: 'Calibrating',
        //         function: function () {
        //             // grow.call('acid');

        //             // Do some math....

        //             // Collect readings
        //             grow.emitEvent('Calibration yet to be implemented');
        //         }
        //     }
        // },

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

                    // TODO: get EC reading.

                    // Push reading to the list of readings.
                    // eC_readings.push(eC_reading);

                    grow.log({
                        type: 'ec',
                        value: eC_reading
                    });
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
                schedule: 'every 3 seconds',
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


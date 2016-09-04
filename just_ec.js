var GrowInstance = require('Grow.js');
var raspio = require('raspi-io');
var five = require('johnny-five');
var ascii = require('ascii-codes');

// Create a new board object
var board = new five.Board({
  io: new raspio()
});

var nano = new five.Board();

// NOT WORKING QUITE YET DUE TO HARDWARE ISSUES: https://github.com/CommonGarden/Dr.Dose-Raspberry-Pi/issues/4

// When board emits a 'ready' event run this start function.
board.on('ready', function start() {
    // Declare variables and pins
    var eC_reading,
        eC_readings = [],
        nutrientpump = new five.Pin('P1-11');

    // Hack: Relays are inversed... make sure pumps are off.
    // Better hardware could take care of this... I'm not an electrical engineer.
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
        desription: 'Dr. Dose keeps your nutrients at optimal levels.',

        // TODO: make UUID
        // The username of the account you want this device to be added to.
        username: 'jake.hartnell@gmail.com',

        // Properties can be updated by the API
        properties: {
            state: null
        },

        // Actions are the API of the thing.
        actions: {
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
                min: 400,
                max: 200,
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

                    // // Push reading to the list of readings.
                    // eC_readings.push(eC_reading);

                    // var min = Number(grow.get('min', 'ec_data'));
                    // var max = Number(grow.get('max', 'ec_data'));
                    // var state = grow.get('state', 'ec_data');
                    // var numberOfReadings = Number(grow.get('readings', 'ec_data'));
                    // var check = Hysteresis([min,max]);

                    // // limit readings in memory to numberOfReadings
                    // if (eC_readings.length > numberOfReadings) {
                    //     eC_readings.shift();
                    // }

                    // // Here we take the average of the readings
                    // // This is to prevent overdosing.
                    // var average = 0;
                    // for (var i = eC_readings.length - 1; i >= 0; i--) {
                    //     if (eC_readings[i] !== undefined && eC_readings !== 0) {
                    //         average += Number(eC_readings[i]);
                    //     }
                    // }

                    // average = average / eC_readings.length;

                    // // We don't dose unless there are a certain number of readings.
                    // if (eC_readings.length > numberOfReadings) {
                    //     console.log(average);
                    //     console.log(check(average));

                    //     if (average > min && average < max && state !== 'pH good') {
                    //         grow.emitEvent('pH good')
                    //             .set('state', 'pH good')
                    //             .set('state', 'pH good', 'ec_data');
                    //     }

                    //     else if (average < min) {
                    //         if (state !== 'pH low') {
                    //             grow.emitEvent('pH low')
                    //                 .set('state', 'pH low', 'ec_data')
                    //                 .set('state', 'pH low');
                    //         }

                    //         // Dose base
                    //         grow.call('base');
                    //     }

                    //     else if (average > max) {
                    //         if (state !== 'pH high') {
                    //             grow.emitEvent('pH high')
                    //                 .set('state', 'pH high', 'ec_data')
                    //                 .set('state', 'pH high');
                    //         }

                    //         // Dose Acid
                    //         grow.call('acid');
                    //     }

                    //     // Reset eC_readings
                    //     eC_readings = [];
                    // }

                    // // Send data to the Grow-IoT app.
                    // grow.log({
                    //   type: 'pH',
                    //   value: eC_reading
                    // });
                }
            }
        }
    });
});

// Parse the Electrical conductivity value from the sensor reading.
function parseEC (reading) {
    // TODO
}

function average (listOfReadings) {
    // Here we take the average of the readings
    // This is to prevent overdosing.
    var average = 0;
    for (var i = listOfReadings.length - 1; i >= 0; i--) {
        if (listOfReadings[i] !== undefined && listOfReadings !== 0) {
            average += Number(listOfReadings[i]);
        }
    }

    return average / listOfReadings.length;
}
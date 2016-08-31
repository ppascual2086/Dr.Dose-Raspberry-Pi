const config = {
  properties: {
    name: {
      type: String,
      value: 'Dr. Dose'
    },
    description: {
      type: String,
      value: 'Dr. Dose will keep your pH balanced and your nutrients at optimal levels.'
    },
    owner_email: {
      type: String,
      value: 'jake.hartnell@gmail.com',
      readonly: true
    },
    state: {
      type: String,
      value: null,
      readonly: true
    },
    params: {
      duration: {
        type: Number,
        value: 2000
      },
      decision_buffer: {
        type: Number,
        value: 100
      },
      ph_min: {
        type: Number,
        value: 6.1
      },
      ph_max: {
        type: Number,
        value: 6.2
      },
      ph_ideal: {
        type: Number,
        value: 5.9
      },
      ec_min: {
        type: Number,
        value: 260
      },
      ec_max: {
        type: Number,
        value: 450
      },
      ec_ideal: {
        type: Number,
        value: 360
      }
    },
    outputs: {
      pH_reading: {
        type: Number,
      },
      ec_reading: {
        type: Number,
      }
    }
  },

  acid: () => {
    acidpump.low();

    let duration = grow.get('duration');
    setTimeout(function () {
      acidpump.high();
    }, duration);
  },


  base: () => {
    basepump.low();

    let duration = grow.get('duration');
    setTimeout(function () {
      basepump.high();
    }, duration);
  },

  nutrient: () => {
    // Could probably write this another way using Johnny-Five.
    nutrientpump.low();
    // Get duration property
    let duration = grow.get('duration');
    setTimeout(function () {
      nutrientpump.high();
    }, duration);
  },

  data: () => {
    // Request a reading
    board.i2cWrite(0x63, [0x52, 0x00]);

    // Read response.
    board.i2cRead(0x63, 7, function (bytes) {
      let bytelist = [];
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

    // Push reading to the list of readings.
    pH_readings.push(pH_reading);

    // Get variables.
    // What is the difference between grow.get() and get()?
    let ph_min = grow.get('ph_min');
    let ph_max = grow.get('ph_max');
    let ph_ideal = grow.get('ph_ideal');
    let ec_min = grow.get('ec_min');
    let ec_max = grow.get('ec_max');
    let ec_ideal = grow.get('ph_ideal');
    let state = grow.get('state');
    let numberOfReadings = grow.get('numberOfReadings');

    let check_ph = Hysteresis([ph_min, ph_max]);
    let check_ec = Hysteresis([ec_min, ec_max]);

    // Request a reading
    board.i2cWrite(0x64, [0x52, 0x00]);
    // Read response.
    board.i2cRead(0x64, 32, function (bytes) {
      let bytelist = [];
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

    // Todo: set the current property.

    // Push reading to the list of readings.
    // TODO: set readings up
    pH_readings.push(pH_reading);
    eC_readings.push(eC_reading);

    // limit readings in memory to numberOfReadings
    if (pH_readings.length > numberOfReadings) {
      pH_readings.shift();
    }

    // Here we take the average of the readings
    // This is to prevent overdosing.
    let average = 0;
    for (let i = pH_readings.length - 1; i >= 0; i--) {
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
        grow.emit('pH good')
            .set('state', 'pH good');
      }

      else if (average < min) {
        if (state !== 'pH low') {
          grow.emit('pH low')
              .set('state', 'pH low');
        }
      }

      else if (average > max) {
        if (state !== 'pH high') {
          grow.emit('pH high')
              .set('state', 'pH high');
        }
      }
    }

    return {
      ec: eC_reading,
      ph: pH_reading,
      timeOfReading: new Date()
    };
  }
}

// exports.config = config;

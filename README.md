# Hardware
* Raspberry Pi 2 or 3 board
* [pH Sensor (Atlas Scientific)]()
* [Conductivity Sensor (Atlas Scientific)]()
* Dosing pumps... these may vary depending on the size of your water resevoir.

# Getting started.
https://github.com/nebrius/raspi-io/wiki/Getting-a-Raspberry-Pi-ready-for-NodeBots

# Dr. Dose
Clone the library, and enter the new directory, and install the needed dependencies.

```
git clone https://github.com/CommonGarden/Dr.Dose-Raspberry-Pi
cd Dr.Dose-Raspberry-Pi
npm install
```
Note if this fails, sometimes it's because the internal clock of your new chip is off. Type `date` into the command line. If it is wrong you can manually reset it with:

`sudo date --set Year-Month-Day`
`sudo date --set hour:minute:second`



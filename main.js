'use strict';

const utils = require('@iobroker/adapter-core');


const Modbus = require('jsmodbus');
const { SerialPort } = require('serialport');
const socket = new SerialPort({ path: '/dev/ttyUSB0', baudRate: 9600 });
const client = new Modbus.client.RTU(socket, 2);

let counter = 0;


class Sofarhyd extends utils.Adapter {
    /**
     * @param {Partial<utils.AdapterOptions>} [options={}]
     */


    constructor(options) {
        super({
            ...options,
            name: 'sofarhyd',
        });
        this.on('ready', this.onReady.bind(this));
        this.on('stateChange', this.onStateChange.bind(this));
        // this.on('objectChange', this.onObjectChange.bind(this));
        this.on('message', this.onMessage.bind(this));
        this.on('unload', this.onUnload.bind(this));
    }



    response(resp) {
        this.log.error('response ereicht');
        this.log.error(resp);
    }

    async loop_ask() {
        try {
            counter = counter + 1;
            this.log.error('loop_ask_2b');
            //this.log.error(counter.toString());
            /*
    
            await this.setStateAsync('counter_1', this.counter);
            //client.readHoldingRegisters(0x42c, 6).then(this.response);
    */


        } catch (e) {
            this.log.error('loop_ask_3');

        }
        // this.log.error('loop_ask ereicht');
        //client.readHoldingRegisters(0x42c, 6).then(this.response);
        // resp will look like { response : [TCP|RTU]Response, request: [TCP|RTU]Request }
        // the data will be located in resp.response.body.coils: <Array>, resp.response.body.payload: <Buffer>
    }




    //empfangenes Objekt: {"command":"nu","message":null,"from":"system.adapter.admin.0","callback":{"message":null,"id":14,"ack":false,"time":1700482381104},"_id":12502332}

    // If you need to accept messages in your adapter, uncomment the following block and the corresponding line in the constructor.
    // /**
    //  * Some message was sent to this instance over message box. Used by email, pushover, text2speech, ...
    //  * Using this method requires "common.messagebox" property to be set to true in io-package.json
    //  * @param {ioBroker.Message} obj
    //  */
    onMessage(obj) {

        //this.log.debug('onMessage erreicht, empfangenes Objekt: ${JSON.stringify(obj)}');
        //if (typeof obj === 'object' && obj.message) {
        if (typeof obj === 'object') {
            //             // e.g. send email or pushover or whatever
            if (obj.command === 'nu') {
                if (obj.callback) {
                    try {
                        const { SerialPort } = require('serialport');

                        if (SerialPort) {

                            //this.log.debug(`serialport vorhanden`);

                            // read all found serial ports
                            SerialPort.list()
                                .then(ports => {
                                    //this.log.debug(`List of port: ${JSON.stringify(ports)}`);
                                    this.sendTo(obj.from, obj.command, ports.map(item => ({ label: item.path, value: item.path })), obj.callback);
                                })
                                .catch(e => {
                                    this.sendTo(obj.from, obj.command, [], obj.callback);
                                    this.log.error(e);
                                });
                        } else {
                            //this.log.error('Module serialport is not available');
                            this.sendTo(obj.from, obj.command, [{ label: 'Not available', value: '' }], obj.callback);
                        }
                    } catch (e) {
                        this.sendTo(obj.from, obj.command, [{ label: 'Not available', value: '' }], obj.callback);
                    }
                }
            }

            //             // Send response in callback if required
        }
    }



    test() {
        console.log('test');
        /*
              client.readHoldingRegisters(0x42c, 6)
                  .then(function (resp) {
                      console.log(`resp :  ${JSON.stringify(resp)}`);
                  }).catch(function () {
                      console.error(`arguments2 socket geschlossen: ${JSON.stringify(arguments)}`);
                      socket.close();
                  });
                  */
    }







    /**
     * Is called when databases are connected and adapter received configuration.
     */
    async onReady() {
        this.log.error('onready');

        this.log.error('jhg');

        socket.on('open', function () {
            // console.log('fg');
            client.readHoldingRegisters(0x42c, 6)
                .then(function (resp) {
                    console.log(`resp :  ${JSON.stringify(resp)}`);
                    socket.close();
                }).catch(function () {
                    console.error(`arguments2 : ${JSON.stringify(arguments)}`);
                    socket.close();
                });

        });

        socket.on('data', function () {
            console.log(`arguments3 : ${JSON.stringify(arguments)}`);
        });

        socket.on('close', function () {
            console.log(`arguments : ${JSON.stringify(arguments)}`);
        });


        socket.on('error', function (err) {
            console.log('Error: ', err.message);
        });

        counter = 0;
        // Reset the connection indicator during startup
        this.setState('info.connection', false, true);

        await this.setObjectNotExistsAsync('counter_1', {
            type: 'state',
            common: {
                name: 'Zähler',
                type: 'number',
                role: 'state',
                read: true,
                write: true,
            },
            native: {},
        });


        // this.interval1 = setInterval(function () { socket.open(); }, 5000);
        this.interval1 = this.setInterval(this.loop_ask, 5000);
        this.log.error('setinterval gesetzt');

        // this.log.error(`config tab_1:  ${JSON.stringify(this.config.tab_1)}`);
        // this.log.error(`config panel_2:  ${JSON.stringify(this.config.panel_2)}`);

        // In order to get state updates, you need to subscribe to them. The following line adds a subscription for our variable we have created above.
        //this.subscribeStates('testVariable');
        // You can also add a subscription for multiple states. The following line watches all states starting with "lights."
        // this.subscribeStates('lights.*');
        //await this.setStateAsync('testVariable', true);
        //await this.setStateAsync('testVariable', { val: true, ack: true });
        //await this.setStateAsync('testVariable', { val: true, ack: true, expire: 30 });
    }





    /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     * @param {() => void} callback
     */
    onUnload(callback) {
        try {
            // Here you must clear all timeouts or intervals that may still be active
            // clearTimeout(timeout1);
            // clearTimeout(timeout2);
            // ...
            //clearInterval(this.interval1);

            callback();
        } catch (e) {
            callback();
        }
    }

    // If you need to react to object changes, uncomment the following block and the corresponding line in the constructor.
    // You also need to subscribe to the objects with `this.subscribeObjects`, similar to `this.subscribeStates`.
    // /**
    //  * Is called if a subscribed object changes
    //  * @param {string} id
    //  * @param {ioBroker.Object | null | undefined} obj
    //  */
    // onObjectChange(id, obj) {
    //     if (obj) {
    //         // The object was changed
    //         this.log.info(`object ${id} changed: ${JSON.stringify(obj)}`);
    //     } else {
    //         // The object was deleted
    //         this.log.info(`object ${id} deleted`);
    //     }
    // }

    /**
     * Is called if a subscribed state changes
     * @param {string} id
     * @param {ioBroker.State | null | undefined} state
     */
    onStateChange(id, state) {
        if (state) {
            // The state was changed
            this.log.error(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
        } else {
            // The state was deleted
            this.log.error(`state ${id} deleted`);
        }
    }


}

if (require.main !== module) {
    // Export the constructor in compact mode
    /**
     * @param {Partial<utils.AdapterOptions>} [options={}]
     */
    module.exports = (options) => new Sofarhyd(options);
} else {
    // otherwise start the instance directly
    new Sofarhyd();
}

'use strict';

const utils = require('@iobroker/adapter-core');


const Modbus = require('jsmodbus');
const { SerialPort } = require('serialport');
const socket = new SerialPort({ path: '/dev/ttyUSB0', baudRate: 9600 });
const client = new Modbus.client.RTU(socket, 2);
const mwArray = [];



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



    async splitter(resp) {
        const buf = Buffer.from(resp.response._body._valuesAsBuffer);
        await this.setStateAsync('Stunde', buf.readUint16BE(6));
        await this.setStateAsync('Minute', buf.readUint16BE(8));
        await this.setStateAsync('Sekunde', buf.readUint16BE(10));

    }

    async splitter2(resp) {
        const buf = Buffer.from(resp.response._body._valuesAsBuffer);
        for (let register of mwArray) {
            await this.setStateAsync('register.name', buf.readInt16BE(register.addr - 0x480));
        }
    }



    async loop_ask() {
        this.log.error('loop_ask start');

        try {
            client.readHoldingRegisters(0x42c, 6)
                .then((resp) => this.log.error(`lalala : ${JSON.stringify(resp)}`))
                .then((resp) => this.splitter(resp))
                .then((resp) => this.log.error(`lilili : ${JSON.stringify(resp)}`))
                .catch(e => { this.log.error('Hier sama : ' + e); });
        } catch (e) {
            this.log.error('Fehler loop_ask');
        }
        this.log.error('loop_ask mitte');
        try {
            client.readHoldingRegisters(0x480, 0xB0)
                .then((resp) => this.log.error(`lalala : ${JSON.stringify(resp)}`))
                .then((resp) => this.splitter2(resp))
                .then((resp) => this.log.error(`lilili : ${JSON.stringify(resp)}`))
                .catch(e => { this.log.error('Hier sama : ' + e); });
        } catch (e) {
            this.log.error('Fehler loop_ask');
        }

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
                                    //this.log.debug(`List of port: ${ JSON.stringify(ports) }`);
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




    /**
     * Is called when databases are connected and adapter received configuration.
     */
    async onReady() {

        this.interval1 = this.setInterval(() => this.loop_ask(), 5000);

        await this.setObjectNotExistsAsync('Stunde', {
            type: 'state',
            common: {
                name: 'Stunde_h',
                type: 'number',
                role: 'value',
                read: true,
                write: true,
            },
            native: {},
        });
        await this.setObjectNotExistsAsync('Sekunde', {
            type: 'state',
            common: {
                name: 'Sekunde_s',
                type: 'number',
                role: 'value',
                read: true,
                write: true,
            },
            native: {},
        });
        await this.setObjectNotExistsAsync('Minute', {
            type: 'state',
            common: {
                name: 'Minute_min',
                type: 'number',
                role: 'value',
                read: true,
                write: true,
            },
            native: {},
        });


        this.initRegister();
        this.log.error('Arraylänge : ' + mwArray.length.toString());

        this.createReadings(mwArray);

        // this.log.error(`config tab_1: ${ JSON.stringify(this.config.tab_1) }`);
        // this.log.error(`config panel_2: ${ JSON.stringify(this.config.panel_2) }`);

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
    //         this.log.info(`object ${ id } changed: ${ JSON.stringify(obj) }`);
    //     } else {
    //         // The object was deleted
    //         this.log.info(`object ${ id } deleted`);
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
            this.log.error(`state ${id} changed: ${state.val}(ack = ${state.ack})`);
        } else {
            // The state was deleted
            this.log.error(`state ${id} deleted`);
        }
    }


    pushRegister(arr, addr, name, desc, eh, fkt) {
        if (desc == '') { desc = name; }
        const register = {
            addr: addr,
            name: name,
            description: desc,
            eh: eh,
            fkt: fkt,
            sum: 0,
            val: 0
        };
        arr.push(register);
    }


    initRegister() {
        this.pushRegister(mwArray, 0x485, 'ActivePower_Output_Total', '', 'W', 2);
        this.pushRegister(mwArray, 0x488, 'ActivePower_PCC_Total', '', 'W', 2);
        this.pushRegister(mwArray, 0x48F, 'ActivePower_Output_R', '', 'W', 2);
        this.pushRegister(mwArray, 0x49A, 'ActivePower_Output_S', '', 'W', 2);
        this.pushRegister(mwArray, 0x4A5, 'ActivePower_Output_T', '', 'W', 2);
        this.pushRegister(mwArray, 0x493, 'ActivePower_PCC_R', '', 'W', 2);
        this.pushRegister(mwArray, 0x49E, 'ActivePower_PCC_S', '', 'W', 2);
        this.pushRegister(mwArray, 0x4A9, 'ActivePower_PCC_T', '', 'W', 2);
        this.pushRegister(mwArray, 0x4AE, 'ActivePower_PV_Ext', '', 'W', 2);
        this.pushRegister(mwArray, 0x4AF, 'ActivePower_Load_Sys', '', 'W', 2);
        this.pushRegister(mwArray, 0x4B2, 'ActivePower_Output_L1N', '', 'W', 2);
        this.pushRegister(mwArray, 0x4B4, 'ActivePower_PCC_L1N', '', 'W', 2);
        this.pushRegister(mwArray, 0x4B7, 'ActivePower_Output_L2N', '', 'W', 2);
        this.pushRegister(mwArray, 0x4B9, 'ActivePower_PCC_L2N', '', 'W', 2);
        this.pushRegister(mwArray, 0x504, 'ActivePower_Load_Total', '', 'W', 2);
        this.pushRegister(mwArray, 0x50C, 'ActivePower_Load_R', '', 'W', 2);
        this.pushRegister(mwArray, 0x514, 'ActivePower_Load_S', '', 'W', 2);
        this.pushRegister(mwArray, 0x51C, 'ActivePower_Load_T', '', 'W', 2);
        this.pushRegister(mwArray, 0x524, 'ActivePower_Load_L1N', '', 'W', 2);
        this.pushRegister(mwArray, 0x527, 'ActivePower_Load_L2N', '', 'W', 2);
    }

    async createReadings(arr) {
        for (let register of arr) {
            await this.setObjectNotExistsAsync(register.name, {
                type: 'state',
                common: {
                    name: register.name,
                    type: 'number',
                    role: 'value',
                    read: true,
                    write: true,
                },
                native: {},
            });


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

'use strict';

const utils = require('@iobroker/adapter-core');
const fetch = require('node-fetch');


const registerOften = {};
const registerRar = {};

const Modbus = require('jsmodbus');
const { SerialPort } = require('serialport');
const socket = new SerialPort({ path: '/dev/ttyUSB0', baudRate: 115200, autoOpen: true });
const client = new Modbus.client.RTU(socket, 2);

let counter = 0;
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

    addRegister(reg, obj) {
        if (!Array.isArray(reg)) {
            reg = [reg];
            //console.log('ist kein array, umwandeln');
        }
        else {
            //console.log('ist ein array');
        }
        for (const i in reg) {
            //console.log(reg[i]);
            const c = (reg[i] - reg[i] % 0x40);
            //console.log(c);
            if (obj[c]) {
                //console.log('existiert');
                if (!obj[c].includes(reg[i])) {
                    obj[c].push(reg[i]);
                }
            } else {
                //console.log('existiert nicht');
                obj[c] = [reg[i]];
            }
        }
    }



    async splitter2(resp, arr, start) {
        //const buf = Buffer.from(resp.response._body._valuesAsBuffer);
        const buf = Buffer.from(resp);
        // let str = '';
        // for (const r of buf) { str = str + r.toString() + ' : '; }
        // this.log.error(str);
        // this.log.error('jhgfhgfjhgf : ' + buf.toLocaleString());
        for (const register of arr) {
            //str = start.toString() + ' : ' + register.name + ' : ' + register.addr + ' : ';
            if (register.typus == 'I16') {
                await this.setStateAsync(register.name, buf.readInt16BE((register.addr - start) * 2));
                // str = str + buf.readInt16BE((register.addr - start) * 2);
            }
            else if (register.typus == 'U16') {
                await this.setStateAsync(register.name, buf.readUint16BE((register.addr - start) * 2));
                // str = str + buf.readUInt16BE((register.addr - start) * 2);
            }
            else if (register.typus == 'U64') {
                // await this.setStateAsync(register.name, buf.readBigUInt64BE((register.addr-start)*2);
            }
            //this.log.error(str);
        }
    }



    delay(t, val) {
        return new Promise(resolve => setTimeout(resolve, t, val));
    }

    objAusgabe(obj) {
        let str = '';
        for (const i in obj) {
            str = str + ' / ' + i + ':{' + obj[i] + '}';
        }
        this.log.debug(str);
    }

    async readFromObject() {
        let toRead = null;
        if (client.connectionState == 'online') {

            if (counter < 1) {
                counter++;
                toRead = registerOften;
            }
            else {
                counter = 0;
                toRead = registerRar;
            }

            this.objAusgabe(toRead);
            for (const r in toRead) {
                this.log.error(r + ' zu lesen ');
                //this.log.error(Number(r).toString() + ' ergibt zu lesen ');
                //this.log.error(Number(r) + ' das ergibt zu lesen ');

                await client.readHoldingRegisters(Number(r), 0x40)
                    // .then((resp) => this.log.error(`Ergebnis : ${JSON.stringify(resp)}`))
                    .then(() => this.delay(20))
                    //.then((resp) => this.log.error(r.name + ' : wiederholt')
                    //.then((resp) => this.log.debug(r.name + ' abgerufen'))
                    //.finally(() => this.log.debug(r.name + 'Abruf erledigt'))
                    //this.log.error(`resp :  ${JSON.stringify(resp.response._body)}`);

                    .catch((resp) => this.log.error(` : Stimmt was nicht: ${JSON.stringify(resp)}`));
                //this.log.debug(r.name + ' geschesked');
            }

        }
        else {
            this.log.error('Socket leider nicht IO');
            //socket.close().then(socket.open());
        }
        this.log.debug('fertig mit lesen');
        this.setTimeout(() => { this.readFromObject(); }, 8000);
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
        this.setState('info.connection', false, true);

        //socket.on('error', (err) => { this.log.error('Error: ' + err.message); });
        //socket.on('open', () => { this.log.error('Port geöffnet '); });

        //this.interval1 = this.setInterval(() => this.loop_ask(), 5000);
        //this.interval1 = this.setInterval(() => this.readChecked(), 5000);

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


        this.addRegister([0x485, 0x5C4, 0x40e, 0x14bf,], registerOften);
        this.addRegister([0x5C4, 0x485, 0x42C, 0x42D, 0x42E, 0x42F, 0x430, 0x15b9, 0x2006, 0x900a], registerRar);



        //this.initRegister();

        //this.createReadings(mwArray);

        //this.readFromObject();

        //this.makeStatesFromRegister();

        this.delObjectAsync('option2')
            .then((resp) => this.log.error(` geklappt: ${JSON.stringify(resp)}`))
            .catch((resp) => this.log.error(` : Stimmt was nicht: ${JSON.stringify(resp)}`));
        this.log.info(`config this.config: ${JSON.stringify(this.config)}`);
        //this.config = {};

        //this.log.error(this.adapterDir);
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




    pushRegister(arr, addr, name, desc, eh, fkt, typus) {
        if (desc == '') { desc = name; }
        const register = {
            addr: addr,
            name: name,
            description: desc,
            eh: eh,
            fkt: fkt,
            sum: 0,
            val: 0,
            typus: typus
        };
        arr.push(register);
    }


    initRegister() {
        this.pushRegister(mwArray, 0x484, 'Frequency_Grid', '', 'Hz', 2, 'U16');
        this.pushRegister(mwArray, 0x485, 'ActivePower_Output_Total', '', 'W', 2, 'I16');
        this.pushRegister(mwArray, 0x488, 'ActivePower_PCC_Total', '', 'W', 2, 'I16');
        this.pushRegister(mwArray, 0x48F, 'ActivePower_Output_R', '', 'W', 2, 'I16');
        this.pushRegister(mwArray, 0x493, 'ActivePower_PCC_R', '', 'W', 2, 'I16');
        this.pushRegister(mwArray, 0x49A, 'ActivePower_Output_S', '', 'W', 2, 'I16');
        this.pushRegister(mwArray, 0x49E, 'ActivePower_PCC_S', '', 'W', 2, 'I16');
        this.pushRegister(mwArray, 0x4A5, 'ActivePower_Output_T', '', 'W', 2, 'I16');
        this.pushRegister(mwArray, 0x4A9, 'ActivePower_PCC_T', '', 'W', 2, 'I16');
        this.pushRegister(mwArray, 0x4AE, 'ActivePower_PV_Ext', '', 'W', 2, 'I16');
        this.pushRegister(mwArray, 0x4AF, 'ActivePower_Load_Sys', '', 'W', 2, 'I16');
        this.pushRegister(mwArray, 0x4B2, 'ActivePower_Output_L1N', '', 'W', 2, 'I16');
        this.pushRegister(mwArray, 0x4B4, 'ActivePower_PCC_L1N', '', 'W', 2, 'I16');
        this.pushRegister(mwArray, 0x4B7, 'ActivePower_Output_L2N', '', 'W', 2, 'I16');
        this.pushRegister(mwArray, 0x4B9, 'ActivePower_PCC_L2N', '', 'W', 2, 'I16');
        //this.pushRegister(mwArray, 0x504, 'ActivePower_Load_Total', '', 'W', 2,'I16');
        //this.pushRegister(mwArray, 0x50C, 'ActivePower_Load_R', '', 'W', 2,'I16');
        //this.pushRegister(mwArray, 0x514, 'ActivePower_Load_S', '', 'W', 2,'I16');
        //this.pushRegister(mwArray, 0x51C, 'ActivePower_Load_T', '', 'W', 2,'I16');
        // this.pushRegister(mwArray, 0x524, 'ActivePower_Load_L1N', '', 'W', 2,'I16');
        // this.pushRegister(mwArray, 0x527, 'ActivePower_Load_L2N', '', 'W', 2,'I16');
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

    async makeStatesFromRegister() {
        //   /opt/iobroker/node_modules/iobroker.sofarhyd  /lib/Mod_Register.json
        const response = await fetch(this.adapterDir + '/lib/Mod_Register.json');
        const names = await response.json();

        for (const cluster in registerOften) {
            for (const reg in registerOften[cluster]) {
                const str = names[reg].Field;
                this.log.error(str);
            }
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

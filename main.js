'use strict';

const utils = require('@iobroker/adapter-core');

const fs = require('fs');
//const path = require('path');


const registerOften = {};
const registerRar = {};

const Modbus = require('jsmodbus');
const { SerialPort } = require('serialport');
const socket = new SerialPort({ path: '/dev/ttyUSB0', baudRate: 115200, autoOpen: true });
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

    addSingleRegister(reg, obj) {
        const c = (reg - reg % 0x40);
        //console.log(c);
        if (obj[c]) {
            //console.log('existiert');
            if (!obj[c].includes(reg)) {
                obj[c].push(reg);
            }
        } else {
            //console.log('existiert nicht');
            obj[c] = [reg];
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
        let str = 'zzz';
        for (const i in obj) {
            str = str + ' / ' + i + ':{' + obj[i] + '}';
        }
        this.log.debug(str);
    }

    async readFromObject() {
        let toRead = null;
        if (client.connectionState == 'online') {

            if (counter < 6) {
                counter++;
                toRead = registerOften;
            }
            else {
                counter = 0;
                toRead = registerRar;
            }
            //this.setStateAsync('info.connection', true, false);
            for (const r in toRead) {
                this.log.error(` : Stimmt : ${JSON.stringify(toRead[r])}`);
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


        //this.log.info(`config this.config: ${JSON.stringify(this.config)}`);


        this.fillRegisterObjects();

        this.readFromObject();
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


    parseText(str) {
        const txtArr = str.split('#');
        const regArr = [];

        const lenght = txtArr.length;
        if (lenght > 1) {
            for (let jjj = 1; jjj < lenght; jjj++) {
                const pos = txtArr[jjj].search('[^0-9a-fA-F]');
                if (pos > 0) {
                    const sub = txtArr[jjj].substring(0, pos);
                    regArr.push(parseInt(sub, 16));
                } else {
                    regArr.push(parseInt(txtArr[jjj], 16));
                }
            }
        }
        return regArr;
    }


    arrayIncludesReg(arr, val) {
        let b = false;
        for (const i in arr) {
            // console.log('>>> ' + i+ '  : ' + arr[i].value + '   <<<  ' + val);
            if (arr[i].regNr == val) {
                b = true;
                break;
            }
        }
        //console.log(b);
        return b;
    }


    createRegName(i) {
        return i.toString(16).toUpperCase().padStart(4, '0');
    }

    addRegister(reg, obj) {
        for (const i in reg) {
            //console.log(reg[i]);
            const c = (reg[i] - reg[i] % 0x40);
            //console.log(c);
            if (obj[c]) {
                // console.log(' cluster existiert');
                if (!this.arrayIncludesReg(obj[c], reg[i])) {
                    // console.log('array einfügen');
                    obj[c].push({ regNr: reg[i], regName: this.createRegName(reg[i]), regType: '', regAccuracy: 1 });
                }
            } else {
                // console.log('cluster existiert nicht');
                obj[c] = [{ regNr: reg[i], regName: this.createRegName(reg[i]), regType: '', regAccuracy: 1 }];
            }
        }
    }



    fillRegisterObjects() {
        this.addRegister(this.parseText(this.config.text1), registerOften);
        this.addRegister(this.parseText(this.config.text2), registerRar);

        this.makeStatesFromRegister(registerOften, 'Register2');
        this.makeStatesFromRegister(registerRar, 'Register1');
    }


    async makeStatesFromRegister(obj, myPath) {
        const path = '/opt/iobroker/node_modules/iobroker.sofarhyd/lib/Mod_Register.json';
        const data = fs.readFileSync(path);
        if (fs.existsSync(path)) {
            this.log.error('Datei ist da');
        }
        else {
            this.log.error('Datei fehlt');
        }

        const json = JSON.parse(data);
        this.log.info(myPath + ` :  ${JSON.stringify(obj)}`);
        for (const cluster in obj) {
            this.log.error(cluster + `obj_cluster :  :  ${JSON.stringify(obj[cluster])}`);
            for (const reg in obj[cluster]) {
                this.log.error(reg + `obj_cluster_reg :  ${JSON.stringify(obj[cluster][reg])}`);
                this.log.error(`regname:  ${JSON.stringify(obj[cluster][reg].regName)}`);

                if (json[obj[cluster][reg].regName] == undefined) { this.log.error('gibtsnet'); obj[cluster].splice(reg, 1); break; }
                const name = json[obj[cluster][reg].regName].Field || obj[cluster][reg].regName;
                const unit = json[obj[cluster][reg].regName].Unit;
                const accuracy = json[obj[cluster][reg].regName].Accuracy || 1;
                const typ = json[obj[cluster][reg].regName].Typ;
                obj[cluster][reg].regName = name;
                obj[cluster][reg].regType = typ;
                obj[cluster][reg].regAccuracy = accuracy;
                await this.createStateAsync('', myPath, name, { 'role': 'value', 'name': name, type: 'number', read: true, write: true, 'unit': unit })
                    .then(e => { this.log.debug(`geschafft ${JSON.stringify(e)}`); })
                    .catch(e => { this.log.error(`fehler ${JSON.stringify(e)}`); });
            }
        }
        this.log.info(myPath + ` :  ${JSON.stringify(obj)}`);


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

import Cell from './Cell';
import {SigsByConstName} from './FlatModule';
import Yosys from './YosysModel';
import _ = require('lodash');
import { ElkModel } from './elkGraph';

const expandedPinNameRegex = /([^\s\(]+)\s?(?:\((.*)\))?/;
// for a pin that looks like PIN_NAME (PIN_NUMBERS), it will
// capture the PIN_NAME and the optional PIN_NUMBERS in separate groups

function extractPinNames(key: string) {
    var keyMatch = key.match(expandedPinNameRegex);
    if (keyMatch[2] === undefined) {
        return [keyMatch[1], undefined];
    } else {
        return [keyMatch[2], keyMatch[1]];
    }
}

export class Port {
    public parentNode?: Cell;
    private key: string;
    private insideKey: string;
    private value: number[] | Yosys.Signals;

    constructor(key: string, value: number[] | Yosys.Signals) {
        var pin_names = extractPinNames(key);
        this.key = pin_names[0];
        this.insideKey = pin_names[1];

        this.value = value;
    }

    public get Key() {
        return this.key;
    }

    public get InsideKey() {
        return this.insideKey;
    }

    public keyIn(pids: string[]): boolean {
        return _.includes(pids.map((o) => extractPinNames(o)[0]), this.key);
    }

    public maxVal() {
        return _.max(_.map(this.value, (v) => Number(v)));
    }

    public valString() {
        return ',' + this.value.join() + ',';
    }

    public findConstants(sigsByConstantName: SigsByConstName,
                         maxNum: number,
                         constantCollector: Cell[]): number {
        let constNameCollector = '';
        let constNumCollector: number[] = [];
        const portSigs: Yosys.Signals = this.value;
        portSigs.forEach((portSig, portSigIndex) => {
            // is constant?
            if (portSig === '0' || portSig === '1') {
            maxNum += 1;
            constNameCollector += portSig;
            // replace the constant with new signal num
            portSigs[portSigIndex] = maxNum;
            constNumCollector.push(maxNum);
            // string of constants ended before end of p.value
            } else if (constNumCollector.length > 0) {
                this.assignConstant(
                    constNameCollector,
                    constNumCollector,
                    portSigIndex,
                    sigsByConstantName,
                    constantCollector);
                // reset name and num collectors
                constNameCollector = '';
                constNumCollector = [];
            }
        });
        if (constNumCollector.length > 0) {
            this.assignConstant(
                constNameCollector,
                constNumCollector,
                portSigs.length,
                sigsByConstantName,
                constantCollector);
        }
        return maxNum;
    }

    public getGenericElkPort(
        index: number,
        templatePorts: any[],
        dir: string,
        genericWidth: number,
        extraLabelPadding: number,
    ): ElkModel.Port {
        const nkey = this.parentNode.Key;
        const type = this.parentNode.getTemplate()[1]['s:type'];
        if (index === 0) {
            const ret: ElkModel.Port = {
                id: nkey + '.' + this.key,
                width: 1,
                height: 1,
                x: Number(templatePorts[0][1]['s:x']),
                y: Number(templatePorts[0][1]['s:y']),
            };

            if ((type === 'generic' || type === 'join') && dir === 'in') {
                ret.labels = [{
                    id: nkey + '.' + this.key + '.label',
                    text: this.key,
                    x: Number(templatePorts[0][2][1].x) - 10,
                    y: Number(templatePorts[0][2][1].y) - 6,
                    width: (6 * this.key.length),
                    height: 11,
                }];
            }

            if ((type === 'generic' || type === 'split') && dir === 'out') {
                ret.labels = [{
                    id: nkey + '.' + this.key + '.label',
                    text: this.key,
                    x: Number(templatePorts[0][2][1].x) - 10,
                    y: Number(templatePorts[0][2][1].y) - 6,
                    width: (6 * this.key.length),
                    height: 11,
                }];
            }

            if (type === 'generic') {
                if (dir === 'out') {
                    ret.x = genericWidth;
                    ret.labels[0].x = genericWidth;
                }
                ret.labels[0].width += extraLabelPadding;
            }

            return ret;
        } else {
            const gap: number = Number(templatePorts[1][1]['s:y']) - Number(templatePorts[0][1]['s:y']);
            const ret: ElkModel.Port = {
                id: nkey + '.' + this.key,
                width: 1,
                height: 1,
                x: Number(templatePorts[0][1]['s:x']),
                y: (index) * gap + Number(templatePorts[0][1]['s:y']),
            };
            if (type === 'generic') {
                ret.labels = [{
                    id: nkey + '.' + this.key + '.label',
                    text: this.key,
                    x: Number(templatePorts[0][2][1].x) - 10,
                    y: Number(templatePorts[0][2][1].y) - 6,
                    width: (6 * this.key.length),
                    height: 11,
                }];
                if (dir === 'out') {
                    ret.x = genericWidth;
                    ret.labels[0].x = genericWidth;
                }
                ret.labels[0].width += extraLabelPadding;
            }
            return ret;
        }
    }

    private assignConstant(nameCollector: string,
                           constants: number[],
                           currIndex: number,
                           signalsByConstantName: SigsByConstName,
                           constantCollector: Cell[]) {
        // we've been appending to nameCollector, so reverse to get const name
        const constName = nameCollector.split('').reverse().join('');
        // if the constant has already been used
        if (signalsByConstantName.hasOwnProperty(constName)) {
            const constSigs: number[] = signalsByConstantName[constName];
            // go back and fix signal values
            const constLength = constSigs.length;
            constSigs.forEach((constSig, constIndex) => {
                // i is where in port_signals we need to update
                const i: number = currIndex - constLength + constIndex;
                this.value[i] = constSig;
            });
        } else {
            constantCollector.push(Cell.fromConstantInfo(constName, constants));
            signalsByConstantName[constName] = constants;
        }
    }
}

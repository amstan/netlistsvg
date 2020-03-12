"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Cell_1 = require("./Cell");
var _ = require("lodash");
var expandedPinNameRegex = /([^\s\(]+)\s?(?:\((.*)\))?/;
// for a pin that looks like PIN_NAME (PIN_NUMBERS), it will
// capture the PIN_NAME and the optional PIN_NUMBERS in separate groups
function extractPinNames(key) {
    var keyMatch = key.match(expandedPinNameRegex);
    if (keyMatch[2] === undefined) {
        return [keyMatch[1], undefined];
    }
    else {
        return [keyMatch[2], keyMatch[1]];
    }
}
var Port = /** @class */ (function () {
    function Port(key, value) {
        var pin_names = extractPinNames(key);
        this.key = pin_names[0];
        this.insideKey = pin_names[1];
        this.value = value;
    }
    Object.defineProperty(Port.prototype, "Key", {
        get: function () {
            return this.key;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Port.prototype, "InsideKey", {
        get: function () {
            return this.insideKey;
        },
        enumerable: true,
        configurable: true
    });
    Port.prototype.keyIn = function (pids) {
        return _.includes(pids.map(function (o) { return extractPinNames(o)[0]; }), this.key);
    };
    Port.prototype.maxVal = function () {
        return _.max(_.map(this.value, function (v) { return Number(v); }));
    };
    Port.prototype.valString = function () {
        return ',' + this.value.join() + ',';
    };
    Port.prototype.findConstants = function (sigsByConstantName, maxNum, constantCollector) {
        var _this = this;
        var constNameCollector = '';
        var constNumCollector = [];
        var portSigs = this.value;
        portSigs.forEach(function (portSig, portSigIndex) {
            // is constant?
            if (portSig === '0' || portSig === '1') {
                maxNum += 1;
                constNameCollector += portSig;
                // replace the constant with new signal num
                portSigs[portSigIndex] = maxNum;
                constNumCollector.push(maxNum);
                // string of constants ended before end of p.value
            }
            else if (constNumCollector.length > 0) {
                _this.assignConstant(constNameCollector, constNumCollector, portSigIndex, sigsByConstantName, constantCollector);
                // reset name and num collectors
                constNameCollector = '';
                constNumCollector = [];
            }
        });
        if (constNumCollector.length > 0) {
            this.assignConstant(constNameCollector, constNumCollector, portSigs.length, sigsByConstantName, constantCollector);
        }
        return maxNum;
    };
    Port.prototype.getGenericElkPort = function (index, templatePorts, dir, genericWidth, extraLabelPadding) {
        var nkey = this.parentNode.Key;
        var type = this.parentNode.getTemplate()[1]['s:type'];
        if (index === 0) {
            var ret = {
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
        }
        else {
            var gap = Number(templatePorts[1][1]['s:y']) - Number(templatePorts[0][1]['s:y']);
            var ret = {
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
    };
    Port.prototype.assignConstant = function (nameCollector, constants, currIndex, signalsByConstantName, constantCollector) {
        var _this = this;
        // we've been appending to nameCollector, so reverse to get const name
        var constName = nameCollector.split('').reverse().join('');
        // if the constant has already been used
        if (signalsByConstantName.hasOwnProperty(constName)) {
            var constSigs = signalsByConstantName[constName];
            // go back and fix signal values
            var constLength_1 = constSigs.length;
            constSigs.forEach(function (constSig, constIndex) {
                // i is where in port_signals we need to update
                var i = currIndex - constLength_1 + constIndex;
                _this.value[i] = constSig;
            });
        }
        else {
            constantCollector.push(Cell_1.default.fromConstantInfo(constName, constants));
            signalsByConstantName[constName] = constants;
        }
    };
    return Port;
}());
exports.Port = Port;

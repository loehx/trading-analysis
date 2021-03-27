const { range } = require('@tensorflow/tfjs-core');
var moment = require('moment');

const util = module.exports = {

    oneHot(value, range, ignoreOverflow) {
        const [ from, to ] = range;
        const r = new Array(to - from + 1).fill(0);

        if (typeof value === 'undefined') {
            throw "util.oneHot(..) failed: value is undefined";
        }

        if (ignoreOverflow && (value > to || value < from)) {
            return r;
        }

        if (value > to) {
            throw "util.oneHot(..) failed: value " + value + " is too big to fit in range: [" + range.join(', ') + ']';
        }
        if (value < from) {
            throw "util.oneHot(..) failed: value " + value + " is too small to fit in range: [" + range.join(', ') + ']';
        }
        const i = Math.round(value) - from;
        r[i] = 1;
        return r;
    },

    range(start, end, step = 1) {
        const count = end - start;
        const result = new Array((count/step) + 1);
        for(let i = start; i <= end; i+=step) {
            result[i - start] = i;
        }
        return result;
    }

};
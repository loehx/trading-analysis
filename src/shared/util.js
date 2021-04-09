const { memoize } = require('lodash');
var moment = require('moment');
const { ensure } = require('./assertion');
const _ = require('lodash');

const util = module.exports = {

    oneHot(value, range, ignoreOverflow) {
        const [from, to] = range;
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
        const result = new Array();
        for (let i = start; i <= end; i += step) {
            result.push(i);
        }
        return result;
    },

    avg(args) {
        ensure(args);
        let avg = 0;
        for (let i = 0; i < args.length; i++) {
            avg += args[i]/args.length;
        }
        return this.round(avg, 10);
    },

    avgBy(args, fn) {
        ensure(args);
        let avg = 0;
        for (let i = 0; i < args.length; i++) {
            avg += fn(args[i])/args.length;
        }
        return this.round(avg, 10);
    },

    minBy(args, fn) {
        ensure(args, Array);
        let min = Infinity;
        for (let i = 0; i < args.length; i++) {
            const n = fn(args[i]);
            if (n < min) {
                min = n;
            }
        }
        return min;
    },

    maxBy(args, fn) {
        ensure(args, Array);
        let max = -Infinity;
        for (let i = 0; i < args.length; i++) {
            const n = fn(args[i]);
            if (n > max) {
                max = n;
            }
        }
        return max;
    },

    memoize(fn) {
        return _.memoize(fn, (...a) => new Array(a).join('_'));
    },

    round(n, precision) {
        return _.round(n, precision);
    }
};
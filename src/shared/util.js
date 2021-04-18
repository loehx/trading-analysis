const { memoize, result } = require('lodash');
var moment = require('moment');
const { ensure } = require('./assertion');
const _ = require('lodash');
const prettyMilliseconds = require('pretty-ms');

const util = module.exports = {

    oneHot(value, range, ignoreOverflow, stepSize = 1) {
        const [from, to] = range;
        const size = (to - from) / stepSize;
        const r = new Array(size + 1).fill(0);

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
        const i = Math.round((value - from) / stepSize);
        r[i] = 1;
        return r;
    },

    reverseOneHot(prediction, range, stepSize = 1, resultCount = 5) {
        const [from, to] = range;
        const result = [];

        for (let i = 0; i < prediction.length; i++) {
            const possibility = util.round(prediction[i], 3);
            const a = from + (stepSize * i);
            const b = a + stepSize;
            if (possibility > 0) {
                result.push({
                    range: a + ' - ' + b,
                    possibility
                });
            }
        }

        result.sort((a,b) => b.possibility - a.possibility);
        return result.slice(0, resultCount);
    },

    range(start, end, step = 1) {
        const result = new Array();
        for (let i = start; i <= end; i += step) {
            result.push(util.round(i, 10));
        }
        return result;
    },

    sumBy(args, fn) {
        ensure(args);
        let sum = 0;
        for (let i = 0; i < args.length; i++) {
            sum += fn(args[i]);
        }
        return util.round(sum, 10);
    },

    avg(args) {
        ensure(args);
        let avg = 0;
        for (let i = 0; i < args.length; i++) {
            avg += args[i]/args.length;
        }
        return util.round(avg, 10);
    },

    avgBy(args, fn) {
        ensure(args);
        let avg = 0;
        for (let i = 0; i < args.length; i++) {
            avg += fn(args[i])/args.length;
        }
        return util.round(avg, 10);
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

    round(n, precision = 0) {
        const res = _.round(n, precision);
        if (isNaN(res)) {
            return n;
        }
        return res;
    },

    timeout(milliseconds) {
        return new Promise(function(resolve) {
            setTimeout(function() {
                resolve();
            }, milliseconds);
        });
    },

    crossJoinByProps(obj) {

        let result = [{}]; 

        for (const key in obj) {
            if (Object.hasOwnProperty.call(obj, key)) {
                const value = obj[key];
                if (Array.isArray(value)) {
                    const newResult = new Array(result.length * value.length);
                    newResult.length = 0;
                    value.forEach(v => {
                        result.forEach(r => {
                            newResult.push({
                                ...r,
                                [key]: v
                            });
                        });
                    })
                    result = newResult;
                }
                else {
                    result.forEach(r => r[key] = value);
                }
            }
        }

        return result;
    },

    humanizeDuration(from, to) {
        const ms = (to ?? (from * 2)) - from;
        return prettyMilliseconds(ms, {
            compact: true
        })
    }
};
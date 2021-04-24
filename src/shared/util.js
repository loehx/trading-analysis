const { memoize, result } = require('lodash');
var moment = require('moment');
const { ensure } = require('./assertion');
const _ = require('lodash');
const prettyMilliseconds = require('pretty-ms');
const { args } = require('commander');

const util = module.exports = {

    oneHot(value, range, ignoreOverflow, arraySize) {
        const [from, to] = range;
        const r = new Array(arraySize ? arraySize : (to - from + 1)).fill(0);
        const stepSize = (to - from + 1) / r.length;
        console.log(value, range, ignoreOverflow, arraySize, 'stepSize:', stepSize);

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
        const i = Math.floor((value - from) / stepSize);
        r[i] = 1;
        return r;
    },

    reverseOneHot(prediction, range, resultCount = 5) {
        const [from, to] = range;
        const result = [];
        const stepSize = (to - from) / prediction.length;

        for (let i = 0; i < prediction.length; i++) {
            const possibility = util.round(prediction[i], 3);
            const a = from + (stepSize * i);
            const b = a + stepSize;
            if (possibility > 0) {
                result.push({
                    r: [a, b],
                    p: possibility
                });
            }
        }

        result.sort((a,b) => b.p - a.p);
        return result.slice(0, resultCount);
    },

    scaleMinMax(arr, zeroOneToOne) {
        let min = Infinity;
        let max = -Infinity;
        const len = arr.length;
        for (let i = 0; i < len; i++) {
            const n = arr[i];
            if (n < min) {
                min = n;
            }
            if (n > max) {
                max = n;
            }
        }

        if (zeroOneToOne) {
            min = Math.min(min, max * -1);
            max = Math.min(max, min * -1);
            const range = max - min;
            return arr.map(a => (a - min) / range * 2 - 1);
        }

        const range = max - min;
        return arr.map(a => (a - min) / range);
    },

    scaleByMean(arr, period) {
        const result = new Array(arr.length);
        result.length = 0;

        period = Math.min(period, arr.length);
        period = Math.round(period / 2);

        for (let i = 0; i < arr.length; i++) {
            const val = arr[i];
            
            let avg = 0;
            let max = (arr.length - 1);
            let from = i - period;
            let to = i + period;
            
            if (from < 0) {
                to = Math.min(to + from, max);
                from = 0;
            }
            else if (to > max) {
                from = Math.max(from + (to - max), 0);
                to = max;
            }

            for (let a = from; a <= to; a++) {
                avg += arr[a] / (to - from + 1);
            }

            result.push(util.round(val - avg, 6));
        }
        return result;
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

    min(args) {
        return this.minBy(args, d => d);
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

    max(args) {
        return this.maxBy(args, d => d);
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
    },

    fibonacci(max) {
        const seq = [];
        let pre = 0;
        for(let i = 1; i <= max; i += pre) {
            pre = i - pre;
            seq.push(i);
        }
        return seq;
    }
};
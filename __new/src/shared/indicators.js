
const technicalindicators = require('technicalindicators');
const { assert, ensure } = require('./assertion');
const {
	ATR,
	SMA,
	RSI,
	WMA
} = technicalindicators;

const CANDLE_PATTERNS = {
	bullish: 4,
	bearish: 4,
	abandonedbaby: 2,
	doji: 2,
	bearishengulfingpattern: 2,
	bullishengulfingpattern: 2,
	darkcloudcover: 2,
	downsidetasukigap: 2,
	dragonflydoji: 2,
	gravestonedoji: 2,
	bullishharami: 2,
	bearishharami: 2,
	bullishharamicross: 2,
	bearishharamicross: 2,
	eveningdojistar: 2,
	eveningstar: 2,
	morningdojistar: 2,
	morningstar: 2,
	bullishmarubozu: 2,
	bearishmarubozu: 2,
	piercingline: 2,
	bullishspinningtop: 2,
	bearishspinningtop: 2,
	threeblackcrows: 2,
	threewhitesoldiers: 2,
};

module.exports = {

	getSMA(values) {
		ensure(values, Array);
		assert(() => values.length > 0);
		return SMA.calculate({
			period: values.length,
			values
		})[0];
	},

	getSMAs(period, values) {
		return [
			...new Array(period - 1).fill(null),
			...SMA.calculate({
				period,
				values
			})
		];
	},

	getWMA(values) {
		ensure(values, Array);
		assert(() => values.length > 0);
		return WMA.calculate({
			period: values.length,
			values
		})[0];
	},

	getWMAs(period, values) {
		return [
			...new Array(period - 1).fill(null),
			...WMA.calculate({
				period,
				values
			})
		];
	},

	getRSI(values) {
		ensure(values, Array);
		assert(() => values.length > 0);
		const r = RSI.calculate({
			period: values.length - 1,
			values
		})
		assert(() => r.length === 1);
		return r[0];
	},

	getRSIs(period, values) {
		return [
			...new Array(period).fill(null),
			...RSI.calculate({
				period,
				values
			})
		];
	},

	getATR(highs, lows, closes) {
		ensure(highs, Array);
		ensure(lows, Array);
		ensure(closes, Array);
		assert(() => highs.length >= 2);
		assert(() => highs.length === lows.length);
		assert(() => lows.length === closes.length);
		return ATR.calculate({
			period: highs.length - 1,
			high: highs,
			low: lows,
			close: closes
		})[0]
	},

	getATRs(period, highs, lows, closes) {
		return [
			...new Array(period).fill(null),
			...ATR.calculate({
				period,
				high: highs,
				low: lows,
				close: closes
			})
		];
	},


	getCandlePattern(open, high, close, low) {
		ensure(open, Array);
		ensure(high, Array);
		ensure(close, Array);
		ensure(low, Array);
		assert(() => open.length >= 4);
		assert(() => open.length === high.length);
		assert(() => high.length === close.length);
		assert(() => close.length === low.length);
		const result = {};

		for (let name in CANDLE_PATTERNS) {

			const fn = technicalindicators[name];
			ensure(fn);

			result[name] = fn({
				open,
				high,
				close,
				low,
			}) ? 1 : 0;
		}

		return result;
	},


	getCandlePatterns(open, high, close, low) {
		ensure(open, Array);
		ensure(high, Array);
		ensure(close, Array);
		ensure(low, Array);
		assert(() => open.length === high.length);
		assert(() => high.length === close.length);
		assert(() => close.length === low.length);
		const total = open.length;
		const patternCount = Object.values(CANDLE_PATTERNS).length;
		const result = {};

		for (let name in CANDLE_PATTERNS) {
			const period = CANDLE_PATTERNS[name];

			const res = result[name] = new Array(total).fill(null);

			const fn = technicalindicators[name];
			ensure(fn);

			for (let i = 0; i < total; i++) {
				if (i >= period) {
					const r = fn({
						open: open.slice(i - period, i + 1),
						high: high.slice(i - period, i + 1),
						close: close.slice(i - period, i + 1),
						low: low.slice(i - period, i + 1),
					})

					ensure(r, Boolean);
					res[i] = r ? 1 : 0;
				}
			}
		}

		return result;
	}

};

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

	getSMA(period, values) {
		return [
			...new Array(period - 1).fill(null),
			...SMA.calculate({
				period,
				values
			})
		];
	},

	getWMA(period, values) {
		return [
			...new Array(period - 1).fill(null),
			...WMA.calculate({
				period,
				values
			})
		];
	},

	getRSI(period, values) {
		return [
			...new Array(period).fill(null),
			...RSI.calculate({
				period,
				values
			})
		];
	},

	getATR(period, highs, lows, closes) {
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
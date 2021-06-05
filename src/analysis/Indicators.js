const util = require("../shared/util");

const self = module.exports = {

	BELOW_SMA: (data, period, draw) => data.calculate('SMA', period) < data.close,

	BELOW_ATR: (data, period, draw) => {

		const atr = data.calculate('ATR', period) * 1.5;
		const sma = data.calculate('SMA', period);
		const line = sma - atr;
		draw('buybelow', line)

		return data.close < line;
	},

	CANDLE_RATIO: (data, period, draw) => {
		const prev = data.getPrev(period, true);
		const trend = util.avgBy(prev, d => d.progress > 0 ? 0 : 1);
		draw('trend', trend);
		return trend;
	},

	RSI: (data, period, draw) => 1 - (data.calculate('RSI', period) / 100),

	RSI_80: (data, period, draw) => data.calculate('RSI', period) > 80,

	RSI_70: (data, period, draw) => data.calculate('RSI', period) > 70,

	PROGRESS: (data, period, draw) => draw('PROGRESS', data.calculate('PROGRESS', period)),

	MACD: (data, period, draw) => draw('MACD1', data.calculate('MACD', period)[0]) * 100,

	ADX: (data, period, draw) => draw('ADX1', data.calculate('ADX', period)[0] / 100),

	AwesomeOscillator: (data, period, draw) => draw('AwesomeOscillator', data.calculate('AwesomeOscillator', period) / 100),

	//AWESOME_INDICATOR: (...args) => util.avgBy([self.ADX, self.MINMAX, self.CANDLES], f => f(...args)),

	MINMAX: (data, period, draw) => {
		const max = data.calculate('MAX', period);
		const min = data.calculate('MIN', period);
		const minmax = max - min;
		const pos = data.close - min;
		draw('minmax', minmax);
		draw('relative close', pos);
		return 1 - (pos / minmax) || 0;
	},

	UNNAMED: (data, period, draw) => {
		if (data.index < (period * 3)) {
			return 0;
		}
		const ema1 = data.calculate('EMA', period);
		const ema2 = data.jump(-4).calculate('EMA', period);
		const ema3 = data.jump(-8).calculate('EMA', period);
		
		draw('ema1', ema1)
		draw('ema2', ema2)
		draw('ema3', ema3)
		
		return ema1 > ema2 && ema2 < ema3;

		return self.ADX(data, period, draw);
	},

	//
	// WATCH: https://www.youtube.com/watch?v=kr_kGf7fENI
	//
	MACD2: (data, period, draw) => {
		if (data.index < 100) {
			return 0;
		}
		const ema1 = data.calculate('EMA', 100);
		const ema2 = data.jump(-50).calculate('EMA', 100);

		if (ema1 < ema2) {
			return;
		}

		if (ema1 > data.close) {
			return;
		}

		const macd = data.calculate('MACD', period);
		if (macd[0] > 0 || macd[1] > 0) {
			return;
		}

		const prevmacd = data.prev.calculate('MACD', period);
		if (prevmacd[0] > 0 || prevmacd[1] > 0) {
			return;
		}

		// const prevprevmacd = data.jump(-2).calculate('MACD', period);
		// if (prevprevmacd[0] > 0 || prevprevmacd[1] > 0) {
		// 	return;
		// }

		const crossing = macd[0] > macd[1] && prevmacd[0] < prevmacd[1];
		if (!crossing) {
			return;
		}

		console.log('FOUND:', data.toString());

		//draw('macd[0]', macd[0]);

		return 1;
	},

	RANDOM: (data, period, draw) => Math.random() > .5,

}

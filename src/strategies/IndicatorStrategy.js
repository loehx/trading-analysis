const Indicators = require("../analysis/Indicators");
const { util, assert } = require("../shared");
const { TradeOptions } = require("../trading");




module.exports = class IndicatorStrategy {

	constructor(options) {
		this.config = {
			maxOpenTrades: 10,
			name: '</src/analysis/Indicators.js>',
			minSignal: .5,
			...options,
		};
		assert(() => Indicators[options.name]);
		this.func = Indicators[options.name];
	}

	tick({ data, buy, trades, draw }) {
		
		const { maxOpenTrades, minSignal, tpFactor, period, slPeriod } = this.config;

		let signal = this.func(data, period, draw) ?? 0;
		if (typeof signal === 'Boolean') {
			signal = signal ? 1 : 0;
		}

		const openTrades = trades.filter(t => t.isOpen);
		openTrades.forEach((t) => {
			draw('STOPLOSS', t.stopLossPrice);
			draw('TAKEPROFIT', t.takeProfitPrice);
		})

		if (signal < minSignal) {
			return false;
		}

		if (maxOpenTrades < openTrades.length) {
			return false;
		}

		const min = data.calculate('MIN', slPeriod);
		draw('min', min);
		draw('tp', data.close + ((data.close - min) * tpFactor));
		return buy({
			...this.config,
			fixedStopLoss: min,
			fixedTakeProfit: data.close + ((data.close - min) * tpFactor)
		});
	}

	toString() {
		return `[IndicatorStrategy(${util.toShortString(this.config)})]`
	}

}

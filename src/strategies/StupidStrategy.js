const { util } = require("../shared");
const { TradeOptions } = require("../trading");




module.exports = class MACDStrategy {

	constructor(options) {
		this.config = {
			downfall: 0.01,
			maxOpenTrades: Infinity,
			period: 10,
			atrPeriod: 10,
			atrMultiplier: 2,
			...options,
		};
	}

	tick({ series, data, buy, log, trades, draw }) {
		
		const { maxOpenTrades, downfall, leverage, period, atrMultiplier, atrPeriod } = this.config;
		if (!this.lastBuy) {
			this.lastBuy = data;
			return false;
		}

		const low = util.minBy(data.getPrev(500).slice(0, 500-50), d => d.low);
		draw('low', low);
		if (data.close < low) {
			return;
		}


		const openTrades = trades.filter(t => t.isOpen);
		openTrades.forEach((t) => {
			draw('STOPLOSS', t.stopLossPrice);
			draw('TAKEPROFIT', t.takeProfitPrice);
		})

		if ((data.index - this.lastBuy.index) < period) {
			return;
		}

		if (maxOpenTrades < openTrades.length) {
			return false;
		}

		if (data.index < 100) {
			return;
		}

		// const tsma = data.calculate('SMA', 100);
		// const prev_tsma = data.prev.calculate('SMA', 100);
		// if (tsma <= prev_tsma) {
		// 	return;
		// }
		const atr = data.calculate('ATR', atrPeriod) * atrMultiplier;
		const sma = data.calculate('SMA', period);

		const buyBelow = sma - atr;
		draw('buyBelow', buyBelow);
		if (data.low > buyBelow) {
			return;
		}
		
		this.lastBuy = data;

		return buy({
			...this.config
		});
	}

	toString() {
		return `[MACDStrategy(${util.toShortString(this.config)})]`
	}

}

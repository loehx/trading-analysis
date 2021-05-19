const { util } = require("../shared");
const { TradeOptions } = require("../trading");




module.exports = class ScalpingStrategy {

	constructor(options) {
		this.config = {
			leverage: 20,
			tpFactor: 1.5,
			stopLoss: 0.5,
			maxOpenTrades: Infinity,
			...options,
		};
	}

	tick({ series, data, buy, log, trades }) {
		const prev = data.prev;
		const { maxOpenTrades } = this.config;
		if (!prev) {
			return false;
		}
		const ema25 = data.calculate('EMA', 25);
		const ema50 = data.calculate('EMA', 50);
		const ema100 = data.calculate('EMA', 100);

		const prev_ema25 = prev.calculate('EMA', 25);
		const prev_ema50 = prev.calculate('EMA', 50);
		const prev_ema100 = prev.calculate('EMA', 100);

		const openTrades = trades.filter(t => t.isOpen);
		if (data.close < ema100 && openTrades.length > 0) {
			openTrades.forEach(t => t.close());
		}

		if (openTrades.length >= maxOpenTrades) {
			return;
		}

		const sma300 = data.calculate('SMA', 300);
		const prev_sma300 = prev.calculate('SMA', 300);
		if (sma300 < prev_sma300) {
			return;
		}
		// const sma1000 = data.calculate('SMA', 1000);
		// const prev_sma1000 = prev.calculate('SMA', 1000);
		// if (sma1000 < prev_sma1000) {
		// 	return;
		// }

		const upTrending = ema100 > prev_ema100 && ema50 > prev_ema50 && ema25 > prev_ema25;
		if (!upTrending) {
			return false;
		}

		const emaPattern = ema25 > ema50 && ema50 > ema100;
		const breakThrough = data.close > ema25 && data.open < ema25;
		if (!emaPattern || !breakThrough) {
			return false;
		}

		const ema25to50 = ema25 / ema50;
		const ema50to100 = ema50 / ema100;
		if (ema25to50 > 1.001 || ema50to100 > 1.001) {
			return false;
		}

		if (data.open < ema50) {
			return false;
		}

		//console.log('MATCH: ', data.toString());

		const { leverage, tpFactor, stopLoss } = this.config;


		const slFactor = (1 - (stopLoss / 20));
		const sl = data.open * slFactor;
		return buy({
			...TradeOptions.ETORO_FOREX,
			leverage,
			fixedStopLoss: sl,
			fixedTakeProfit: data.close + ((data.close - sl) * tpFactor),
		});
	}

	toString() {
		const { leverage, tpFactor, stopLoss } = this.config;

		return `[ScalpingStrategy(x${leverage} tp-factor: ${tpFactor} sl: ${stopLoss})]`
	}

}

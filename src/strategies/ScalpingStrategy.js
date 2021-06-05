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

	tick({ series, data, buy, log, trades, draw }) {
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

		draw('ema25', ema25);
		draw('ema50', ema50);
		draw('ema100', ema100);

		const openTrades = trades.filter(t => t.isOpen);
		openTrades.forEach((t) => {
			draw('SL-'+t.openedAt.toString(), t.stopLossPrice);
			draw('TP-'+t.openedAt.toString(), t.takeProfitPrice);
		})
		if (openTrades.length > 0 && data.close < ema50) {
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
		if (ema25to50 < 1.0001 || ema50to100 < 1.0001) {
			return false;
		}

		if (data.getPrev(10).filter(d => d.close < ema100).length > 0) {
			return false;
		}

		if (data.open < ema50 || data.close < ema50) {
			return false;
		}

		//console.log('MATCH: ', data.toString());

		const { leverage, tpFactor, stopLoss } = this.config;


		const slFactor = (1 - (stopLoss / leverage));
		const fixedStopLoss = Math.max(ema50, data.open * slFactor);
		const fixedTakeProfit = data.close + ((data.close - fixedStopLoss) * tpFactor);
		// draw('fixedTakeProfit', fixedTakeProfit);
		return buy({
			...TradeOptions.ETORO_FOREX,
			leverage,
			fixedStopLoss,
			fixedTakeProfit,
		});
	}

	toString() {
		const { leverage, tpFactor, stopLoss } = this.config;

		return `[ScalpingStrategy(x${leverage} tp-factor: ${tpFactor} sl: ${stopLoss})]`
	}

}

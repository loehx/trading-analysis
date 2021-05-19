
const { Symbols, Data } = require("../../src/data");
const { Log } = require("../../src/shared/log");
const util = require("../../src/shared/util");
const moment = require('moment');
const { TradeOptions } = require("../../src/trading");
const TradeAnalysis = require("../../src/trading/tradeAnalysis");
const { dropLast } = require("lodash/fp");

(async () => {
	const log = Log.consoleLog('ManualTest');
	const analysis = new TradeAnalysis(log);

	await analysis.runStatistic(
		Symbols.EURUSD_HOURLY_HISTORICAL,
		{
			...TradeOptions.ETORO_FOREX,
			stopLoss: [.1, .2, .5], // util.range(0.4, 1.0, 0.2),
			takeProfit: [.1, .2, .5], // util.range(0.4, 1.0, 0.2),
			maxDays: [10],
			leverage: 30,
			buyIndicator: [
				d => {
					const prev = d.prev;
					if (!prev) {
						return false;
					}
					const ema25 = d.calculate('EMA', 25);
					const ema50 = d.calculate('EMA', 50);
					const ema100 = d.calculate('EMA', 100);
					const prev_ema25 = prev.calculate('EMA', 25);
					const prev_ema50 = prev.calculate('EMA', 50);
					const prev_ema100 = prev.calculate('EMA', 100);

					const upTrending = ema100 > prev_ema100 && ema50 > prev_ema50 && ema25 > prev_ema25;
					if (!upTrending) {
						return false;
					}

					const emaPattern = ema25 > ema50 && ema50 > ema100;
					const breakThrough = d.close > ema25 && d.open < ema25;
					if (!emaPattern || !breakThrough) {
						return false;
					}

					if (d.open < ema50) {
						return false;
					}

					console.log('MATCH: ', d.toString());

					return true;
					
				}
			]
		});
})();


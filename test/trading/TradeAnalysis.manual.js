
const { Symbols } = require("../../src/data");
const { Log } = require("../../src/shared/log");
const util = require("../../src/shared/util");
const moment = require('moment');
const { TradeOptions } = require("../../src/trading");
const TradeAnalysis = require("../../src/trading/tradeAnalysis");

(async () => {
	const log = Log.consoleLog('ManualTest');
	const analysis = new TradeAnalysis(log);

	await analysis.runStatistic(
		Symbols.EURUSD_HOURLY_HISTORICAL,
		{
			...TradeOptions.etoroIndices,
			stopLoss: 1, // util.range(0.4, 1.0, 0.2),
			takeProfit: 1, // util.range(0.4, 1.0, 0.2),
			maxDays: [1,2,3,4,5,6,7,14,30],
			leverage: 20,
			buyIndicator: [
				...util.range(20, 120, 5).map((p) =>  new Function('return arguments[0].getRSI(' + p + ') < 40')),
				...util.range(20, 120, 5).map((p) =>  new Function('return arguments[0].getRSI(' + p + ') < 45')),
				...util.range(20, 120, 5).map((p) =>  new Function('return arguments[0].getRSI(' + p + ') < 50')),
			]
		});
})();



const { Symbols } = require("../../src/data");
const { Log } = require("../../src/shared/log");
const { TradeOptions } = require("../../src/trading");
const TradeAnalysis = require("../../src/trading/tradeAnalysis");

(async () => {
	const log = Log.consoleLog('ManualTest');
	const analysis = new TradeAnalysis(log);

	await analysis.getNasdaqStatistic(
		Symbols.NASDAQ_HOURLY_HISTORICAL,
		TradeOptions.forEtoroIndices({}));

	await analysis.getNasdaqStatistic(
		Symbols.EURUSD_HOURLY_HISTORICAL,
		TradeOptions.forEtoroIndices({}));
})();


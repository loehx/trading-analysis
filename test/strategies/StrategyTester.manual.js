
const { Symbols, Data, DataFactory } = require("../../src/data");
const { Log } = require("../../src/shared/log");
const util = require("../../src/shared/util");
const moment = require('moment');
const { TradeOptions } = require("../../src/trading");
const TradeAnalysis = require("../../src/trading/tradeAnalysis");
const { dropLast } = require("lodash/fp");
const StrategyTester = require("../../src/strategies/StrategyTester");
const ScalpingStrategy = require("../../src/strategies/scalpingStrategy");
const { plot2d } = require("../../src/shared");

(async () => {
	const log = Log.consoleLog('Manual');
	const factory = new DataFactory(log);
	const series = await factory.getDataSeries(Symbols.EURUSD_HOURLY_HISTORICAL, { limit: 4000 });
	const tester = new StrategyTester(log);

	const stats = await tester.runSimulation({
		strategy: util.crossJoinByProps({
			leverage: 20,
			tpFactor: [1, 1.5, 2, 2.5, 3],//util.range(1, 5, .5),
			stopLoss: [0.01, 0.02, 0.05, 0.1, 0.15, 0.2],
			maxOpenTrades: 5,
		}).map(o => new ScalpingStrategy(o)),
		series
	})

	stats.sort((a,b) => b.netProfit - a.netProfit);

	console.log(`#no \ttitle \tnetProfit \tnetProfitPerDay \ttrades}`);
	stats.slice(0, 10).forEach((stat, i) => {
		console.log(`#${i+1} \t${stat.title} \t${stat.netProfit} \t${stat.netProfitPerDay} \t${stat.trades.length}`);
	})
	
	plot2d(...stats.slice(0,5).map(stat => {
		const { series, title, trades, profitGraph, tradeGraph, netProfit, netProfitPerDay } = stat;

		return {
			x: series.map(k => k.timestamp),
			title: title +  ' / profit: +' + (netProfit * 100).toFixed(3) + '% / daily: +' + (netProfitPerDay * 100).toFixed(3) + '%' + ' / trades: ' + trades.length,
			profitGraph,
			series: series.toArray(),
			tradeGraph,
			scaleMinMax: true,
		}
	}))

})();


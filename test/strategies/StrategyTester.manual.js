
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
	const series = await factory.getDataSeries(Symbols.EURUSD_MINUTELY_2020, { limit: 3000 });
	const tester = new StrategyTester(log);

	const stats = await tester.runSimulation({
		strategy: util.crossJoinByProps({
			leverage: 1,
			tpFactor: [0.1, 0.5, 1, 1.5, 2, 2.5, 3],//util.range(1, 5, .5),
			stopLoss: [0.01, 0.02, 0.05, 0.1, 0.15, 0.2],
			maxOpenTrades: 1,
		}).map(o => new ScalpingStrategy(o)),
		series
	})

	stats.sort((a,b) => b.netProfit - a.netProfit);

	console.log(`#no \ttitle \tnetProfit \tnetProfitPerDay \ttrades}`);
	stats.slice(0, 10).forEach((stat, i) => {
		console.log(`#${i+1} \t${stat.title} \t${stat.netProfit} \t${stat.netProfitPerDay} \t${stat.trades.length}`);
	})
	
	plot2d(
		{ 
			title: 'ScalpingStrategy for ' + series.toString(),
			x: stats.map(k => k.title),
			netProfit: stats.map(k => k.netProfit),
			netProfitPerDay: stats.map(k => k.netProfitPerDay),
			trades: stats.map(k => k.trades.length),
			scaleMinMax: true,
		},
		...stats.slice(0,5).map(stat => {
		const { series, title, trades, profitGraph, tradeGraph, netProfit, netProfitPerDay } = stat;

		return {
			title: title +  ' / profit: +' + (netProfit * 100).toFixed(3) + '% / daily: +' + (netProfitPerDay * 100).toFixed(3) + '%' + ' / trades: ' + trades.length,
			x: series.map(k => k.timestamp),
			ema25: series.calculate('EMA', 25),
			ema50: series.calculate('EMA', 50),
			ema100: series.calculate('EMA', 100),
			profitGraph,
			series: series.toArray(),
			tradeGraph,
			scaleMinMax: true,
		}
	}))

})();


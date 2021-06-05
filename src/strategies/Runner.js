
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
const AIStrategy = require("./AIStrategy");
const IndicatorStrategy = require("./IndicatorStrategy");
const { crossJoinByProps } = require("../../src/shared/util");

(async () => {
	const log = Log.consoleLog('Manual');
	const symbol = Symbols.EURUSD_MINUTELY;
	const factory = new DataFactory(log);
	const series = await factory.getDataSeries(symbol, { limit: 5000 });
	const tester = new StrategyTester(log);

	// const aistrat = new AIStrategy({
	// 	log,
	// 	leverage: 20,
	// 	epochs: 10,
	// 	maxOpenTrades: 5,
	// 	maxDays: 2,
	// 	buyThreshold: .6,
	// 	sellThreshold: .6,
	// 	...TradeOptions.ETORO_FOREX
	// });
	// await aistrat.trainOn({ symbols: [ Symbols.EURUSD_HOURLY_HISTORICAL ], limit: 5000 });

	let stats = await tester.runSimulation({
		// strategy: util.crossJoinByProps({
		// 	leverage: 20,
		// 	tpFactor: [0.1, 0.5, 1, 1.5, 2, 2.5, 3, 5, 10],//util.range(1, 5, .5),
		// 	stopLoss: [0.01, 0.02, 0.05, 0.1, 0.15, 0.2],
		// 	maxOpenTrades: 1,
		// }).map(o => new ScalpingStrategy(o)),

		// strategy: util.crossJoinByProps({
		// 	...TradeOptions.ETORO_FOREX,
		// 	takeProfit: [.2,.4],
		// 	stopLoss: [.2,.4],
		// 	leverage: [10],
		// 	atrPeriod: [6],
		// 	atrMultiplier: [2],
		// 	maxOpenTrades: 10,
		// 	period: [5, 8],
		// 	maxDays: [1,2,4,8],
		// }).map(o => new StupidStrategy(o)),

		// strategy: aistrat,

		strategy: crossJoinByProps({
			...TradeOptions.ETORO_FOREX,
			name: 'MACD2',
			minSignal: .5,
			period: [8, 12, 16, 24],
			slPeriod: [16, 24],
			tpFactor: [1,2,3],
			leverage: 10,
			maxOpenTrades: 1,
		}).map(o => new IndicatorStrategy(o)),
		series
	});

	stats.sort((a,b) => b.netProfit - a.netProfit);

	console.log(`#no \ttitle \tnetProfit \tnetProfitPerDay \ttrades}`);
	stats.slice(0, 10).forEach((stat, i) => {
		console.log(`#${i+1} \t${stat.title} \t${stat.netProfit} \t${stat.netProfitPerDay} \t${stat.trades.length}`);
	})

	stats = stats.filter(k => k.trades.length > 0);
	
	plot2d(
		{ 
			title: stats[0].strategy.toString(),
			x: stats.map(k => k.title),
			netProfit: stats.map(k => k.netProfit),
			netProfitPerDay: stats.map(k => k.netProfitPerDay),
			trades: stats.map(k => k.trades.length),
			scaleMinMax: true,
			period: stats.map(k => k.strategy.config.period),
			stopLoss: stats.map(k => k.strategy.config.stopLoss),
			takeProfit: stats.map(k => k.strategy.config.takeProfit),
			atrPeriod: stats.map(k => k.strategy.config.atrPeriod),
			atrMultiplier: stats.map(k => k.strategy.config.atrMultiplier),
		},
		...stats.slice(0,1).map(stat => {
			const { series, title, trades, profitGraph, tradeGraph, netProfit, netProfitPerDay, graphs } = stat;

			return {
				title: title +  ' / profit: +' + (netProfit * 100).toFixed(0) + '% / daily: +' + (netProfitPerDay * 100).toFixed(2) + '%' + ' / trades: ' + trades.length,
				x: series.map(k => k.timestamp),
				profitGraph,
				[symbol.name]: series.toArray(),
				tradeGraph,
				scaleMinMax: true,
			}
		}),
		...stats.slice(0,1).map(stat => {
			const { series, title, trades, profitGraph, tradeGraph, netProfit, netProfitPerDay, graphs } = stat;

			return {
				title: title +  ' / profit: +' + (netProfit * 100).toFixed(3) + '% / daily: +' + (netProfitPerDay * 100).toFixed(3) + '%' + ' / trades: ' + trades.length,
				x: series.map(k => k.timestamp),
				[symbol.name]: series.toArray(),
				...graphs
			}
		}))

})();


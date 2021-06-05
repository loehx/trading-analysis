
const { Symbols, Data, DataFactory } = require("../data");
const { Log } = require("../shared/log");
const util = require("../shared/util");
const moment = require('moment');
const { TradeOptions } = require("../trading");
const TradeAnalysis = require("../trading/tradeAnalysis");
const { dropLast } = require("lodash/fp");
const AnalysisRunner = require("./AnalysisRunner");
const { plot2d, indicators } = require("../shared");
const Indicators = require('./Indicators');

(async () => {
	const log = Log.consoleLog('Manual');
	const symbol = Symbols.EURUSD_MINUTELY;
	const factory = new DataFactory(log);
	const series = await factory.getDataSeries(symbol, { limit: 5000 });
	const tester = new AnalysisRunner(log);

	const stats = await tester.runAnalysis({
		series,
		indicator: 'MACD2', //['ADX', 'CANDLE_RATIO', 'RSI', 'MINMAX'], //['PROGRESS'], //['CANDLES'],
		futurePeriod: [8],
		minSignal: [.5],
		period: [
			//8,
			//12,
			26,
			//16,
			//32,
			//100,
			//200,
			//64,
		],
	})

	console.log(`#no \tperiod \tfuturePeriod \taccuracy \tminSignal \tpositiveSignals \tindicator`);
	stats.sort((a,b) => b.accuracy - a.accuracy);
	stats.forEach((stat, i) => {
		console.log(`#${i+1} \t${stat.period} \t${stat.futurePeriod} \t\t${stat.accuracy.toFixed(5)} \t${stat.minSignal} \t\t${stat.postiveSignals} \t\t\t${stat.indicator}`);
	})
	
	plot2d(
		{ 
			title: 'Analysis for ' + series.toString(),
			x: stats.map(k => k.title),
			accuracy: stats.map(k => k.accuracy),
		},
		...stats.slice(3).map(stat => {
			const { series, title, accuracy, profitability, signals, graphs, indicator } = stat;

			return {
				title: title +  ' / accuracy: +' + accuracy,
				x: series.map(k => k.timestamp),
				// [symbol.name]: series.toArray(),
				[symbol.name]: series.map(k => k.close),
				profitability,
				signals: signals.map((s,i) => s > 0 ? series.get(i).close : undefined),
				//scaleMinMax: true,
				max: 1000,
				...graphs
			}
		})
		)

})();


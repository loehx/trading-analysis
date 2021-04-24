const { DataSeries, DataFactory, Symbols } = require("../data");
const { ensure, assert } = require("../shared/assertion");
const { crossJoinByProps, avgBy, maxBy, minBy, sumBy, range, round, humanizeDuration } = require("../shared/util");
const { TradeOptions, Trade } = require(".");
const { Log } = require("../shared/log");
const { plotLines, plotScatter, plotData } = require("../shared/plotting");

module.exports = class TradeAnalysis {


	constructor(log) {
		this.log = new Log('TradingAnalysis', log);
		this.factory = new DataFactory(this.log);
	}

	async runStatistic(symbol, options) {
		const series = await this.factory.getDataSeries(symbol, {
			limit: 1000
		});

		// plotData({
		// 	x: series.map(s => s.timestamp),
		// 	'rsi': series.map(k => k.getRSI(40)),
		// 	'close': series.map(k => k.close),
		// 	type: 'line',
		// 	mode: 'line',
		// 	scaleMinMax: true
		// 	//'trades': statistic.map(k => k.trades).map(k => k/100),
		// })
		// return;

		this.log.write(`creating statistic for ${symbol.name} options with ${series.length} data points ...`);
		let statistic = this._createStatistic(series, {
			...options,
			// stopLoss: range(0.4, 1.0, 0.2),
			// takeProfit: range(0.4, 1.0, 0.2),
			// maxDays: [2, 8, 12],
			// leverage: 20,
			// buyIndicator: data => true
		})
		this.log.write('statistic created successfully');
		this.log.write('---- ' + symbol.name + ' -----------------------------');

		statistic = statistic.filter(k => k.profit > 0);

		plotData({
			'labels': statistic.map(k => k.summary),
			'per day': statistic.map(k => k.profit_per_day),
			'profit': statistic.map(k => k.profit),
			scaleMinMax: true,
			type: 'bar',
			mode: 'markers'
			//'trades': statistic.map(k => k.trades).map(k => k/100),
		})

		//statistic.map(k => k.summary).forEach(k => this.log.write(k));

		return statistic;
	}

	_createStatistic(dataSeries, options) {

		assert(() => dataSeries instanceof DataSeries);

		const testOptions = crossJoinByProps(options);
		const results = [];
		let no = 1;

		this.log.write(`testing ${testOptions.length} options ...`);

		for (const testOption of testOptions) {

			// this.log.startTimer(`simulating ${dataSeries.length} trades`);

			const tradeOptions = new TradeOptions(testOption);
			const trades = [];

			this.log.startTimer(`#${no++} of ${testOptions.length}`);

			
			for (let i = 0; i < dataSeries.length; i++) {
				const data = dataSeries.get(i);

				if (testOption.buyIndicator && !testOption.buyIndicator(data)) {
					continue;
				}

				const trade = new Trade(data, tradeOptions);
				if (trade.isClosed) {
					i = trade.closedAt.index;
				}
				trade.__profit = trade.netProfit;
				trades.push(trade);
			}

			// this.log.stopTimer();
			// this.log.startTimer(`evaluate ${dataSeries.length} trades`);

			const evaluation = {
				profit: sumBy(trades, t => t.__profit),
				profit_per_day: sumBy(trades, t => t.__profit) / sumBy(trades, t => t.daysOpen),
				//profitable_trades: trades.filter(t => t.__profit > 0).length,
				//takeProfit: round(testOption.takeProfit * 100) + '%',
				//stopLoss: round(testOption.stopLoss * 100) + '%',
				//average_profit: avgBy(trades, t => t.__profit),
				
				trades: trades.length,
				options: tradeOptions.toString(),
				//closed: (sumBy(trades, t => t.isClosed) / trades.length * 100).toFixed(0) + '%',
			};

			this.log.stopTimer();
			// this.log.write('evaluation:', evaluation);

			//this.log.stopTimer();
			
			evaluation.summary = [
				(evaluation.profit > 0 ? '+' : '') + evaluation.profit.toFixed(3),
				(evaluation.profit_per_day > 0 ? '+' : '') + evaluation.profit_per_day.toFixed(3),
				tradeOptions.toString(),
				testOption.buyIndicator.toString(),
				trades.length + ' trades'
			].join('\t');

			results.push(evaluation);
		}

		//results.sort((a,b) => b.profit - a.profit);
		//results.sort((a,b) => b.profit_per_day - a.profit_per_day);
		return results;
	}

}
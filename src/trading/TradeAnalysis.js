const { DataSeries, DataFactory, Symbols } = require("../data");
const { ensure, assert } = require("../shared/assertion");
const { crossJoinByProps, avgBy, maxBy, minBy, sumBy, range, round } = require("../shared/util");
const { TradeOptions, Trade } = require(".");
const { Log } = require("../shared/log");

module.exports = class TradeAnalysis {


	constructor(log) {
		this.log = new Log('TradingAnalysis', log);
		this.factory = new DataFactory(this.log);
	}

	async getNasdaqStatistic(symbol, tradeOptions) {
		const series = await this.factory.getDataSeries(symbol, {
			limit: 10000
		});

		this.log.write(`creating statistic for ${symbol.name} options with ${series.length} data points ...`);
		const statistic = this._createStatistic(series, {
			...tradeOptions,
			stopLoss: range(0.2, 1.0, 0.2),
			takeProfit: range(0.2, 3.0, 0.2),
			leverage: 20
		})
		this.log.write('statistic created successfully');
		this.log.write('---- RESULTS: -----------------------------');
		statistic.map(k => k.summary).forEach(k => this.log.write(k));


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

			this.log.startTimer(`#${no++} of ${testOptions.length} ${tradeOptions.toString()}`);

			const trades = dataSeries.map(d => {
				const trade = new Trade(d, tradeOptions);
				trade.__profit = trade.netProfit;
				return trade;
			});

			// this.log.stopTimer();
			// this.log.startTimer(`evaluate ${dataSeries.length} trades`);

			const evaluation = {
				profit: sumBy(trades, t => t.__profit),
				profit_per_day: sumBy(trades, t => t.__profit / (t.daysOpen+1)),
				//profitable_trades: trades.filter(t => t.__profit > 0).length,
				takeProfit: round(testOption.takeProfit * 100) + '%',
				stopLoss: round(testOption.stopLoss * 100) + '%',
				//average_profit: avgBy(trades, t => t.__profit),
				average_days: avgBy(trades, t => t.daysOpen),
				closed: (sumBy(trades, t => t.isClosed) / trades.length * 100).toFixed(0) + '%',
			};

			// this.log.stopTimer();
			// this.log.write('evaluation:', evaluation);

			this.log.stopTimer();
			const summary = Object.entries(evaluation).map(([k,v]) => k + ': ' + round(v, 2)).join(' \t');
			this.log.write(summary);

			evaluation.summary = summary;
			results.push(evaluation);
		}

		results.sort((a,b) => b.profit - a.profit);
		return results.slice(0, 10);
	}

}
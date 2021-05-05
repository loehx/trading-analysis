const Trade = require("../Trade");
const NeuralNetwork = require("../../ai/NeuralNetwork");
const { DataFactory, Symbols, Data, DataSeries } = require("../../data");
const { Log } = require("../../shared/log");
const util = require("../../shared/util");
const Trader = require("./base");
const { TradeOptions } = require("..");
const { assert } = require("../../shared/assertion");
const moment = require('moment');
const Cache = require("../../shared/cache");
const { maxBy, minBy, range, avgBy, flatten, scaleByMean, scaleByRelation, difference, scaleMinMax, crossJoinByProps, halfLife, reduceSpikes } = require("../../shared/util");
const { slice } = require("@tensorflow/tfjs-core");
const { plot2d, plot3d } = require("../../shared/plotting");
const indicators = require("../../shared/indicators");


module.exports = class Alex extends Trader {

	constructor(log) {
		super();
		this.log = new Log('Alex', log);
		this.factory = new DataFactory();
		this.cache = new Cache('Alex')
		this.nn1 = new NeuralNetwork({
			id: 'alex-nn1',
			log: this.log,
			optimizer: 'adam',
			loss: 'meanSquaredError',
			inputActivation: 'leakyrelu', 
			//inputUnits: 512, 
			hiddenLayers: [
				{ units: 120, activation: 'leakyrelu' },
				//{ dropout: .2 },
				{ units: 80, activation: 'leakyrelu' },
				//{ dropout: .2 },
				{ units: 20, activation: 'leakyrelu' },
				//{ units: 20, activation: 'leakyrelu' },
		
			], 
			outputActivation: 'softmax', 
		})

		//await this.nn1.tryLoad();
	}

	async run() {
		while(true) {
			await this.trainOn({
				symbols: [
					// Symbols.AUDUSD_HOURLY_HISTORICAL,
					// Symbols.EURAUD_HOURLY_HISTORICAL,
					Symbols.EURCAD_HOURLY_HISTORICAL,
					Symbols.EURGBP_HOURLY_HISTORICAL,
					//Symbols.EURUSD_HOURLY_HISTORICAL
				],
				caching: true,
				//limit: 2000
			});

			await this.evaluate({
				symbol: Symbols.EURUSD_HOURLY,
				limit: 2000,
				caching: true,
			})

			// await this.evaluate({
			// 	symbol: Symbols.NASDAQ_HOURLY,
			// 	limit: 5000,
			// })
		}
	}

	async evaluate({ symbol, limit, caching }) {

		const validation = await this.getTrainingData({
			symbol, 
			limit,
			caching
		});

		let prediction = this.nn1.predictBulk(validation.data.map(k => k.x));
		prediction = util.transpose(prediction);

		plot2d(
			prediction.map((arr, i) => ({ 
				x: validation.series.map(k => k.index),
				Close: validation.series.map(k => k.close),
				['Evaluation #' + i]: arr,
				'Actual': validation.data.map(k => k.y[i]),
				scaleMinMax: true
			}))
		)
	}

	async trainOn({ symbols, limit, caching}) {
		let trainingData = [];

		for (const symbol of symbols) {
			const { series, data } = await this.getTrainingData({
				symbol, 
				limit: limit ?? limit / symbols.length, 
				caching
			});
			trainingData = [ ...trainingData, ...data ];
		}

		const iterator = this.nn1.train({
			data: trainingData,
			//validationData: validation.data,
			validationSplit: .2,
			epochs: 5,
			minProbability: .6
		})

		for await (const status of iterator) {
			return;
		}
	}

	async getTrainingData({ symbol, limit, caching }) {

		this.log.startTimer(`.getTrainingData(${symbol.name}, limit = ${symbol.limit}, caching = ${caching})`);
		const series = await this.factory.getDataSeries(symbol, { limit });
		this.log.write(`series received: ${series.toString()}`);

		const getter = async () => {
			let data = await this.getTrainingDataFromSeries(series);
			data = data.slice(500);
			series.clearCache();
			return data.map(d => ({ i: d.index, x: d.x, y: d.y }));
		};

		const data = !caching ? await getter() : await this.cache.getCachedAsync(`${series.toString()}`, getter);
		this.log.stopTimer('done!');

		return { 
			data, 
			series: new DataSeries(series.toArray(series.length - data.length)) 
		};
	}


	async getTrainingDataFromSeries(series) {

		this.log.startTimer('turn data into training data');

		//const periods = util.exponentialSequence(2000);
		//const periods = util.fibonacciSequence(2000);
		const periods = [ ...util.range(1, 30, 1), ...util.range(40, 100, 10), ...util.range(120, 500, 20) ];
		const result = new Array(series.length);
		result.length = 0;
		let context = {};

		this.log.startTimer('generate x by periods: ' + periods.slice(0, 5).join(', ') + ', ...')
		const xs = periods.map((p, i) => {
			const cols = this.getXs(p, series, context);
			this.log.writeProgress(i, periods.length);
			return cols.map(x => scaleMinMax(reduceSpikes(x, 0.2)));
		});

		context = null;
		this.log.stopTimer('done!');

		this.log.startTimer('generate y')
		const y = this.getYs(series);
		this.log.stopTimer('done!');

		const start = series.length - y.length;
		const end = xs[0][0].length;

		for (let i = start; i < end; i++) {
			const data = series.get(i);
		
			result.push({
				index: data.index,
				data: data,
				x: flatten(xs[0].map((_, c) => xs.map(p => p[c][i]))),
				y: y[i]
			});

			series.clearCache();
		}

		// plot2d({
		// 	x: series.map(t => t.timestamp),
		// 	...util.getExamples(result, 10).reduce((o,xy,i) => ({ ...o, ['x #' + i]: xy.x }), {})
		// }, {
		// 	x: series.map(t => t.timestamp),
		// 	'close': series.closes,
		// }, 
		// util.getExamples(util.flatten(xs), 100).reduce((o,xy,i) => ({ ...o, ['x #' + i]: xy.slice(0, 100) }), {}),
		// )

		return result;

	}

	getXs(period, series, context) {

		const closedAboveBefore = (d, nBefore) => d.close > (series.get(d.index - nBefore)?.close || 0);
		const closedBelowBefore = (d, nBefore) => d.close < (series.get(d.index - nBefore)?.close || 0);

		return [
			scaleByMean(series.calculate(indicators.Symbols.SMA, period), 100),
			// scaleByMean(series.calculate(indicators.Symbols.WMA, period), 100),
			// scaleByMean(series.calculate(indicators.Symbols.ATR, period), 100),
			//scaleByMean(series.calculate(indicators.Symbols.TrueRange, period), 100),
			//scaleByMean(series.calculate(indicators.Symbols.RSI, period), 100),
			// //scaleMinMax(series.calculate(indicators.Symbols.Stochastic, period)),

			// scaleByMean(series.calculate(indicators.Symbols.ADX, period), 100),
			// scaleByMean(series.calculate(indicators.Symbols.MACD, period).map(k => k), 100),
			//halfLife(series.map(d => closedAboveBefore(d, period) ? 1 : 0), .8),
			//halfLife(series.map(d => closedBelowBefore(d, period) ? 1 : 0), .8),
			scaleByMean(series.map(d => d.progress), period),
			scaleByMean(series.map(d => d.close), period),
		];
	}


	getYs(series) {

		const options = crossJoinByProps({
			leverage: 10,
			stopLoss: 1,
			takeProfit: 1,
			maxDays: [6]
		}).map(TradeOptions.forEtoroIndices);
		
		return series.map((data, i) => {
			const trades = options.map(k => new Trade(data, k));
			this.log.writeProgress(i, series.length);
			return [
				...trades.map(t => t.netProfit > 0),
				...trades.map(t => t.netProfit < 0),
				// trade.profit > 0,
				// trade.profit < 0,
			].map(k => k ? 1 : 0)
		})
	}

}
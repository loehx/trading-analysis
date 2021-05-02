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
const { maxBy, minBy, range, avgBy, flatten, scaleByMean, scaleByRelation, difference, scaleMinMax, crossJoinByProps, halfLife } = require("../../shared/util");
const { slice } = require("@tensorflow/tfjs-core");
const { plot2d, plot3d } = require("../../shared/plotting");
const LSTMNetwork = require("../../ai/LSTMNetwork");
const { startsWith } = require("lodash");
const indicators = require("../../shared/indicators");

class TrainingData {
	constructor() {

	}
}

module.exports = class Alex extends Trader {

	constructor(log) {
		super();
		this.log = new Log('Alex', log);
		this.factory = new DataFactory(this.log);
		this.cache = new Cache('Alex')
		this.nn1 = new NeuralNetwork({
			id: 'alex-nn1',
			log: this.log,
			optimizer: 'adam',
			loss: 'meanSquaredError',
			inputActivation: 'leakyrelu', 
			//inputUnits: 512, 
			hiddenLayers: [
				{ units: 160, activation: 'leakyrelu' },
				{ units: 80, activation: 'leakyrelu' },
				{ units: 20, activation: 'leakyrelu' },
		
			], 
			outputActivation: 'softmax', 
		})

		//await this.nn1.tryLoad();
	}


	async run() {
		const training = await this.getTrainingData({
			symbol: Symbols.EURUSD_HOURLY_HISTORICAL, 
			limit: 80000, 
			caching: true
		});
		const validation = await this.getTrainingData({
			symbol: Symbols.EURUSD_HOURLY, 
			limit: 2000, 
			caching: true
		});

		const iterator = this.nn1.train({
			data: training.data,
			validationData: validation.data,
			epochs: 10,
			minProbability: .6
		})

		for await (const status of iterator) {
			//console.log(status);
			//validation.data.forEach(d => console.log('AAA', d.prediction));

			plot2d(
				{
				x: validation.series.map(d => d.timestamp),
				//'Profitable': validation.data.map(d => d.y[0]),
				'Closing Price': validation.series.map(d => d.close),
				'AI Profit': validation.data.map(d => d.prediction[0]),
				'validation': validation.data.map(d => d.validation[0]),
				scaleMinMax: true
			}, {
				x: validation.series.map(d => d.timestamp),
				'Profitable': validation.data.map(d => d.y[0]),
				'Closing Price': validation.series.map(d => d.close),
				//'AI Prediction': validation.data.map(d => d.prediction[0]),
				scaleMinMax: true
			},
			{
				x: status.history.map(k => k.epochs),
				'loss': status.history.map(k => k.loss),
				'accuracy': status.history.map(k => k.accuracy),
			});	
		}
	}

	async getTrainingData({ symbol, limit, caching }) {

		this.log.startTimer(`.getTrainingData(${symbol.name}, limit = ${symbol.limit}, caching = ${caching})`);
		const series = await this.factory.getDataSeries(symbol, { limit });
		this.log.write(`series received: ${series.toString()}`);

		const getter = async () => {
			const data = await this.getTrainingDataFromSeries(series);
			return data.map(d => ({ i: d.index, x: d.x, y: d.y }));
		};

		const data = !caching ? await getter() : await this.cache.getCachedAsync(`${series.toString()}`, getter);
		this.log.stopTimer('done!');

		console.log('example: ', data[0]);
		return { data, series };
	}


	async getTrainingDataFromSeries(series) {

		this.log.startTimer('turn data into training data');

		//const periods = util.exponentialSequence(2000);
		const periods = util.fibonacciSequence(2000);
		//const periods = util.range(1, 20, 1);
		const result = new Array(series.length);
		result.length = 0;
		let context = {};

		this.log.startTimer('generate x by periods: ' + periods.join(', '))
		const xs = periods.map((p, i) => {
			const cols = this.getXs(p, series, context);
			this.log.writeProgress(i, periods.length);
			return cols.map(x => scaleMinMax(x));
		});

		context = null;
		this.log.stopTimer();

		this.log.startTimer('generate y')
		const y = this.getYs(series);
		this.log.stopTimer();

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

		const chart = {};
		result.forEach((xy, i) => {
			if (i % Math.round(result.length / 10) === 0) {
				chart['x #' + i] = xy.x;
			}
		})
		plot2d(chart);

		return result;

	}

	getXs(period, series, context) {

		const closedAboveBefore = (d, nBefore) => d.close > (series.get(d.index - nBefore)?.close || 0);
		const closedBelowBefore = (d, nBefore) => d.close < (series.get(d.index - nBefore)?.close || 0);

		// const options = crossJoinByProps({
		// 	leverage: 10,
		// 	stopLoss: 1,
		// 	takeProfit: 1,
		// 	maxDays: [3]
		// }).map(TradeOptions.forEtoroIndices);

		return [

			//...options.map(o => scaleMinMax(series.map(d => new Trade(d, o).netProfit))),

			scaleByMean(series.calculate(indicators.Symbols.SMA, period), 100),
			scaleByMean(series.calculate(indicators.Symbols.WMA, period), 100),
			scaleByMean(series.calculate(indicators.Symbols.ATR, period), 100),
			scaleByMean(series.calculate(indicators.Symbols.TrueRange, period), 100),
			series.calculate(indicators.Symbols.RSI, period),
			//scaleMinMax(series.calculate(indicators.Symbols.Stochastic, period)),

			scaleByMean(series.calculate(indicators.Symbols.ADX, period), 50),
			scaleByMean(series.calculate(indicators.Symbols.MACD, period).map(k => k), 100),
			halfLife(series.map(d => closedAboveBefore(d, period) ? 1 : 0), .8),
			halfLife(series.map(d => closedBelowBefore(d, period) ? 1 : 0), .8),
			scaleByMean(series.map(d => d.progress), 100),
		];
	}


	getYs(series) {

		const options = crossJoinByProps({
			leverage: 10,
			stopLoss: 1,
			takeProfit: 1,
			maxDays: [5]
		}).map(TradeOptions.forEtoroIndices);
		
		return series.map(data => {
			const trades = options.map(k => new Trade(data, k));
			return [
				...trades.map(t => t.netProfit > 0),
				...trades.map(t => t.netProfit < 0)
				// trade.profit > 0,
				// trade.profit < 0,
			].map(k => k ? 1 : 0)
		})
	}

}
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
				{ dropout: .2 },
				{ units: 160, activation: 'leakyrelu' },
				{ dropout: .2 },
				{ units: 80, activation: 'leakyrelu' },
				{ units: 20, activation: 'leakyrelu' },
		
			], 
			outputActivation: 'softmax', 
		})

		//await this.nn1.tryLoad();
	}

	async run() {

		this.config = {
			minProbability: .6,
			daysToPredict: 1,
			reduceSpikesFactor: .2,
		};

		while(true) {

			await this.trainOn({
				symbols: [
					Symbols.GBPUSD_HOURLY_HISTORICAL,
				],
				//limit: 10000,
				epochs: 10, 
			});

			await this.evaluate({
				symbol: Symbols.EURAUD_HOURLY,
				limit: 1500,
			})
		}
	}

	async evaluate({ symbol, limit, caching = true }) {

		const validation = await this.getTrainingData({
			symbol, 
			limit,
			caching
		});

		const { minProbability, daysToPredict } = this.config;
		let { predictions, accuracy } = this.nn1.getValidationAccuracy(validation.data, minProbability);
		predictions = util.transpose(predictions);

		const titles = [
			`Trades running ${daysToPredict}-days would be profitable`,
			`Contradicting Prediction (Should be the opposite)`
		];

		plot2d(
			predictions.map((arr, i) => ({ 
				x: validation.series.map(k => k.index + ' ' + moment(k.timestamp).format('DD.MM.YYYY HH:mm')),
				Close: scaleMinMax(validation.series.map(k => k.close)),
				'Probability (AI)': arr,
				'Actual': validation.data.map(k => k.y[i]),
				'Min. Probability': () => minProbability,
				title: `${symbol.name}: ${titles[i]} (accuracy: ${util.round(accuracy, 2)})`
			}))
		)
	}

	async trainOn({ symbols, limit, caching = true, epochs }) {
		let trainingData = [];

		for (const symbol of symbols) {
			const { series, data } = await this.getTrainingData({
				symbol, 
				limit: limit && limit / symbols.length, 
				caching
			});
			series.clearCache();
			trainingData = [ ...trainingData, ...data ];
		}

		const { minProbability } = this.config;
		const iterator = this.nn1.train({
			data: trainingData,
			validationSplit: .1,
			epochs: Math.ceil(epochs/5),
			minProbability,
		})

		for await (const status of iterator) {
			if (status.accuracy > minProbability || status.epochs >= epochs) {
				return status;
			}
		}
	}

	async getTrainingData({ symbol, limit, caching }) {

		this.log.startTimer(`.getTrainingData(${symbol.name}, limit = ${limit}, caching = ${caching})`);
		const series = await this.factory.getDataSeries(symbol, { limit });
		this.log.write(`series received: ${series.toString()}`);

		const getter = async () => {
			let data = await this.getTrainingDataFromSeries(series);
			data = data.slice(500);
			series.clearCache();
			return data.map(d => ({ i: d.index, x: d.x, y: d.y }));
		};

		const data = !caching ? await getter() : await this.cache.getCachedAsync(`${series.toString()}`, getter);
		const skip = series.length - data.length;
		this.log.stopTimer(`done! ...skip the first ${skip} of ${series.length}`);

		return { 
			data, 
			series: new DataSeries(series.toArray(skip)) 
		};
	}


	async getTrainingDataFromSeries(series) {

		this.log.startTimer('turn data into training data');

		//const periods = util.exponentialSequence(2000);
		//const periods = util.fibonacciSequence(2000);
		//const periods = [ ...util.range(30, 100, 10), ...util.range(120, 500, 20) ];
		const periods = [ 1, 2, 4, 8, 16, 32, 64, 128, 200, 300, 400, 500 ];
		const result = new Array(series.length);
		result.length = 0;
		let context = {};

		this.log.startTimer('generate x by periods: ' + periods.slice(0, 5).join(', ') + ', ...')
		const { reduceSpikesFactor } = this.config;
		const xs = periods.map((p, i) => {
			const cols = this.getXs(p, series, context);
			this.log.writeProgress(i, periods.length);
			return cols.map(x => scaleMinMax(reduceSpikes(x, reduceSpikesFactor)));
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

		plot2d({
			x: series.map(t => t.timestamp),
			...util.getExamples(result, 10).reduce((o,xy,i) => ({ ...o, ['x #' + i]: xy.x }), {})
		}, {
			x: series.map(t => t.timestamp),
			'close': series.closes,
		}, 
		util.getExamples(util.flatten(xs), 100).reduce((o,xy,i) => ({ ...o, ['x #' + i]: xy.slice(0, 1000) }), {}),
		)

		this.log.stopTimer('done');

		return result;

	}

	getXs(period, series, context) {

		const closedAboveBefore = (d, nBefore) => d.close > (series.get(d.index - nBefore)?.close || 0);
		const closedBelowBefore = (d, nBefore) => d.close < (series.get(d.index - nBefore)?.close || 0);

		const shifted = [...series.toArray(period), ...series.toArray(-period)];

		// period % 100 === 0 && plot2d({
		// 	shifted: shifted.map(k => k.close),
		// 	closes: series.toArray().map(k => k.close),
		// 	diff: util.difference(series.closes, shifted.map(k => k.close)),
		// 	scaleMinMax: true
		// });

		return [
			scaleByMean(util.difference(series.closes, shifted.map(k => k.close)), 500),
			// indicators.get(indicators.Symbols.WMA, period, {
			// 	close: scaleByMean(series.closes, 500)
			// }),

			//scaleByMean(series.calculate(indicators.Symbols.SMA, period), 100),
			// scaleByMean(series.calculate(indicators.Symbols.WMA, period), 100),
			//scaleByMean(series.calculate(indicators.Symbols.ATR, period), 100),
			//scaleByMean(series.calculate(indicators.Symbols.TrueRange, period), 100),
			//series.calculate(indicators.Symbols.RSI, period),
			// //scaleMinMax(series.calculate(indicators.Symbols.Stochastic, period)),
			
			// scaleByMean(series.calculate(indicators.Symbols.ADX, period), 100),
			//series.calculate(indicators.Symbols.MACD, period).map(k => k[0] || 0),
			// series.calculate(indicators.Symbols.AwesomeOscillator, period).map(k => k[0] || 0),
			// halfLife(series.map(d => closedAboveBefore(d, period) ? 1 : 0), .8),
			// halfLife(series.map(d => closedBelowBefore(d, period) ? 1 : 0), .8),
			// scaleByMean(series.map(d => d.progress), period),
			// scaleByMean(series.map(d => d.close), period),
			// scaleByMean(series.map(d => d.high - d.low), period),
		];
	}


	getYs(series) {

		const options = crossJoinByProps({
			leverage: 10,
			stopLoss: 1,
			takeProfit: 1,
			maxDays: [this.config.daysToPredict]
		}).map(TradeOptions.forEtoroForex);
		
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
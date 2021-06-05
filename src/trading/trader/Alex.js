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
const { maxBy, minBy, range, avgBy, flatten, scaleByMean, scaleByRelation, difference, scaleMinMax, crossJoinByProps, halfLife, reduceSpikes, movingAverage } = require("../../shared/util");
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
			//learningRate: .0001,
			loss: 'meanSquaredError', // 'binaryCrossentropy',
			inputActivation: 'leakyrelu', 
			//inputUnits: 512, 
			hiddenLayers: [
				//{ dropout: .1 },
				//{ units: 160, activation: 'leakyrelu' },
				{ dropout: .2 },
				{ units: 80, activation: 'leakyrelu' },
				{ dropout: .2 },
				{ units: 64, activation: 'leakyrelu' },
				{ dropout: .1 },
				{ units: 36, activation: 'leakyrelu' },
				{ dropout: .1 },
				{ units: 16, activation: 'leakyrelu' },
				//{ dropout: .1 },
				//{ units: 20, activation: 'leakyrelu' },
		
			], 
			outputActivation: 'softmax', 
		})

		//await this.nn1.tryLoad();
	}

	async run() {

		this.config = {
			minProbability: .6,
			hoursToPredict: 24,
			reduceSpikesFactor: .1,
			indicatorTypes: ['*'],
			epochs: 2,
			validationSplit: .15,
			periods: [ 4, 8, 12, 16, 20, 28, 36, 48, 60, 80, 100, 120, 150, 180, 220, 300, 400, 500]
		};

		while(true) {

			//this.config.indicatorTypes = [ indicatorTypes.shift() ];
			await this.trainOn({
				symbols: [ 
					Symbols.EURUSD_HOURLY_HISTORICAL, 
					//Symbols.EURCAD_HOURLY_HISTORICAL,
				],
				//limit: 10000,
			});	

			// await this.evaluate({
			// 	symbol: Symbols.EURUSD_HOURLY_HISTORICAL,
			// 	limit: 2000,
			// })
		

			await this.evaluate({
				symbol: Symbols.EURUSD_HOURLY,
				limit: 1500,
			})

			await this.evaluate({
				symbol: Symbols.AUDUSD_HOURLY,
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

		const { minProbability, hoursToPredict, indicatorTypes } = this.config;
		let { predictions, accuracy } = this.nn1.getValidationAccuracy(validation.data, minProbability);
		predictions = util.transpose(predictions);

		const titles = [
			`Trades running ${hoursToPredict}-hours would be profitable`,
			`Contradicting Prediction (Opposite)`
		];

		this.log.write(`${symbol.name} => ${predictions[0][predictions[0].length - 1]}`)

		plot2d(
			...predictions.map((arr, i) => ({ 
				x: validation.series.map(k => k.index + ' ' + moment(k.timestamp).format('DD.MM.YYYY HH:mm')),
				[symbol.name]: validation.series.toArray(),
				'Probability (AI)': arr,
				// 'Probability (AI) (SMA-3)': indicators.getSMAs(3, arr),
				'Actual': validation.data.map(k => k.y[i]),
				'Min. Probability': () => minProbability,
				scaleMinMax: [symbol.name],
				title: `${symbol.name}: ${titles[i]} (accuracy: ${util.round(accuracy, 2)} | indicators: ${JSON.stringify(indicatorTypes)})`
			})),
			...predictions.map((arr, i) => ({ 
				x: validation.series.map(k => k.index + ' ' + moment(k.timestamp).format('DD.MM.YYYY HH:mm')),
				[symbol.name]: validation.series.toArray(),
				'Probability (AI)': arr,
				'Min. Probability': () => minProbability,
				scaleMinMax: [symbol.name],
				title: `${symbol.name}: ${titles[i]} (accuracy: ${util.round(accuracy, 2)} | indicators: ${JSON.stringify(indicatorTypes)})`
			}))
		)
	}

	async trainOn({ symbols, limit, caching = true }) {
		let trainingData = [];

		for (const symbol of symbols) {
			const { series, data } = await this.getTrainingData({
				symbol, 
				limit: limit && limit / symbols.length, 
				caching,
				maxDate: '2020-01-01',
			});
			series.clearCache();
			trainingData = [ ...trainingData, ...data ];
		}

		const { minProbability, validationSplit, epochs } = this.config;
		const iterator = this.nn1.train({
			data: trainingData,
			validationSplit,
			epochs: Math.ceil(epochs/5),
			minProbability,
			
		})

		for await (const status of iterator) {
			if (status.accuracy > minProbability || status.epochs >= epochs) {
				return status;
			}
		}
	}

	async getTrainingData({ symbol, limit, caching, maxDate }) {

		this.log.startTimer(`.getTrainingData(${symbol.name}, limit = ${limit}, caching = ${caching}, maxDate = ${maxDate})`);
		const series = await this.factory.getDataSeries(symbol, { limit, to: maxDate });
		this.log.write(`series received: ${series.toString()}`);

		const getter = async () => {
			let data = await this.getTrainingDataFromSeries(series);
			data = data.slice(500);
			series.clearCache();
			return data.map(d => ({ i: d.index, x: d.x, y: d.y }));
		};

		const data = !caching ? await getter() : await this.cache.getCachedAsync(`${symbol.name}${series.toString()}`, getter);
		const skip = series.length - data.length;
		this.log.stopTimer(`done! ...skip the first ${skip} of ${series.length}`);

		return { 
			data, 
			series: new DataSeries(series.toArray(skip)) 
		};
	}


	async getTrainingDataFromSeries(series) {

		this.log.startTimer('turn data into training data');

		
		//const periods = util.fibonacciSequence(2000);
		//const periods = [ ...util.range(30, 100, 10), ...util.range(120, 500, 20) ];
		//const periods = [ 16,24,...util.range(30, 100, 10), ...util.range(120, 500, 20) ];
		const result = new Array(series.length);
		result.length = 0;
		let context = {};

		const { indicatorTypes, periods } = this.config;

		this.log.startTimer('generate x by periods: ' + periods.slice(0, 5).join(', ') + ', ...')
		this.log.write(`indicators: ${JSON.stringify(indicatorTypes)}`);

		const xs = periods.map((p, i) => {
			const cols = this.getXs(p, series, context);
			this.log.writeProgress(i, periods.length);
			return cols;
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
		// 	x: series.map(t => t.index),
		// 	...util.getExamples(result, 10).reduce((o,xy,i) => ({ ...o, ['x #' + xy.index]: xy.x }), {})
		// }, {
		// 	x: series.map(t => t.index),
		// 	'close': series.closes,
		// }, 
		// util.getExamples(util.flatten(xs), 3).reduce((o,xy,i) => ({ ...o, ['x #' + i]: xy.slice(0, 1000) }), {
		// 	'close': series.toArray(0, 1000).map(k => k.close),
		// 	scaleMinMax: true
		// }),
		// )

		this.log.stopTimer('done');

		return result;

	}

	getXs(period, series, context) {

		const closedAboveBefore = (d, nBefore) => d.close > (series.get(d.index - nBefore)?.close || 0) ? 1 : 0;
		const closedBelowBefore = (d, nBefore) => d.close < (series.get(d.index - nBefore)?.close || 0) ? 1 : 0;

		const lastsma = context.sma || series.closes;
		const sma = context.sma = series.calculate('SMA', period);

		let candleCounter = 0;
		const upAndDownCandles = series.map(k => candleCounter += (k.progress > 0 ? +1 : -1));

		// period % 100 === 0 && plot2d({
		// 	shifted: shifted.map(k => k.close),
		// 	closes: series.toArray().map(k => k.close),
		// 	diff: util.difference(series.closes, shifted.map(k => k.close)),
		// 	scaleMinMax: true
		// });

		const r = {
			SMADifference: () => util.difference(sma, lastsma),
			//Progress: () => series.map(d => d.progress),
			//SMA: () => scaleByMean(sma, period),
			//UpAndDownCandles: () =>scaleByMean(upAndDownCandles, period),
			// closedAboveBefore: () => series.map(data => closedAboveBefore(data, period)),
			// closedBelowBefore: () => series.map(data => closedBelowBefore(data, period)),
			
			RSI: () =>series.calculate('RSI', period),
			//StochasticRSI: () =>series.calculate('StochasticRSI', period).map(k => k[0] || 0),
			ADX0: () =>series.calculate('ADX', period).map(k => k[0] || 0),
			MACD: () =>series.calculate('MACD', period).map(k => k[0] || 0),
			//AwesomeOscillator: () =>series.calculate('AwesomeOscillator', period).map(k => k),
		};



		const { indicatorTypes } = this.config;
		for (const type in r) {
			if (indicatorTypes[0] === '*' || indicatorTypes.indexOf(type) !== -1) {
				r[type] = r[type]();
			}
			else {
				delete r[type];
			}
		}

		// if (!this.__test){
		// 	this.__test = 1;
		// 	plot2d(...Object.entries(r).map(([name, values]) => ({
		// 		Close: util.getExamples(series.map(d => d.close), 1000),
		// 		[name]: util.getExamples(values, 1000),
		// 		scaleMinMax: true,
		// 	})))
		// }

	

		const { reduceSpikesFactor } = this.config;
		const cols = Object.values(r);
		const result = [];

		cols.map(col => {
			// col = reduceSpikes(col, reduceSpikesFactor);
			// col = scaleByMean(col, 500);
			col = scaleMinMax(col);

			// result.push(col);
			result.push(col.map(v => v >= 0.75 ? 1 : 0));
			result.push(col.map(v => v >= 0.5 && v < 0.75 ? 1 : 0));
			result.push(col.map(v => v >= 0.25 && v < 0.5 ? 1 : 0));
			result.push(col.map(v => v < 0.25 ? 1 : 0));
		});

		// if (!this.__test){
		// 	this.__test = 1;
		// 	plot2d(...result.map((c, i) => ({
		// 		Close: scaleMinMax(util.getExamples(series.map(d => d.close), 1000)),
		// 		['#'+i]: util.getExamples(c, 1000),
		// 	})))
		// }

		return result;
	}


	getYs(series) {

		const options = crossJoinByProps({
			leverage: 10,
			stopLoss: 1,
			takeProfit: 1,
			maxDays: [this.config.hoursToPredict / 24]
		}).map(TradeOptions.forEtoroForex);
		
		return series.map((data, i) => {
			//const trades = options.map(k => new Trade(data, k));
			// const futureLeap = data.index + (this.config.hoursToPredict);
			// const fdata = series.get(Math.min(futureLeap, series.length - 1));
			this.log.writeProgress(i, series.length);

			const nextData = data.getNext(this.config.hoursToPredict);
			const avg = util.avgBy(nextData, k => k.close > data.close ? 1 : 0);

			return [avg > .6 ? 1 : 0, avg < .4 ? 1 : 0];
			return [avg, 1 - avg];
			
			if (fdata.close > data.close) {
				return [1, 0];
			}
			else {
				return [0, 1];
			}
			// return [
			// 	fdata.close > data.close ? 1 : 0,
			// 	fdata.close > data.close ? 0 : 1,
			// 	// ...trades.map(t => t.netProfit > 0),
			// 	// ...trades.map(t => t.netProfit < 0),
			// ]
		})
	}

}
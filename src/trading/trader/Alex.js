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
const { maxBy, minBy, range, avgBy, flatten } = require("../../shared/util");
const { slice } = require("@tensorflow/tfjs-core");
const { plot2d, plot3d } = require("../../shared/plotting");
const LSTMNetwork = require("../../ai/LSTMNetwork");
const { startsWith } = require("lodash");

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
				{ units: 300, activation: 'leakyrelu' },
				{ units: 150, activation: 'leakyrelu' },
				{ units: 75, activation: 'leakyrelu' },
		
			], 
			outputActivation: 'softmax', 
		})

		//await this.nn1.tryLoad();
	}


	async run() {
		const training = await this.getTrainingData({
			symbol: Symbols.NASDAQ_HOURLY_HISTORICAL, 
			limit: 5000, 
			caching: false
		});
		const validation = await this.getTrainingData({
			symbol: Symbols.NASDAQ_HOURLY, 
			limit: 2000, 
			caching: true
		});

		const iterator = this.nn1.train({
			data: training.data,
			//validationData: validation.data,
			epochs: 2,
			//minProbability: .7
		})

		for await (const status of iterator) {
			//console.log(status);
			//validation.data.forEach(d => console.log('AAA', d.prediction));

			// plot2d(
			// 	{
			// 	x: validation.series.map(d => d.timestamp),
			// 	//'Profitable': validation.data.map(d => d.y[0]),
			// 	'Closing Price': validation.series.map(d => d.close),
			// 	'AI Profit': validation.data.map(d => d.prediction[0]),
			// 	scaleMinMax: true
			// }, {
			// 	x: validation.series.map(d => d.timestamp),
			// 	//'Profitable': validation.data.map(d => d.y[0]),
			// 	'Closing Price': validation.series.map(d => d.close),
			// 	'AI Loss': validation.data.map(d => d.prediction[1]),
			// 	scaleMinMax: true
			// }, {
			// 	x: validation.series.map(d => d.timestamp),
			// 	'Profitable': validation.data.map(d => d.y[0]),
			// 	'Closing Price': validation.series.map(d => d.close),
			// 	//'AI Prediction': validation.data.map(d => d.prediction[0]),
			// 	scaleMinMax: true
			// },
			// {
			// 	x: status.history.map(k => k.epochs),
			// 	'loss': status.history.map(k => k.loss),
			// 	'accuracy': status.history.map(k => k.accuracy),
			// });	
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
		plot3d(
			{ data: data[100].x },
			{ data: data[1000].x },
			);
		return { data, series };
	}


	async getTrainingDataFromSeries(series) {

		this.log.startTimer('turn data into training data');

		const datasets = series.toArray(200, -8);

		let index = 0;
		const result = new Array(datasets.length);
		result.length = 0;
		

		for (let i = 0; i < datasets.length; i++) {
			const data = datasets[i];
			const periods = util.fibonacci(15);

			this.log.writeProgress(i, datasets.length);

			const trade = new Trade(data, TradeOptions.forEtoroIndices({
				leverage: 10,
				stopLoss: 1,
				takeProfit: 1,
				maxDays: 3
			}))

			const timestamp = moment(data.timestamp);
			result.push({
				index: index++,
				data: data,
				scaleMinMax: [
					// timestamp.isoWeekday(),
					// timestamp.get('hour'),
					// ...flatten(periods.map(p => data.calculate('Stochastic', p))),
					// ...flatten(periods.map(p => data.calculate('StochasticRSI', p))),
					...periods.map(p => data.calculate('RSI', p)),
				],
				scaleByMean: [
					//...periods.map(p => data.calculate('SMA', p)),
					// // ...periods.map(p => data.calculate('EMA', p)),
					// ...periods.map(p => data.calculate('WMA', p)),
					// // ...periods.map(p => data.calculate('WEMA', p)),
					// ...flatten(periods.map(p => data.calculate('MACD', p))),
					// // ...flatten(periods.map(p => data.calculate('BollingerBands', p))),
					// // ...flatten(periods.map(p => data.calculate('ADX', p))),
					// ...periods.map(p => data.calculate('ATR', p)),
					// ...periods.map(p => data.calculate('TrueRange', p)),
					// // ...periods.map(p => data.calculate('ROC', p)),
					// // ...periods.map(p => data.calculate('WilliamsR', p)),
					// // ...periods.map(p => data.calculate('ADL', p)),
					// // ...periods.map(p => data.calculate('OBV', p)),
					// // ...periods.map(p => data.calculate('TRIX', p)),
					// // ...periods.map(p => data.calculate('ForceIndex', p)),
					// // ...periods.map(p => data.calculate('CCI', p)),
					// ...periods.map(p => data.calculate('AwesomeOscillator', p)),
					// // ...periods.map(p => data.calculate('VWAP', p)),
					// // ...periods.map(p => data.calculate('MFI', p)),
					// // ...periods.map(p => data.calculate('AverageGain', p)),
					// // ...periods.map(p => data.calculate('AverageLoss', p)),
					// // ...periods.map(p => data.calculate('SD', p)),
				],
				halfLife: [

					// ...periods.map(p => data.calculate('RSI', p) < 30),
					// ...periods.map(p => data.calculate('RSI', p) < 40),
					// ...periods.map(p => data.calculate('RSI', p) > 70),
					// ...periods.map(p => data.calculate('RSI', p) > 80),
					// ...periods.map(p => maxBy(data.getPrev(p), d => d.open) < data.open),
					// ...periods.map(p => maxBy(data.getPrev(p), d => d.close) < data.close),
					// ...periods.map(p => minBy(data.getPrev(p), d => d.open) > data.open),
					// ...periods.map(p => minBy(data.getPrev(p), d => d.close) > data.close),
					// ...Object.values(data.getCandlePattern()),
				],
				x: [
					//...util.range(1, 100).map(k => Math.random() > 0.5 ? 1 : 0)
				],
				 y: [
					trade.profit > 0,
					trade.profit < 0,
					// series.get(i + 8).getSMA(4) > data.getSMA(4),
					// series.get(i + 8).getSMA(4) < data.getSMA(4),
					
				].map(k => k ? 1 : 0)
			});
		}

		this.log.stopTimer('done!');

		this.log.write('release memory');
		series.clearCache();

		this.log.startTimer('create scaleMinMax');
		const scaleMinMaxLen = result[0].scaleMinMax.length;
		for (let i = 0; i < scaleMinMaxLen; i++) {
			const original = result.map(r => r.scaleMinMax[i]);
			const converted = util.scaleMinMax(original);
			result.forEach((r, n) => r.x.push(converted[n]));
			this.log.writeProgress(i, scaleMinMaxLen);
		}
		this.log.stopTimer('done');

		this.log.startTimer('create scaleByMean');
		const scaleByMeanLen = result[0].scaleByMean.length;
		for (let i = 0; i < scaleByMeanLen; i++) {
			const original = result.map(r => r.scaleByMean[i]);
			const converted = util.scaleMinMax(util.scaleByMean(original, 30)); // TODO: Konfigurierbar machen
			result.forEach((r, n) => r.x.push(converted[n]));
			this.log.writeProgress(i, scaleByMeanLen);
		}
		this.log.stopTimer('done');

		this.log.startTimer('create halfLife');
		const halfLifeLen = result[0].halfLife.length;
		for (let i = 0; i < halfLifeLen; i++) {
			const original = result.map(r => r.halfLife[i]);
			const converted = util.halfLife(original.map(k => k ? 1 : 0), .8);
			console.log(converted);
			result.forEach((r, n) => r.x.push(converted[n]));
			this.log.writeProgress(i, halfLifeLen);
		}
		this.log.stopTimer('done');

		// this.log.startTimer('create relative-to-last');
		// const xLen = result[0].x.length;
		// for (let x = 0; x < xLen; x++) {
		// 	result[0].x.push(0);
		// 	for (let i = 1; i < result.length; i++) {
		// 		let prog = ((curr.x[x] - prev.x[x])) + .5;
		// 		prog = Math.min(prog, 1);
		// 		prog = Math.max(prog, 0);
		// 		prog = util.round(prog, 6);
		// 		curr.x.push(prog);
		// 	}
		// 	this.log.writeProgress(x, xLen);
		// }
		// this.log.stopTimer('done');

		this.log.write('release memory');
		result.forEach(r => {
			delete r.scaleMinMax;
			delete r.scaleByMean;
			delete r.halfLife;
		});

		console.log('x example: ', result[100].x);

		return result;
	}

}
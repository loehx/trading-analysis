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
const { maxBy, minBy, range } = require("../../shared/util");
const { slice } = require("@tensorflow/tfjs-core");
const { plotData, plot3d } = require("../../shared/plotting");

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
			optimizer: 'rmsprop',
			loss: 'meanSquaredError', 
			inputActivation: 'relu', 
			inputUnits: 256, 
			outputActivation: 'softmax', 
			hiddenLayers: [
				//{ dropout: 0.2 },
				//{ units: 64, activation: 'relu' },
				//{ dropout: 0.1 },
				//{ units: 8, activation: 'relu' }
			], 
		})

		//await this.nn1.tryLoad();
	}

	async run() {
		const symbol = Symbols.NASDAQ_HOURLY_HISTORICAL;
		const limit = undefined;

		const series = await this.factory.getDataSeries(symbol, {
			limit
		});

		this.log.startTimer('.getTrainingData(series)');

		const trainingData = await this.cache.getCachedAsync(`${series.toString()}`, async () => {
			this.log.startTimer('turn data into training data');
			const data = await this.getTrainingData(series);	
			this.log.stopTimer('done!');
			//plot3d(data.map(k => k.x));
			return [data.map(d => ({ x: d.x, y: d.y }))]
		})

		console.log('--- TRAINING DATA --------------------------------');		
		// plotData({
		// 	'x100': trainingData[100].x,
		// 	'x150': trainingData[150].x,
		// 	'x500': trainingData[500].x,
		// })

		//plot3d(trainingData.slice(trainingData.length - 100, trainingData.length - 50).map(k => k.x));
		
return;
		const iterator = this.nn1.train({
			data: trainingData,
			epochs: 10,
			validationSplit: .15,
			//validationData,
		})

		for await (const status of iterator) {
			// if (status.seconds > 100000) {
			// 	status.stop();
			// }
		}
	}

	async getTrainingData(series) {

		const result = new Array(series.length);
		result.length = 0;
		let index = 0;

		for (let i = 200; i < (series.length - 8); i++) {
			const data = series.get(i);
			const periods = util.fibonacci(1000);

			this.log.writeProgress(i, series.length);

			const timestamp = moment(data.timestamp);
			result.push({
				index: index++,
				data: data,
				scaleMinMax: [
					data.volume,
					timestamp.isoWeekday(),
					timestamp.get('hour'),
					...periods.map(p => data.getSMA(p)),
					...periods.map(p => data.getWMA(p)),
					...periods.map(p => data.getRSI(p)),
					...periods.map(p => data.getATR(p)),
				],
				scaleByMean: [
					data.open,
					data.close,
					data.low,
					data.high,
				],
				halfLife: [
					...periods.map(p => maxBy(data.getPrev(p), d => d.open) < data.open),
					...periods.map(p => maxBy(data.getPrev(p), d => d.close) < data.close),
					...periods.map(p => minBy(data.getPrev(p), d => d.open) > data.open),
					...periods.map(p => minBy(data.getPrev(p), d => d.close) > data.close),
					...Object.values(data.getCandlePattern()),
				],
				x: [
					//...util.range(1, 100).map(k => Math.random() > 0.5 ? 1 : 0)
				],
				 y: [
					data.close < series.get(i + 8).getSMA(8),
					data.close >= series.get(i + 8).getSMA(8),
				].map(k => k ? 1 : 0)
			});
		}

		for (let i = 0; i < result[0].scaleMinMax.length; i++) {
			const original = result.map(r => r.scaleMinMax[i]);
			const converted = util.scaleMinMax(original, false);
			result.forEach((r, n) => r.x.push(converted[n]));
		}

		for (let i = 0; i < result[0].scaleByMean.length; i++) {
			const original = result.map(r => r.scaleByMean[i]);
			const converted = util.scaleMinMax(util.scaleByMean(original, 100)); // TODO: Konfigurierbar machen
			result.forEach((r, n) => r.x.push(converted[n]));
		}

		for (let i = 0; i < result[0].halfLife.length; i++) {
			const original = result.map(r => r.halfLife[i]);
			const converted = util.halfLife(original.map(k => k ? 1 : 0), .8);
			result.forEach((r, n) => r.x.push(converted[n]));
		}

		return result;
	}

}
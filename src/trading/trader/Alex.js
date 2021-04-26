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
const { maxBy, minBy, range, avgBy } = require("../../shared/util");
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
			symbol: Symbols.EURUSD_HOURLY_HISTORICAL, 
			limit: undefined, 
			caching: true
		});
		const validation = await this.getTrainingData({
			symbol: Symbols.NASDAQ_HOURLY, 
			limit: 2000, 
			caching: true
		});

		const iterator = this.nn1.train({
			data: training.data,
			validationData: validation.data,
			epochs: 6,
			minProbability: .7
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
				scaleMinMax: true
			}, {
				x: validation.series.map(d => d.timestamp),
				//'Profitable': validation.data.map(d => d.y[0]),
				'Closing Price': validation.series.map(d => d.close),
				'AI Loss': validation.data.map(d => d.prediction[1]),
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
			this.log.startTimer('turn data into training data');
			const data = await this.getTrainingDataFromSeries(series);	
			this.log.stopTimer('done!');
			//plot3d(data.map(k => k.x));
			return data.map(d => ({ i: d.index, x: d.x, y: d.y }));
		};

		const data = !caching ? await getter() : await this.cache.getCachedAsync(`${series.toString()}`, getter);
		this.log.stopTimer('done!');

		return { data, series };
	}

	async getTrainingDataFromSeries(series) {

		const datasets = series.toArray(200, -8);

		let index = 0;
		const result = new Array(datasets.length);
		result.length = 0;

		for (let i = 0; i < datasets.length; i++) {
			const data = datasets[i];
			const periods = util.fibonacci(1000);

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
					timestamp.isoWeekday(),
					timestamp.get('hour'),
					...periods.map(p => data.getSMA(p)),
					...periods.map(p => data.getWMA(p)),
					...periods.map(p => data.getRSI(p)).filter(s => !isNaN(s)),
					...periods.map(p => data.getATR(p)),
					...data.getPrev(30, false, false).map(d => d.progress),
					...data.getPrev(30, false, false).map(d => d.volume),
				],
				scaleByMean: [
					...data.getPrev(30, true, false).map(d => d.close),
					...data.getPrev(30, true, false).map(d => d.open),
					...data.getPrev(30, true, false).map(d => d.low),
					...data.getPrev(30, true, false).map(d => d.high),
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
					trade.profit > 0,
					trade.profit < 0,
					// series.get(i + 8).getSMA(4) > data.getSMA(4),
					// series.get(i + 8).getSMA(4) < data.getSMA(4),
					
				].map(k => k ? 1 : 0)
			});
		}

		for (let i = 0; i < result[0].scaleMinMax.length; i++) {
			const original = result.map(r => r.scaleMinMax[i]);
			const converted = util.scaleMinMax(original);
			result.forEach((r, n) => r.x.push(converted[n]));
		}

		for (let i = 0; i < result[0].scaleByMean.length; i++) {
			const original = result.map(r => r.scaleByMean[i]);
			const converted = util.scaleMinMax(util.scaleByMean(original, 30)); // TODO: Konfigurierbar machen
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
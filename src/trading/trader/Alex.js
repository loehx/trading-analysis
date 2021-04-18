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
const { maxBy, minBy } = require("../../shared/util");
const { slice } = require("@tensorflow/tfjs-core");

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

		const series = await this.factory.getDataSeries(Symbols.NASDAQ_HOURLY_HISTORICAL, {
			//limit: 40000
		});
		// const validationSeries = await this.factory.getDataSeries(Symbols.NASDAQ_HOURLY, {
		// 	limit: 1000
		// });
		this.log.startTimer('.getTrainingData(series)');

		const trainingData = await this.getTrainingData(series);
		//const validationData = await this.getTrainingData(validationSeries);
		
		console.log('--- TRAINING DATA --------------------------------');
		
		trainingData.slice(0, 20).forEach(d => {
			console.log(d.index, d.x.slice(0, 30).join('') + '...', '->', d.y.join(''), d.data.toString());
		})

		// this.cache.setItem('log', logLines);

		// console.log('--- VALIDATION DATA ------------------------------');
		// validationData.slice(0, 20).forEach(d => {
		// 	console.log(d.index, d.x.slice(0, 30).join('') + '...', '->', d.y.join(''), d.data.toString());
		// })

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

		// const tradeOptions = TradeOptions.forEtoroIndices({
		// 	takeProfit: 1,
		// 	stopLoss: 1,
		// 	dir: 'long',
		// 	leverage: 20,
		// 	maxDays: 4
		// });

		const avgVolume = series.avgVolume;

		const result = new Array(series.length);
		result.length = 0;

		for (let i = 200; i < (series.length - 4); i++) {
			const data = series.get(i);
			
			// const trade1 = new Trade(data, tradeOptions);
			// if (trade1.isOpen) {
			// 	return;
			// }
			const periods = [1,2,4,6,8,12,14,16,20,24,32,64,128,256,512,1024];

			const timestamp = moment(data.timestamp);
			result.push({
				index: data.index,
				data: data,
				x: [
					//Math.random() > 0.7 ? (trade1.netProfit > 0) : 0,
					//trade1.profit > 0 ? 1 : 0,
					//trade2.profit > 0 ? 1 : 0,
					// acc: 50.5%
					...util.oneHot(timestamp.isoWeekday(), [1, 7]),
					// acc: 51.5%
					...util.oneHot(timestamp.get('hour'), [0, 23]),
					
					data.open > data.close,
					data.volume > avgVolume,
					data.prev.volume > data.volume,
					...util.oneHot(data.volume / avgVolume, [0, 6], true),
					data.progress > 0.02,
					data.progress > 0.01,
					data.progress > 0.005,
					data.progress > 0.001,
					data.progress > 0.0001,
					data.progress > 0,
					data.progress < 0,
					data.progress < -0.0001,
					data.progress < -0.001,
					data.progress < -0.005,
					data.progress < -0.01,
					data.progress < -0.02,
					...periods.map(p => maxBy(data.getPrev(p), d => d.open) < data.open),
					...periods.map(p => maxBy(data.getPrev(p), d => d.close) < data.close),
					...periods.map(p => minBy(data.getPrev(p), d => d.open) > data.open),
					...periods.map(p => minBy(data.getPrev(p), d => d.close) > data.close),
					...periods.map(p => data.getSMA(p) > data.open),
					...periods.map(p => data.getSMA(p) > data.close),
					...periods.map(p => data.getSMA(p) < data.open),
					...periods.map(p => data.getSMA(p) < data.close),
					// ...periods.map(p => data.getWMA(p) > data.open),
					// ...periods.map(p => data.getWMA(p) > data.close),
					// ...periods.map(p => data.getWMA(p) < data.open),
					// ...periods.map(p => data.getWMA(p) < data.close),
					...periods.map(p => data.getRSMA(p) > 0),
					...periods.map(p => data.getRWMA(p) > 0),
					...periods.map(p => data.getRATR(p) > 0),
					...periods.map(p => data.getRSI(p) < 30),
					...periods.map(p => data.getRSI(p) < 50),
					...periods.map(p => data.getRSI(p) > 50),
					...periods.map(p => data.getRSI(p) > 70),
					...periods.map(p => data.getRRSI(p) > 0),

					//...util.range(1, 100).map(k => Math.random() > 0.5 ? 1 : 0)
				].map(k => k ? 1 : 0),
				 y: [
					data.close < series.get(i + 2).close,
					data.close >= series.get(i + 2).close,
					// data.close < series.get(i + 4).close,
					// data.close >= series.get(i + 4).close,
					//series.get(i + 2).progress > 0,
					//trade1.netProfit > 0 ? 1 : 0,
					//trade2.profit > 0 ? 1 : 0,
				].map(k => k ? 1 : 0)
			});
		}

		// let i = result.length;
		// for(let i = result.length - 1; i >= 4; i--) {
		// 	result[i].x.push(...result[i - 1].x);
		// 	result[i].x.push(...result[i - 2].x);
		// 	result[i].x.push(...result[i - 3].x);
		// 	result[i].x.push(...result[i - 4].x);
		// }

		// return result.slice(4);
		return result;
	}

}
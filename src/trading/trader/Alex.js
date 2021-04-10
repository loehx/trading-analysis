const Trade = require("../Trade");
const NeuralNetwork = require("../../ai/NeuralNetwork");
const { DataFactory, Symbols, Data } = require("../../data");
const { Log } = require("../../shared/log");
const util = require("../../shared/util");
const Trader = require("./base");
const { TradeOptions } = require("..");
const { assert } = require("../../shared/assertion");
const moment = require('moment');
const Cache = require("../../shared/cache");

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
			inputActivation: 'sigmoid', 
			inputUnits: 64, 
			outputActivation: 'tanh', 
			hiddenLayers: [
				{ dropout: 0.2 },
				{ units: 32, activation: 'relu' },
				{ dropout: 0.1 },
				{ units: 8, activation: 'relu' }
			], 
		})

		//await this.nn1.tryLoad();
	}

	async prepare() {

		this.log.startTimer('.getDataSeries(Symbols.NASDAQ_HOURLY_HISTORICAL)')
		const series = await this.factory.getDataSeries(Symbols.NASDAQ_HOURLY_HISTORICAL);
		this.log.stopTimer();
		this.log.startTimer('.getTrainingData(series)');

		//const trainingData = await this.getTrainingData(series);
		this.cache.clear();
		const trainingData = await this.cache.getCachedAsync('trainingData', async () => await this.getTrainingData(series));
		
		trainingData.forEach(d => {
			console.log(d.index, d.x.join(''), '->', d.y.join(''), d.profitability);
		})
		this.log.stopTimer();

		const iterator = this.nn1.train({
			data: trainingData,
			epochs: 20
		})

		for await (const status of iterator) {
			if (status.seconds > 1000) {
				status.stop();
			}
		}
	}

	async getTrainingData(series) {

		const tradeOptions1 = new TradeOptions({
			takeProfit: 0.5 / 20,
			stopLoss: 0.5 / 20,
			dir: 'long',
			amount: 1,
			spread: 0.0002
		});

		const tradeOptions2 = new TradeOptions({
			takeProfit: 0.2 / 20,
			stopLoss: 0.2 / 20,
			dir: 'long',
			amount: 1,
			spread: 0.0002
		});

		return series.toArray().map((data) => {

			const trade1 = new Trade(data, tradeOptions1);
			trade1.makeFutureAware();

			const trade2 = new Trade(data, tradeOptions2);
			trade2.makeFutureAware();

			const periods = [1,2,4,8,16,32,64,128,256,512,1024];

			const timestamp = moment(data.timestamp);
			return {
				index: data.index,
				data: data.toString(),
				profitability: [trade1.profitability, trade2.profitability],
				x: [	
					//trade1.profit > 0 ? 1 : 0,
					//trade2.profit > 0 ? 1 : 0,
					// acc: 50.5%
					...util.oneHot(timestamp.isoWeekday(), [1, 7]),
					// acc: 51.5%
					...util.oneHot(timestamp.get('hour'), [0, 23]),
					...periods.map(p => data.getRSMA(p) > 0 ? 1 : 0),
					...periods.map(p => data.getRWMA(p) > 0 ? 1 : 0),
					...periods.map(p => data.getRATR(p) > 0 ? 1 : 0),
					...periods.map(p => data.getRSI(p) < 30 ? 1 : 0),
					...periods.map(p => data.getRSI(p) < 50 ? 1 : 0),
					...periods.map(p => data.getRSI(p) > 50 ? 1 : 0),
					...periods.map(p => data.getRSI(p) > 70 ? 1 : 0),
					...periods.map(p => data.getRRSI(p) > 0 ? 1 : 0),

					//...util.range(1, 10).map(k => Math.random() > 0.5 ? 1 : 0)
				],
				 y: [
					trade1.profit > 0 ? 1 : 0,
					//trade2.profit > 0 ? 1 : 0,
				]
			}
		});
	}

}
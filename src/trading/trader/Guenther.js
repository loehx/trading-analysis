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
const { maxBy, minBy, oneHot, reverseOneHot } = require("../../shared/util");
const { slice } = require("@tensorflow/tfjs-core");

class TrainingData {
	constructor() {

	}
}

module.exports = class Guenther extends Trader {

	constructor(log) {
		super();
		this.log = new Log('Guenther', log);
		this.factory = new DataFactory(this.log);
		this.cache = new Cache('Guenther')
		this.nn1 = new NeuralNetwork({
			id: 'guenther-nn1',
			log: this.log,
			optimizer: 'adam',
			loss: 'meanSquaredError', 
			inputActivation: 'elu', 
			//inputUnits: 256, 
			outputActivation: 'softmax', 
			hiddenLayers: [
				{ units: 48, activation: 'elu' },
				{ dropout: 0.1 },
				{ units: 32, activation: 'elu' },
				// { units: 30 },
				//{ units: 8, activation: 'relu' }
			], 
		})

		//await this.nn1.tryLoad();
	}

	async run() {

		const PRE_VALUES = 90;

		const series = await this.factory.getDataSeries(Symbols.NASDAQ_HOURLY_HISTORICAL, {
			//limit: 40000
		});
		// const validationSeries = await this.factory.getDataSeries(Symbols.NASDAQ_HOURLY, {
		// 	limit: 1000
		// });
		this.log.startTimer('.getTrainingData(series)');

		const trainingData = await this.getTrainingData(series, PRE_VALUES);
		//const validationData = await this.getTrainingData(validationSeries);
	

		// this.cache.setItem('log', logLines);

		// console.log('--- VALIDATION DATA ------------------------------');
		// validationData.slice(0, 20).forEach(d => {
		// 	console.log(d.index, d.x.slice(0, 30).join('') + '...', '->', d.y.join(''), d.data.toString());
		// })

		const iterator = this.nn1.train({
			data: trainingData,
			epochs: 10,
			validationSplit: .15,
			//randomize: true
			//validationData,
		})

		for await (const status of iterator) {

			const predA = () => this.nn1.predict(util.range(0, 0.99, 1/PRE_VALUES));
			console.log('predA', predA.toString(), '=>', reverseOneHot(predA(), [-20, +120], 10));

			const predB = () => this.nn1.predict(util.range(0, 0.99, 1/PRE_VALUES).reverse());
			console.log('predB', predB.toString(), '=>', reverseOneHot(predB(), [-20, +120], 10));

			// if (status.seconds > 100000) {
			// 	status.stop();
			// }
		}
	}

	async getTrainingData(series, PRE_VALUES) {

		const result = new Array(series.length);
		result.length = 0;

		for (let i = PRE_VALUES; i < (series.length - 4); i++) {
			const data = series.get(i);
			const prev = data.getPrev(PRE_VALUES);
			const next = data.getNext(4);
			const base = minBy(prev, d => Math.min(d.open, d.close));
			let rprev = prev.map(d => Math.min(d.open, d.close) - base);
			let rnext = next.map(d => Math.min(d.open, d.close) - base);
			const max = Math.max(...rprev);

			rprev = rprev.map(r => r / max);
			rnext = rnext.map(r => r / max);
			
			result.push({
				index: data.index,
				data: data,
				x: rprev,
				//x: rprev.map(r => oneHot(r * 100, [0, 100], true, 10)).flat(),
				//y: rnext,
				//y: [rnext[0]],
				y: oneHot(rnext[0] * 100, [-20, +120], true, 10),
			});
		}

		return result;
	}

}
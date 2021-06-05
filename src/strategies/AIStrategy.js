const Trade = require("../trading/Trade");
const NeuralNetwork = require("../ai/NeuralNetwork");
const { DataFactory, Symbols, Data, DataSeries } = require("../data");
const { Log } = require("../shared/log");
const util = require("../shared/util");
const Trader = require("../trading/trader/base");
const { TradeOptions } = require("../trading");
const { assert } = require("../shared/assertion");
const moment = require('moment');
const Cache = require("../shared/cache");
const { maxBy, minBy, range, avgBy, flatten, scaleByMean, scaleByRelation, difference, scaleMinMax, crossJoinByProps, halfLife, reduceSpikes, movingAverage } = require("../shared/util");
const { slice } = require("@tensorflow/tfjs-core");
const { plot2d, plot3d } = require("../shared/plotting");
const indicators = require("../shared/indicators");


module.exports = class AIStrategy extends Trader {

	constructor(options) {
		super();
		this.log = new Log('AIStrategy', options.log);
		this.factory = new DataFactory(this.log);
		this.cache = new Cache('AIStrategy')
		this.nn1 = new NeuralNetwork({
			id: 'aistrategy-nn1',
			log: this.log,
			optimizer: 'adam',
			//learningRate: .0001,
			loss: 'meanSquaredError', // 'binaryCrossentropy',
			inputActivation: 'leakyrelu', 
			//inputUnits: 512, 
			hiddenLayers: [
				{ dropout: .1 },
				{ units: 128, activation: 'leakyrelu' },
				// { units: 90, activation: 'leakyrelu' },
				// { dropout: .1 },
				// { dropout: .1 },
				// { units: 80, activation: 'leakyrelu' },
				//  { dropout: .1 },
				// { units: 64, activation: 'leakyrelu' },
				//  { dropout: .1 },
				// { units: 100, activation: 'leakyrelu' },
				// { dropout: .1 },
				// { units: 16, activation: 'leakyrelu' },
				// //{ dropout: .1 },
		
			], 
			outputActivation: 'softmax', 
		})

		this.config = {
			minProbability: .5,
			hoursToPredict: 48,
			epochs: 6,
			validationSplit: .15,
			periods: [ 2, 4, 8, 16, 30, 48, 60, 80, 100, 150, 300, 500],
			...options
		};
	}

	async train() {
		await this.trainOn({
			symbols: [ 
				Symbols.EURUSD_HOURLY_HISTORICAL,
			],
		});	
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
				limit: limit && (limit / symbols.length), 
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
			epochs: Math.ceil(epochs/2),
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

		const result = new Array(series.length);
		result.length = 0;

		this.log.startTimer('generate y')
		const y = this.getYs(series);
		this.log.stopTimer('done!');

		const start = series.length - y.length;
		const end = series.length;

		for (let i = start; i < end; i++) {
			const data = series.get(i);

			result.push({
				index: data.index,
				data: data,
				x: this.getX(data),
				y: y[i]
			});
		}

		series.clearCache();

		plot3d(
			...util.getExamples(result, 5).map(r => ({
				title: r.data.toString(),
				z: r.x
			}))
		)

		plot2d({
				x: series.map(t => t.index),
				...util.getExamples(result, 10).reduce((o,xy,i) => ({ ...o, ['x #' + xy.index]: xy.x }), {})
			}, {
				x: series.map(t => t.index),
				'close': series.closes,
			}, 
		)

		this.log.stopTimer('done');

		return result;

	}

	getX(data) {
		const { periods } = this.config;

		const ema1 = periods.map(p => data.calculate('EMA', p));
		const ema2 = [ema1.slice(1), data.close];
		const min = periods.map(p => data.calculate('MIN', p));
		const max = periods.map(p => data.calculate('MAX', p));

		data.index === 1000 && plot2d({
			ema1,
			ema2,
			'util.difference(ema1, ema2)': util.difference(ema1, ema2),
			'max': max,
			'min': min,
			' util.difference(max, min)': util.difference(max, min),
			scaleMinMax: true
		})

		return [
			...util.difference(ema1, ema2).map(d => d > 0 ? 1 : 0),
			...max.map(n => n > data.close ? 1 : 0),
			...min.map(n => n > data.close ? 1 : 0),
			...util.difference(max, min).map(k => k > 0 ? 1 : 0)
		];
	}


	getYs(series) {

		return series.map((data, i) => {
			this.log.writeProgress(i, series.length);

			const nextData = data.getNext(this.config.hoursToPredict);
			const avg = util.avgBy(nextData, k => k.close > data.close ? 1 : 0);

			return [avg > .5 ? 1 : 0, avg < .5 ? 1 : 0];
			
		})
	}

	tick({ series, data, buy, log, trades, draw }) {
		
		const { maxOpenTrades, buyThreshold, sellThreshold } = this.config;

		const openTrades = trades.filter(t => t.isOpen);
		openTrades.forEach((t) => {
			draw('STOPLOSS', t.stopLossPrice);
			draw('TAKEPROFIT', t.takeProfitPrice);
		})

		if (this.lastBuy && (this.lastBuy.index - data.index) < 10) {
			return;
		}

		if (maxOpenTrades < openTrades.length) {
			return false;
		}

		if (data.index < 100) {
			return;
		}


		const x = this.getX(data);
		const prediction = this.nn1.predict(x);
		const [ long, short ] = prediction;
		draw('prediction', data.close * ((long - 0.5) / 10 + 1));

		if (short > sellThreshold) {
			return trades.forEach(t => t.isOpen && t.close());
		}
		
		if (long < buyThreshold) {
			return;
		}

		draw('buy', data.close);
		this.lastBuy = data;

		return buy({
			...this.config
		});
	}

	toString() {
		return `[AIStrategy(${util.toShortString(this.config)})]`
	}

}

const axios = require('axios');
var moment = require('moment');

var tf = require('@tensorflow/tfjs');
var { ATR, SMA } = require('technicalindicators');


module.exports = {

	async getTimeSeriesFromYahoo(symbol, from, to) {
		const response = await axios.get('https://query1.finance.yahoo.com/v8/finance/chart/', {
			params: {
				symbol: 'NDAQ',
				period1: moment(from).unix(),
				period2: moment(to).unix(),
				interval: '1h',
				lang: 'en-US'
			}
		})

		const data = response.data.chart.result[0];
		const timestamp = data.timestamp;
		const { low, close, high, volume, open } = data.indicators.quote[0];

		const timeSeries = new Array(timestamp.length);
		for (let i = 0; i < timestamp.length; i++) {
			timeSeries[i] = {
				timestamp: timestamp[i],
				low: low[i],
				high: high[i],
				open: open[i],
				close: close[i],
				volume: volume[i],
			}
		}

		return timeSeries;
	},

	prepareTimeSeries(series, predictionSize) {
		const highs = series.map(s => s.high);
		const lows = series.map(s => s.low);
		const closes = series.map(s => s.close);

		const sma10 = SMA.calculate({ period: 10, values: closes });
		const sma50 = SMA.calculate({ period: 50, values: closes });
		const sma200 = SMA.calculate({ period: 200, values: closes });
		const atr10 = ATR.calculate({ period: 10, high: highs, low: lows, close: closes });
		const atr50 = ATR.calculate({ period: 50, high: highs, low: lows, close: closes });
		const atr200 = ATR.calculate({ period: 200, high: highs, low: lows, close: closes });
	

		for (let i = 0; i < series.length; i++) {
			const serie = series[i];

			// future progress
			serie.fprogress = (sma10[i] - serie.close) / serie.close * 100;

			serie.sma10 = sma10[i - (series.length - sma10.length)];
			serie.rsma10 = (serie.sma10 - serie.close) / serie.close || 0; // relative

			serie.sma50 = sma50[i - (series.length - sma50.length)];
			serie.rsma50 = (serie.sma50 - serie.close) / serie.close || 0; // relative

			serie.sma200 = sma200[i - (series.length - sma200.length)];
			serie.rsma200 = (serie.sma200 - serie.close) / serie.close || 0; // relative
		}
		return;
		console.log('done');
	},

	prepareTraining(series, config) {
		series = series.filter(s => !isNaN(s.fprogress) && isFinite(s.fprogress));
		
		for (let i = 250; i < (series.length - 50); i++) {
			const serie = series[i];

			serie.xs = [
				serie.rsma10,
				serie.rsma50,
				serie.rsma200,
				// Math.max(series[i - 10].sma10, 0),
				// Math.max(serie.sma10, 0),
				// Math.min(series[i - 10].sma10, 0),
				// Math.min(serie.sma10, 0),
			];
		}

		series.sort((a,b) => a.fprogress - b.fprogress);

		const groupCount = config.groups;
		const groups = new Array(groupCount).fill(0).map((_,i) => {
			const from = series.length / groupCount * i;
			const to = from + series.length / groupCount;
			return series.slice(from, to);
		});

		groups.forEach((group, index) => {
			const min = Math.min(...group.map(s => s.fprogress))
			const max = Math.max(...group.map(s => s.fprogress))

			console.log('Group', index, 'from', min, 'to', max);

			group.forEach(s => {
				s.ys = new Array(groups.length).fill(0);
				s.ys[index] = 1;
				s.groupIndex = index;
			})
		})
	},

	async trainModel(series, config) {
		const { optimizer, activation, loss, epochs, lr } = config;
		//console.log(JSON.stringify(config, null, 4).replace(/"/g, ''));

		const trainingSeries = series.filter(k => k.xs && k.ys);
		const inputCount = trainingSeries[0].xs.length;
		const outputCount = trainingSeries[0].ys.length;
		const model = tf.sequential();
		model.add(tf.layers.dense({ units: inputCount, activation, inputShape: inputCount }));
		model.add(tf.layers.dense({ units: inputCount, activation }));
		model.add(tf.layers.dense({ units: outputCount, activation}));
		model.add(tf.layers.dense({ units: outputCount, activation }));
		model.compile({
			optimizer: tf.train.adam(lr),
			loss,
			//lr,
			metrics: ['accuracy']
		});

		xs = tf.tensor2d(trainingSeries.map(k => k.xs));
		ys = tf.tensor2d(trainingSeries.map(k => k.ys));
		//xs.print();
		//ys.print();
		const start = new Date();
		let lastLoss = 10000;
		await model.fit(xs, ys, {
			epochs,
			verbose: 0,
			shuffle: false,
			callbacks: {
				onEpochEnd: async (epoch, logs) => {
					
					if (epoch % (epochs / 5) === 0) {
						if (true) {
						// if (lastLoss > logs.loss) {
							console.log('#' + epoch, logs.acc, 'after', (new Date() - start) / 1000, 'sec.', Math.round((lastLoss - logs.loss) / lastLoss * 1000000) / 1000000, ' loss: ', logs.loss);
							lastLoss = logs.loss;
						}
					}
					// if (epoch == 300) {
					// 	model.optimizer.setLearningRate(0.14)
					// }

					// if (epoch == 400) {
					// 	model.optimizer.setLearningRate(0.02)
					// }
				}
			}
		});

		//model.summary();
 
		const round = (x) => Math.round(x * 10) / 10;
		const predict = (index) => {
			const serie = trainingSeries.filter((a,i) => i === index)[0];
			const input = tf.tensor2d([serie.xs]);
			//const output = new Array(model.predict(input).dataSync())[0];
			const output = tf.tensor2d([serie.ys]);
			model.evaluate(input, output);

			const max = Math.max(...output);
			const result = output.indexOf(max);
			const expected = serie.groupIndex;
			
			return output.filter((o, i) => {
				return i === expected && o === max;
			}).length > 0;
		}

		const test = (indexesToBeTested) => {
			const right = indexesToBeTested.map(predict).reduce((a,b) => a+b, 0);
			const total = indexesToBeTested.length;
	
			const accuracy = right / total;
			console.log(Object.values(config).join('/'), '=> ACCURACY:', accuracy * 100, '%');
			return accuracy;
		}

		const accuracy = test([44,53,76,45,88,120,520,540,760,800, 322, 344, 255, 655, 766, 354, 77, 125, 162, 711]);
		if (accuracy > 0.5) {
			test([44,53,76,45,88,120,520,540,760,800, 322, 344, 255, 655, 766, 354, 77, 125, 162, 711].map(k => k+1));
		}

		return model;
	},
}

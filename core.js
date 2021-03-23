
const axios = require('axios');
var moment = require('moment');
var util = require('./util');

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

	timeSerieToString({ timestamp, low, high, open, close, volume }) {
		return `${moment(timestamp).format("l")} ${high} [${open} -> ${close}] ${low}`;
	},

	validateTimeSeries(series, { verbose }) {
		const errors = [];
		series.forEach((serie, index) => {
			const error = (message) => errors.push({ message, serie, index });
			if (!serie) {
				return error('empty or null');
			}
			['timestamp', 'low', 'high', 'open', 'close', 'volume'].forEach(name => {
				if (typeof serie[name] === 'undefined' || serie[name] === null) {
					error('property missing: "' + name + '"');
				}
			})
			const { timestamp, low, high, open, close, volume } = serie;
			if (!timestamp.isValid()) {
				error('timestamp is not valid');
			}
			if (high < low) {
				error('assertion failed: high > low');
			}
			if (!(open >= low && close >= low)) {
				error('assertion failed: open >= low && close >= low');
			}
			if (!(open <= high && close <= high)) {
				error('assertion failed: open <= high && close <= high');
			}
		});
		if (verbose) {
			if (errors.length) {
				console.log('Time Series Validation failed with ' + errors.length + ' errors.');
				errors.forEach((e, i) => {
					console.log(i, e.message, e.serie ? this.timeSerieToString(e.serie) : null);
				}) 
			}
			else {
				console.log('Time Series Validation succeeded with no errors.');
			}
		}
		return errors;
	},

	integrateVixIntoTimeSeries(vixSeries, timeSeries) {
		const mapping = {};
		vixSeries.forEach(vix => mapping[vix.timestamp.toDate()] = vix);
		timeSeries.forEach(s => s.vix = mapping[s.timestamp.toDate()]);
		
		const resultCount = timeSeries.filter(s => s.vix).length;
		console.log(resultCount + ' of ' + timeSeries.length + ' could be updated with a VIX serie.');
	},

	prepareTimeSeries(series, predictionSize) {
		const highs = series.map(s => s.high);
		const lows = series.map(s => s.low);
		const closes = series.map(s => s.close);

		const config = {
			smas: [1, 2, 3, 4, 8, 16, 24, 2*24, 3*24, 4*24, 5*24, 7*24, 14*24, 30*24],
			atrs: [1, 2, 3, 4, 8, 16, 24, 2*24, 3*24, 4*24, 5*24, 7*24, 14*24, 30*24],
		};

		const smas = config.smas.map(period => [...new Array(period).fill(0), ...SMA.calculate({ period, values: closes })]);
		const atrs = config.atrs.map(period => [...new Array(period).fill(0), ...ATR.calculate({ period, high: highs, low: lows, close: closes })]);
	
		//const map = {};
		for (let i = 0; i < series.length; i++) {
			const serie = series[i];
			const prev = series[i - 1];
			const next = series[i + 1];

			if (!serie.timestamp) {
				debugger;
			}

			if (!next) {
				continue;
			}
			
			const HOURS_TO_PREDICT = 4;
			const targetSerie = series.find((s,_i) => _i > i && s.timestamp.diff(serie.timestamp, 'hours', true) >= HOURS_TO_PREDICT);

			serie.progress = prev ? (serie.close / prev.close - 1) * 100 : 0;
			//serie.fprogress = (next.close / serie.close - 1) * 100;
			serie.fprogress = targetSerie ? (targetSerie.close / serie.close - 1) * 100 : 0;

			//map[serie.progress - (serie.progress % 1)] = (map[serie.progress - (serie.progress % 1)]  || 0) + 1;

			serie.smas = smas.map(s => s[i]);
			serie.atrs = atrs.map(a => a[i]);

			serie.indicators = [
				serie.volume,
				...serie.smas,
				...serie.atrs
			];

			if (prev && i >= 200) {
				serie.xs = [
					...util.oneHot(serie.progress*2, [-5, 5], true),

					...serie.indicators
				 	 	.map((s, i) => s / prev.indicators[i] - 1).map(n => isNaN(n) ? 0 : n)
					  	.map(s => s > 0 ? 1 : 0),

					...serie.smas.map((s,i) => s - (serie.smas[i - 1] || s)).map(n => n > 0 ? 1 : 0),
					...serie.atrs.map((s,i) => s - (serie.atrs[i - 1] || s)).map(n => n > 0 ? 1 : 0),

					...util.oneHot(serie.timestamp.isoWeekday(), [1, 7]),
					...util.oneHot(serie.timestamp.get('hour'), [0, 23]),

					// n hours high (broke through resistance)
					...[1, 2, 3, 4, 12, 24, 48, 3*24].map(n => Math.max(...closes.slice(i - n, i)) === closes[i] ? 1 : 0)
				]
				// if ((i +1) % 1000 === 0) {
				// debugger;
				// }
			}
		}
		return;
		console.log('done');
	},

	prepareTraining(series, config) {
		series = series.filter(s => !isNaN(s.fprogress) && isFinite(s.fprogress));

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
		model.add(tf.layers.dense({ units: outputCount, activation }));
		model.compile({
			optimizer,
			loss,
			//lr: 0.03,
			metrics: ['accuracy']
		});

		console.log('Start training with ' + trainingSeries.length + ' datasets...');
		xs = tf.tensor2d(trainingSeries.map(k => k.xs));
		ys = tf.tensor2d(trainingSeries.map(k => k.ys));
		xs.print();
		ys.print();
		const start = new Date();
		let lastLogs;
		await model.fit(xs, ys, {
			epochs,
			verbose: 0,
			shuffle: false,
			callbacks: {
				onEpochEnd: async (epoch, logs) => {
					const no = epoch + 1;
					if (!lastLogs) {
						lastLogs = logs;
					}
					
					//if (epoch % (epochs / 1) === 0 || epoch === (epochs - 1)) {
							console.log('#' + no, 
								Math.round(logs.acc*1000000) / 1000000, 
								'after', (new Date() - start) / 1000, 'sec.', 
								Math.round((logs.acc / lastLogs.acc - 1) * 1000000) / 1000000 * 100 + ' % improved');
							lastLogs = logs;
					//}
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

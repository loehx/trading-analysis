
const axios = require('axios');
var moment = require('moment');
var util = require('./util');

var tf = require('@tensorflow/tfjs');
var { ATR, SMA } = require('technicalindicators');


module.exports = {

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
			smas: [2, 3, 4, 8, 16, 24, 2*24, 3*24, 4*24, 5*24, 7*24, 14*24, 30*24],
			atrs: [2, 3, 4, 8, 16, 24, 2*24, 3*24, 4*24, 5*24, 7*24, 14*24, 30*24],
		};

		const avgVolume = series.map(s => s.volume).reduce(function(p,c,i,a){return p + (c/a.length)},0);

		const smas = config.smas.map(period => [...new Array(period).fill(0), ...SMA.calculate({ period, values: closes })]);
		const atrs = config.atrs.map(period => [...new Array(period).fill(0), ...ATR.calculate({ period, high: highs, low: lows, close: closes })]);
	
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
			
			//const HOURS_TO_PREDICT = 4;
			//const targetSerie = series.find((s,_i) => _i > i && s.timestamp.diff(serie.timestamp, 'hours', true) >= HOURS_TO_PREDICT);

			serie.progress = prev ? (serie.close / prev.close - 1) * 100 : 0;
			//serie.fprogress = targetSerie ? (smas[8][i] / smas[8][i+HOURS_TO_PREDICT] - 1) * 100 : 0;
			serie.smas = smas.map(s => s[i]);
			serie.atrs = atrs.map(a => a[i]);

			config.smas.forEach((period, i) => serie['sma'+period] = serie.smas[i]);

			serie.indicators = [
				serie.volume,
				...serie.smas,
				...serie.atrs
			];

			if (prev) {
				// relative indicators
				serie.rindicators = serie.indicators
					.map((s, i) => s / prev.indicators[i] - 1).map(n => isNaN(n) ? 0 : n);
			}

			if (prev && i >= 200) {

				//const channel_max = Math.max(...closes.slice(i - n, i));

				serie.xs = [
					...util.oneHot(serie.progress*2, [-5, 5], true),

					...serie.rindicators.map(s => s > 0 ? 1 : 0),

					...serie.rindicators.map((s, i) => s > 0 && prev.rindicators[i] < 0 ? 1 : 0),
					...serie.rindicators.map((s, i) => s < 0 && prev.rindicators[i] > 0 ? 1 : 0),

					...serie.smas.map((s,i) => s - (serie.smas[i - 1] || s)).map(n => n > 0 ? 1 : 0),
					...serie.atrs.map((s,i) => s - (serie.atrs[i - 1] || s)).map(n => n > 0 ? 1 : 0),

					...util.oneHot(serie.timestamp.isoWeekday(), [1, 7]),
					...util.oneHot(serie.timestamp.get('hour'), [0, 23]),

					// n hours high (broke through resistance)
					...[1, 2, 3, 4, 12, 24, 48, 3*24].map(n => Math.max(...closes.slice(i - n, i)) === closes[i] ? 1 : 0),

					avgVolume > serie.volume ? 1 : 0
				]

				if ((i +1) % 1000 === 0) {
				// debugger;
				}
			}
		}

		return;
		console.log('done');
	},

	prepareTraining(series, config) {
		const { groupCount = 2, hoursToPredict = 8, propName = 'sma8'} = config;

		series = series.filter(s => s[propName]);
		series.slice(0, series.length - hoursToPredict).forEach((s, i) => {
				s.fprogress = (s.close / series[i + hoursToPredict][propName] - 1) * 100;
			});
		series = series.filter(s => !isNaN(s.fprogress) && isFinite(s.fprogress))

		series.sort((a,b) => a.fprogress - b.fprogress);

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

		series = series.filter(k => k.xs && k.ys);
		series.sort(() => Math.random() - 0.5); // shuffle data
		const trainingSeriesCount = Math.round(series.length * 0.90);
		const trainingSeries = series.slice(0, trainingSeriesCount);
		const validationSeries = series.slice(trainingSeriesCount);
		const inputCount = trainingSeries[0].xs.length;
		const outputCount = trainingSeries[0].ys.length;
		const model = tf.sequential();
		model.add(tf.layers.dense({ units: 64, activation, inputShape: inputCount }));
		model.add(tf.layers.dropout(0.1))
		model.add(tf.layers.dense({ units: 32, activation: 'relu' }));
		model.add(tf.layers.dropout(0.1))
		model.add(tf.layers.dense({ units: 16, activation: 'relu' }));
		model.add(tf.layers.dropout(0.1))
		model.add(tf.layers.dense({ units: 8, activation: 'relu'  }));
		model.add(tf.layers.dense({ units: outputCount, activation: 'softmax' }));
		model.compile({
			optimizer,
			loss,
			//lr: 0.03,
			metrics: ['accuracy']
		});

		//model.summary();

		// console.log(trainingSeries.slice(0, 20).map(s => s.xs.join('')).join('\n') + '...');
		// console.log(trainingSeries.slice(series.length - 20).map(s => s.xs.join('')).join('\n'));

		console.log('Start training ...');
		console.log(JSON.stringify({
			trainingData: trainingSeries.length,
			validationData: validationSeries.length,
			inputCount,
			outputCount,
			config

		}, null, 4));
		xs = tf.tensor2d(trainingSeries.map(k => k.xs));
		// negative testing
		// xs = tf.tensor2d(trainingSeries.map(k => new Array(k.xs.length).fill(0).map(n => Math.random() - 0.5 > 0 ? 1 : 0)));
		ys = tf.tensor2d(trainingSeries.map(k => k.ys));
		val_xs = tf.tensor2d(validationSeries.map(k => k.xs));
		val_ys = tf.tensor2d(validationSeries.map(k => k.ys));
		const start = new Date();
		let lastLogs;
		await model.fit(xs, ys, {
			epochs,
			verbose: 0,
			shuffle: false,
			batchSize: 200,
			validationData: [val_xs, val_ys],
			callbacks: {
				onEpochEnd: async (epoch, logs) => {
					const no = epoch + 1;
					if (!lastLogs) {
						lastLogs = logs;
					}
					
					console.log('epoch #' + no, 
						'val_acc:',
						Math.round(logs.val_acc*100000) / 1000, 
						'sec:', 
						(new Date() - start) / 1000, 
						'impr:',
						Math.round((logs.val_acc / lastLogs.val_acc - 1) * 100000) / 1000);
					lastLogs = logs;
				}
			}
		});

		return model;
	},
}

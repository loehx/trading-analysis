
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
			// const sma10 = ATR.calculate({ period: 10, high: highs, low: lows, close: closes }),
			// const sma10 = ATR.calculate({ period: 50, high: highs, low: lows, close: closes }),
			// const sma10 = ATR.calculate({ period: 200, high: highs, low: lows, close: closes }),
	

		for (let i = 0; i < series.length; i++) {
			const serie = series[i];
			serie.future = {
				close: series[i + predictionSize]?.close || 0,
				progress: ((series[i + predictionSize]?.close || 0) - serie.close) / serie.close,
				wentUp: (series[i + predictionSize]?.close || 0) > serie.close
			}

			// future progress
			serie.fprogress = (sma10[i] - serie.close) / serie.close;

			serie.sma10 = sma10[i - (series.length - sma10.length)];
			serie.rsma10 = (serie.sma10 - serie.close) / serie.close || 0; // relative

			serie.sma50 = sma50[i - (series.length - sma50.length)];
			serie.rsma50 = (serie.sma50 - serie.close) / serie.close || 0; // relative

			serie.sma200 = sma200[i - (series.length - sma200.length)];
			serie.rsma200 = (serie.sma200 - serie.close) / serie.close || 0; // relative

		}
		return series;
		console.log('done');
	},

	async trainModel(series, optimizer, activation, loss) {
		console.log('train model ...', optimizer, activation, loss);

		let xs = [];
		let ys = [];
		for (let i = 200; i < (series.length); i++) {
			const serie = series[i];

			xs.push([
				Math.max(serie.rsma10, 0),
				Math.max(serie.rsma50, 0),
				Math.max(serie.rsma200, 0),
				// Math.max(serie.rsma10 * -1, 0),
				// Math.max(serie.rsma50 * -1, 0),
				// Math.max(serie.rsma200 * -1, 0),
			]);
			ys.push([
				Math.random(),
				Math.random(),
				// serie.future.progress,
				// serie.future.progress
				// Math.max(serie.future.progress, 0),
				// Math.max(serie.future.progress * -1, 0)
			]);
		}

		const model = tf.sequential();
		// you will need to provide the size of the individual inputs below 
		// 'elu'|'hardSigmoid'|'linear'|'relu'|'relu6'| 'selu'|'sigmoid'|'softmax'|'softplus'|'softsign'|'tanh'
		model.add(tf.layers.dense({ units: ys[0].length, activation, inputShape: xs[0].length }));
		model.add(tf.layers.dense({ units: 2, activation }));
		model.compile({
			//optimizer: tf.train.adam(0.001),
			//optimizer: 'rmsprop',
			//optimizer: 'sgd',
			optimizer,
			loss,
			lr: 0.001
		});

		xs = tf.tensor2d(xs);
		ys = tf.tensor2d(ys);
		//xs.print();
		//ys.print();
		await model.fit(xs, ys, {
			epochs: 10,
			callbacks: {
				onEpochEnd: async (epoch, logs) => {

					if (epoch % 10 === 0) {
						console.log('#' + epoch, logs.loss);
					}
					if (epoch == 300) {
						model.optimizer.setLearningRate(0.14)
					}

					if (epoch == 400) {
						model.optimizer.setLearningRate(0.02)
					}
				}
			}
		});

		//model.summary();

		return model;
	},

	predictLatest(model, serie) {
		console.log('predict ...');
		const prediction = model.predict(tf.tensor1d(serie.indicators));
		prediction.print();
	}
}

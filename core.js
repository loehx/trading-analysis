
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

	prepareTraining(series) {
		for (let i = 250; i < (series.length - 50); i++) {
			const serie = series[i];
			if (!isFinite(serie.rsma10)) {
				//console.log('INFINITE', JSON.stringify(serie, null, 4));
				continue;
			}

			serie.xs = [
				//...series.slice(i - 3, i).map(s => s.rsma10),
				//...series.slice(i - 3, i).map(s => s.rsma50),
				//...series.slice(i - 3, i).map(s => s.rsma200),
				series[i - 50].sma200,
				series[i - 40].sma200,
				series[i - 30].sma200,
				series[i - 20].sma200,
				series[i - 10].sma200,
				series[i].sma200,
				series[i - 50].sma50,
				series[i - 40].sma50,
				series[i - 30].sma50,
				series[i - 20].sma50,
				series[i - 10].sma50,
				series[i].sma50,
				series[i - 50].sma10,
				series[i - 40].sma10,
				series[i - 30].sma10,
				series[i - 20].sma10,
				series[i - 10].sma10,
				series[i].sma10,
				//rie.rsma50,
				//serie.rsma200,
				//serie.fprogress * 100
				//...series.slice(i - 100, i).map(s => s.close),
			];

			// xs.push([
			// 	// serie.future.progress > 0 ? 1 : 0,
			// 	// serie.future.progress < 0 ? 1 : 0
			// 	prepare(serie.rsma10),
			// 	prepare(serie.rsma50),
			// 	prepare(serie.rsma200),
			// 	// Math.max(serie.rsma10, 0),
			// 	// Math.max(serie.rsma50, 0),
			// 	// Math.max(serie.rsma200, 0),
			// 	// Math.max(serie.rsma10 * -1, 0),
			// 	// Math.max(serie.rsma50 * -1, 0),
			// 	// Math.max(serie.rsma200 * -1, 0),
			// ]);
	
			const prog = serie.fprogress * 100;

			const areas = [-100, -50, -10, -5, -2, -1, 0, 1, 2, 5, 10, 50, 100];
			serie.ys = [0,0,0,0,0,0,0,0,0,0,0,0,0,0];

			areas.forEach((a, i) => {
				if (i === 0) {
					return;
				}

				if (prog > areas[i-1] && prog < a) {
					serie.ys[i-1]++;
					serie.ys[i] += 2;
					serie.ys[i+1]++;
				}
				// if (a > prog) {
				// 	for(let a = 0; a < i; a++) {
				// 		serie.ys[a]++;
				// 	}
				// }
				// if (a < prog) {
				// 	for(let a = i; a < areas.length; a++) {
				// 		serie.ys[a]++;
				// 	}
				// }
			})
			//console.log(prog, serie.ys.join(''));


			//console.log(serie.fprogress * 1000);
			//ys[ys.length - 1].print();
			//console.log('AAA', prog, ys[ys.length - 1].join(''));

			//console.log(xs[xs.length - 1], ' => ', ys[ys.length - 1]);
		}
	},

	async trainModel(series, config) {
		const { optimizer, activation, loss, epochs, lr } = config;
		console.log(JSON.stringify(config, null, 4).replace(/"/g, ''));

		const trainingSeries = series.filter(k => k.xs && k.ys);
		const inputCount = trainingSeries[0].xs.length;
		const outputCount = trainingSeries[0].ys.length;
		const model = tf.sequential();
		model.add(tf.layers.dense({ units: inputCount, activation, inputShape: inputCount }));
		model.add(tf.layers.dropout({ rate: 0.2 }));
		model.add(tf.layers.dense({ units: inputCount * 2 }));
		model.add(tf.layers.dense({ units: outputCount * 2 }));
		model.add(tf.layers.dense({ units: outputCount }));
		model.compile({
			optimizer,
			loss,
			lr,
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
 
		const getter = (index) => tf.tensor2d(trainingSeries.filter((a,i) => i === index).map(k => k.xs));
		model.predict(getter(0, 10, 50)).print();

		return model;
	},

	predictLatest(model, serie) {
		console.log('predict ...');
		const prediction = model.predict(tf.tensor1d(serie.indicators));
		prediction.print();
	}
}

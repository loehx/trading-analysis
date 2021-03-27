

var moment = require('moment');
var core = require('./src/core');
var data = require('./src/data');

(async () => {
	try {
		const timeSeries = await data.getData('NASDAQ_HOURLY');
		core.validateTimeSeries(timeSeries, { verbose: true });
		//const vixSeries = await data.getData('VIX_HOURLY');
		//core.validateTimeSeries(vixSeries, { verbose: false });
		//core.integrateVixIntoTimeSeries(vixSeries, timeSeries);
		core.prepareTimeSeries(timeSeries);
		core.prepareTraining(timeSeries, {
			groupCount: 2,
			hoursToPredict: 8,
			propName: 'close'
		});

		const activations = [
			//'elu',
			// 'hardSigmoid',
			// 'linear',
			// 'relu',
			//'relu6',
			//'selu',
			//'sigmoid',
			//'softmax',
			//'softplus',
			//'softsign',
			'tanh'
		];
		const optimizers = [
			//'sgd',
			'adam',
			//'rmsprop'
		];
		const losses = [
			//'binaryCrossentropy',
			//'categoricalCrossentropy',
			//'cosineProximity',
			//'meanAbsoluteError',
			//'meanAbsolutePercentageError',
			'meanSquaredError',
		]

		for (let optimizer of optimizers) {
			for (let activation of activations) {
				for (let loss of losses) {

					await core.trainModel(timeSeries, {
						optimizer,
						activation,
						loss,
						epochs: 3,
						fakeInput: true
					});

					for(let i = 0; i < 5; i++) {
						await core.trainModel(timeSeries, {
							optimizer,
							activation,
							loss,
		 					epochs: 500
						});
					}
				}
			}
		}

	} catch (error) {
		console.error('error', error.stack || error.message || error);
	}
})();
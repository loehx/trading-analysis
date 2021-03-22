

var moment = require('moment');
var core = require('./core');

(async () => {
	try {
		const symbol = '^IXIC';
		const yearsAgo = (y) => moment().add(-y, 'years');
		const timeSeries = [
			...await core.getTimeSeriesFromYahoo(symbol, yearsAgo(1)),
		];
		core.prepareTimeSeries(timeSeries);
		core.prepareTraining(timeSeries, {
			groups: 2
		});

		const activations = [
			//'elu',
			// 'hardSigmoid',
			// 'linear',
			'relu',
			//'relu6',
			//'selu',
			//'sigmoid',
			//'softmax',
			//'softplus',
			//'softsign',
			// 'tanh'
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

		const lrs = [
			1,
			3,
			0.1,
			0.3,
			0.01,
			0.03,
			0.001,
			0.0003,
			0.0003,
			0.0003,
			0.0001,
			0.0001,
			0.0001,
		]

		for (let optimizer of optimizers) {
			for (let activation of activations) {
				for (let loss of losses) {
					for (let lr of lrs) {
						// optimizer = 'sgd';
						// activation = 'relu';
						// loss = 'binaryCrossentropy';
						await core.trainModel(timeSeries, {
							optimizer,
							activation,
							loss,
							epochs: 50,
							lr
						});
					}
				}
			}
		}

	} catch (error) {
		console.error('error', error.message);
	}
})();
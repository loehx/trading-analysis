

var moment = require('moment');
var core = require('./core');

(async () => {
	try {
		const symbol = 'NDAQ';
		const from = moment().add(-1, 'years')
		const timeSeries = await core.getTimeSeriesFromYahoo(symbol, from);
		core.prepareTimeSeries(timeSeries);
		core.prepareTraining(timeSeries);

		const activations = [
			//'elu',
			'hardSigmoid',
			'linear',
			'relu',
			//'relu6',
			//'selu',
			'sigmoid',
			'softmax',
			//'softplus',
			//'softsign',
			'tanh'
		];
		const optimizers = [
			'sgd',
			'adam',
			'rmsprop'
		];
		const losses = [
			'binaryCrossentropy',
			//'categoricalCrossentropy',
			//'cosineProximity',
			//'meanAbsoluteError',
			//'meanAbsolutePercentageError',
			//'meanSquaredError',
		]

		const lrs = [
			// 3,
			0.3,
			// 0.1,
			0.03,
			//0.01,
			//0.003,
			//0.001,
			// 0.0003,
			// 0.0001,
		]

		for (let optimizer of optimizers) {
			for (let activation of activations) {
				for (let loss of losses) {
					for (let lr of lrs) {
						await core.trainModel(timeSeries, {
							optimizer,
							activation,
							loss,
							epochs: 100,
							lr
						});
					}
				}
			}
		}

	} catch (error) {
		console.error('error', error);
	}
})();

var moment = require('moment');
var core = require('./core');

(async () => {
	try {
		const symbol = 'NDAQ';
		const from = moment().add(-1, 'years')
		const timeSeries = await core.getTimeSeriesFromYahoo(symbol, from);
		core.prepareTimeSeries(timeSeries, 10);

		const activations = ['elu', 'hardSigmoid', 'linear', 'relu', 'relu6', 'selu', 'sigmoid', 'softmax', 'softplus', 'softsign', 'tanh'];
		const optimizers = ['sgd', 'adam', 'rmsprop'];
		const loss = [
			'binaryCrossentropy',
			'categoricalCrossentropy',
			'cosineProximity',
			'meanAbsoluteError',
			'meanAbsolutePercentageError',
			'meanSquaredError',
		]
		for (let a of activations) {
			for (let o of optimizers) {
				for (let l of loss) {
					await core.trainModel(timeSeries, o, a, l);
				}
			}
		}

		const prediction = core.predictLatest(model, timeSeries[timeSeries.length - 5]);

	} catch (error) {
		console.error('error', error);
	}
})();
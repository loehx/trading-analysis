const tf = require('@tensorflow/tfjs');
const { assert, ensure } = require('../shared/assertion');
const { Log } = require('../shared/log');
const util = require('../shared/util');
const { round } = require('../shared/util');
const NeuralNetworkBase = require('./NeuralNetworkBase')

module.exports = class NeuralNetwork extends NeuralNetworkBase {
	
	constructor({ 
		id, 
		optimizer = 'adam', 
		loss = 'meanSquaredError', 
		inputActivation = 'tanh', 
		inputUnits, 
		outputActivation = 'softmax', 
		hiddenLayers = [], 
		log
	}) {
		super({
			id,
			log: new Log('NeuralNetwork', log)
		})
		this.optimizer = optimizer;
		this.loss = loss;
		this.hiddenLayers = hiddenLayers;
		this.inputUnits = inputUnits;
		this.inputActivation = inputActivation;
		this.outputActivation = outputActivation;
	}

	async _getModel(inputCount, outputCount) {
		if (this.model) {
			return this.model;
		}

		const m = this.model = tf.sequential();

		// first layer
		m.add(tf.layers.dense({
			units: this.inputUnits || inputCount, 
			activation: this.inputActivation,
			inputShape: [inputCount],
		}));

		// middle layer
		for(let layer of this.hiddenLayers) {
			if ('dropout' in layer) {
				m.add(tf.layers.dropout(layer.dropout));
			}
			else {
				m.add(tf.layers.dense(layer));
			}
		}
		
		// output layer
		m.add(tf.layers.dense({ 
			activation: this.outputActivation,
			units: outputCount, 
		}));

		this._compile();

		return m;
	}

	_compile() {
		this.model.compile({ 
			loss: this.loss, 
			optimizer: this.optimizer,
			metrics: ['accuracy']
		});
		this.model.summary();
	}

	async trainOnce(options) {
		const iterator = this.train(options);
		for await(let s of iterator) {
			s.stop();
			return s;
		}
	}

	async* train({ data, epochs = 10, learningRate, validationData, validationSplit, randomize }) {
		assert(() => data.length > 0);

		const inputCount = data[0].x.length;
		const outputCount = data[0].y.length;
		assert(() => inputCount > 0);
		assert(() => outputCount > 0);

		const model = await this._getModel(inputCount, outputCount);

		if (Number.isFinite(validationSplit)) {
			assert(() => 0 < validationSplit && validationSplit < 1)
			const ratio = 1 - round(data.length * validationSplit);
			const allData = data;
			data = allData.slice(0, ratio);
			validationData = allData.slice(ratio);
		}

		if (randomize) {
			this._log('!!! RANDOMIZE INPUTS !!!');
			data = data.map(d => ({
				...d,
				x: new Array(inputCount).map(() => Math.random() > .5 ? 1 : 0)
			}))
		}

		const xs = tf.tensor2d(data.map(d => d.x));
		const ys = tf.tensor2d(data.map(d => d.y));
		const val_xs = validationData && tf.tensor2d(validationData.map(d => d.x));
		const val_ys = validationData && tf.tensor2d(validationData.map(d => d.y));
		
		let start = new Date();
		let _stop = false;

		if (learningRate && model.optimizer) {
			model.optimizer.learningRate = learningRate
		}

		let lastHistory = null;
		let counter = 0;
		const stop = () => _stop = true;
		const setLearningRate = (lr) => model.optimizer.learningRate = lr;

		this._log(`Start training with ${data.length} datasets (in: ${inputCount} / out: ${outputCount})`);
		this._log(`#[epoch] [accuracy] / [loss] after [seconds]`)
		while(!_stop) {
			counter++;
			const { history } = await model.fit(xs, ys, { 
				epochs, 
				verbose: 0,
				validationData: val_xs ? [val_xs, val_ys] : undefined,
			});
			const acc = (history.val_acc || history.acc);
			const accuracy = round(acc[acc.length - 1], 6);
			const loss = round(history.loss[history.loss.length - 1], 6);
			const _epochs = counter * epochs;
			const lossIncrease = lastHistory ? round(loss / lastHistory.loss - 1, 6) : 0;
			const accuracyIncrease = lastHistory ? round(accuracy / lastHistory.accuracy - 1, 6) : 0;
			const ms = (new Date() - start);
			const duration = util.humanizeDuration(ms);
			
			this._log(`#${_epochs} ${accuracy.toFixed(6)} / ${loss.toFixed(6)} after ${duration}`)

			yield lastHistory = {
				epochs: _epochs,
				accuracy,
				loss,
				lossIncrease, 
				accuracyIncrease,
				seconds: ms / 1000,
				stop,
				setLearningRate,
			}
		}
		return null;
	}

	predictBulk(xs) {
		assert(this.model, 'The model has not been trained yet.');
		ensure(xs, Array);
		ensure(xs[0], Array);
		xs = tf.tensor2d(xs);
		return new Array(this.model.predict(xs).dataSync());
	}

	predict(x) {
		const prediction = this.predictBulk([x]);
		return prediction[0];
	}
};

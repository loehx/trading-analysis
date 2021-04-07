const tf = require('@tensorflow/tfjs-node');
const { assert, ensure } = require('../shared/assertion');
const { Log } = require('../shared/log');
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
	}

	async trainOnce(options) {
		const iterator = this.train(options);
		for await(let s of iterator) {
			s.stop();
			return s;
		}
	}

	async* train({ data, epochs = 10, learningRate }) {
		assert(() => data.length > 0);

		const inputCount = data[0].x.length;
		const outputCount = data[0].y.length;
		assert(() => inputCount > 0);
		assert(() => outputCount > 0);

		const model = await this._getModel(inputCount, outputCount);
		const trainingData = tf.tensor2d(data.map(d => d.x));
		const targetData = tf.tensor2d(data.map(d => d.y));
		
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
			const { history } = await model.fit(trainingData, targetData, { epochs, verbose: 0 });
			const acc = (history.val_acc || history.acc);
			const accuracy = round(acc[acc.length - 1], 6);
			const loss = round(history.loss[history.loss.length - 1], 6);
			const _epochs = counter * epochs;
			const lossIncrease = lastHistory ? round(loss / lastHistory.loss - 1, 6) : 0;
			const accuracyIncrease = lastHistory ? round(accuracy / lastHistory.accuracy - 1, 6) : 0;
			const seconds = (new Date() - start) / 1000;
			
			this._log(`#${_epochs} ${accuracy.toFixed(6)} / ${loss.toFixed(6)} after ${seconds}`)

			yield lastHistory = {
				epochs: _epochs,
				accuracy,
				loss,
				lossIncrease, 
				accuracyIncrease,
				seconds,
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
		return this.model.predict(xs).dataSync();
	}

	predict(x) {
		const prediction = this.predictBulk([x]);
		return prediction[0];
	}
};

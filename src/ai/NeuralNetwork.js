const tf = require('@tensorflow/tfjs');
const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');
const config = require("../../config");
const { assert, ensure } = require('../shared/assertion');

assert(() => config['ai.directory']);

module.exports = class NeuralNetwork {
	
	constructor({ id, optimizer, loss, inputActivation, inputUnits, outputActivation, hiddenLayers }) {
		ensure(id, String);
		this.id = id.replace(/[\\/:"*?<>|]+/gi, '-').toLowerCase();
		this.filePath = path.resolve(path.join(config['ai.directory'], this.id));
		this.optimizer = optimizer || 'adam';
		this.loss = loss || 'meanSquaredError';
		this.hiddenLayers = hiddenLayers || [];
		this.inputUnits = inputUnits;
		this.inputActivation = inputActivation || 'tanh';
		this.outputActivation = outputActivation || 'softmax';
		this.eventListener = new EventEmitter();
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

		m.compile({ 
			loss: this.loss, 
			optimizer: this.optimizer,
			metrics: ['accuracy']
		});

		m.summary();

		return m;
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
		let stop = false;

		model.summary();

		if (learningRate) {
			model.optimizer.learningRate = learningRate
		}

		let lastHistory = null;
		let counter = 0;
		while(!stop) {
			const { history } = await model.fit(trainingData, targetData, { epochs, verbose: 0 });
			const accuracy = Math.max(...(history.val_acc || history.acc));
			const loss = Math.max(...history.loss);
			counter++;
			yield lastHistory = {
				epochs: counter * epochs,
				accuracy,
				loss,
				lossIncrease: lastHistory ? (loss / lastHistory.loss - 1) : 0,  
				accuracyIncrease: lastHistory ? (accuracy / lastHistory.accuracy - 1) : 0,  
				seconds: (new Date() - start) / 1000,
				stop: () => stop = true,
				setLearningRate: (lr) => model.optimizer.learningRate = lr
			}
		}
		return null;
	}

	predictBulk(xs) {
		ensure(xs, Array);
		ensure(xs[0], Array);
		xs = tf.tensor2d(xs);
		return this.model.predict(xs).dataSync();
	}

	predict(x) {
		const prediction = this.predictBulk([x]);
		return prediction[0];
	}
	
	async save(id, model) {
		const mpath = this._getFileName(id);
		return fs.stat(mpath);
		if (fs.stat(mpath)) {
			fs.rmdir(mpath);
		}
		return await model.save(fpath);
	}

	async tryLoad(id) {
		const fpath = this._getFileName(id);
		if (fs.stat(mpath)) {
			fs.rmdir(mpath);
		}
		await model.load(fpath);
	}
};

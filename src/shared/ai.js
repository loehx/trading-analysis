const tf = require('@tensorflow/tfjs');
const fs = require('fs');
const path = require('path');
const config = require("../../config");
const { assert, ensure } = require('./assertion');

assert(() => config['ai.directory']);

module.exports = class NeuralNetwork {
	
	constructor({ id, optimizer, loss, inputActivation, outputActivation, hiddenLayer }) {
		ensure(id, String);
		this.id = id.replace(/[\\/:"*?<>|]+/gi, '-').toLowerCase();
		this.filePath = path.resolve(path.join(config['ai.directory'], this.id));
		this.optimizer = optimizer || 'adam';
		this.loss = loss || 'meanSquaedError';
		this.hiddenLayer = hiddenLayer || [];
		this.inputActivation = inputActivation || 'tanh';
		this.outputActivation = outputActivation || 'softmax';
	}

	async _getModel(inputCount, outputCount) {
		if (this.model) {
			return this.model;
		}

		const m = this.model = tf.sequential();

		// first layer
		m.add(tf.layers.dense({
			units: inputCount, 
			activation: this.inputActivation,
			inputShape: [inputCount],
		}));

		// middle layer
		for(let layer of this.hiddenLayer) {
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
			...(this.layers[this.layers.length - 1] || {}),
			units: outputCount, 
		}));

		m.compile({ 
			loss: this.loss, 
			optimizer: this.optimizer 
		});
	}

	onEpochEnd() {
		
	}

	async train(milliseconds, data) {
		assert(() => milliseconds > 0);
		assert(() => data.length > 0);

		const inputCount = data[0].x.length;
		const outputCount = data[0].y.length;
		assert(() => inputCount > 0);
		assert(() => outputCount > 0);

		const model = this._getModel(inputCount, outputCount);
		const start = new Date();

		const trainingData = tf.tensor2d(data.map(d => d.x));
		const targetData = tf.tensor2d(data.map(d => d.y));
		
		while(new Date() - start <= milliseconds) {
			var h = await model.fit(trainingData, targetData, { epochs: 10 });
		}
	}

	async predict(xs) {
		x = tf.tensor2d(x);
		return this.model.predict(x).dataSync();
	}

	async predictSingle(x) {
		return this.predict([x])[0];
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

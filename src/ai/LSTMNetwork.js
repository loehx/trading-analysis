const NeuralNetwork = require("./NeuralNetwork");
const tf = require('@tensorflow/tfjs');

module.exports = class LSTMNetwork extends NeuralNetwork{

	constructor(options) {
		super(options);
	}

	_getModel (inputCount, outputCount) {

		if (this.model) {
			return this.model;
		}

		const m = this.model = tf.sequential();

		m.add(tf.layers.simpleRNN({
			inputShape: [inputCount],
			units: inputCount,
			returnSequences: false
		}));


		// middle layer
		for(let layer of this.hiddenLayers) {
			if ('dropout' in layer) {
				m.add(tf.layers.dropout(layer.dropout));
			}
			else if (layer.lstm) {
				console.log('AAA',  lastUnits);
				m.add(tf.layers.simpleRNNCell({ ...layer }));
			}
			else {
				m.add(tf.layers.dense(layer));
			}

			if ('units' in layer) {
				lastUnits = layer.units;
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
}
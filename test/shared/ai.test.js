
const tf = require('@tensorflow/tfjs');
const fs = require('fs');
const path = require('path');
const { hasUncaughtExceptionCaptureCallback } = require('process');

async function getExampleModel() {
	const model = tf.sequential();
	model.add(tf.layers.dense({units: 10, activation: 'tanh',inputShape: [2]}));
	model.add(tf.layers.dense({units: 1, activation: 'relu',inputShape: [10]}));
	model.compile({loss: 'meanSquaredError', optimizer: 'adam'});
	const training_data = tf.tensor2d([[0,0],[0,1],[1,0],[1,1]]);
	const target_data = tf.tensor2d([[0],[1],[1],[0]]);
	await model.fit(training_data, target_data, {epochs: 100});
	return model;
}

test('save model', async () => {
	const model = await getExampleModel();

	expect(model != null).toBe(true);

	const x = tf.tensor2d([[0, 0]]);
	const y = model.predict(x).dataSync()[0];
	expect(y).toBe(true);
})


const tf = require('@tensorflow/tfjs');
const NeuralNetwork = require('../../src/ai/NeuralNetwork');

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

test('XOR (without NeuralNetwork)', async () => {
	const model = tf.sequential();
	model.add(tf.layers.dense({units: 10, activation: 'sigmoid',inputShape: [2]}));
	model.add(tf.layers.dense({units: 1, activation: 'sigmoid' }));
	model.compile({loss: 'meanSquaredError', optimizer: 'rmsprop', metrics: ['accuracy']});
	model.optimizer.learningRate = 0.01;
	const training_data = tf.tensor2d([[0,0],[0,1],[1,0],[1,1]]);
	const target_data = tf.tensor2d([[0],[1],[1],[0]]);
	const h = await model.fit(training_data, target_data, {epochs: 200});
	expect(h.history.acc[h.history.acc.length - 1]).toBe(1);
});

test('XOR', async () => {
	const nn = new NeuralNetwork({
		id: 'Test: XOR',
		inputActivation: 'sigmoid',
		inputUnits: 10,
		outputActivation: 'sigmoid',
		optimizer: 'rmsprop',
		loss: 'meanSquaredError',
	})

	const training = nn.train({
		epochs: 50,
		learningRate: 0.1,
		data: [
			{ x: [0,0], y: [0] },
			{ x: [0,1], y: [1] },
			{ x: [1,0], y: [1] },
			{ x: [1,1], y: [0] },
		]
	});
	
	for await (const state of training) {
		expect(state.accuracy).toBeGreaterThan(0.49);
		console.log('aaa', state);

		if (state.epochs >= 200) {
			expect(nn.predict([0,0])).toBeLessThan(.5);
			expect(nn.predict([1,0])).toBeGreaterThan(.5);
			expect(nn.predict([0,1])).toBeGreaterThan(.5);
			expect(nn.predict([1,1])).toBeLessThan(.5);
			state.stop();
		}
	}
})

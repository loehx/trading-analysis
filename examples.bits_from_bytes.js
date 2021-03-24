var tf = require('@tensorflow/tfjs');

function resize(arr, newSize, defaultValue) {
	return [...Array(Math.max(newSize - arr.length, 0)).fill(defaultValue), ...arr];
}

async function go() {

	const bits = 8;
	const range = Math.pow(2, bits);

	const numbers = new Array(range).fill(0).map((x, i) => i);
	const numbers_as_bits = numbers
		.map(n => n.toString(2).split('').map(n => Number(n))) // turn number into array of bits 1 -> 00000001, 2 -> 00000010
		.map(k => resize(k, bits, 0));
	const training_data = tf.oneHot(numbers, range);
	const target_data = tf.tensor2d(numbers_as_bits);
	
	const model = tf.sequential();
	model.add(tf.layers.dense({ units: 64, activation: 'tanh', inputShape: range }));
	model.add(tf.layers.dense({ units: bits }));
	model.compile({
		loss: 'meanSquaredError',
		optimizer: 'adam',
	});

	for (let i = 1; i < 6; ++i) {
		var h = await model.fit(training_data, target_data, { epochs: 10 });
		console.log("Loss after Epoch " + i + " : " + h.history.loss[0]);
	}

	const test = (from, to) => {
		console.log('number => should => prediction')
		numbers.slice(from, to).forEach((x, i) => {
			const xs = tf.oneHot([x], range);
			console.log(x
				+ ' => '
				+ numbers_as_bits[i + from].join('')
				+ ' => '
				+ new Array(model.predict(xs).dataSync())[0].map(k => k > 0.5 ? 1 : 0).join('')
			);
		})
	}

	test(0, 10);


}

go();
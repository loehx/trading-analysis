const { assert, ensure } = require("../shared/assertion");

module.exports = class TradeOptions {
	constructor(options) {
		ensure(options, Object);

		const {
			takeProfit,
			stopLoss,
			dir,
			amount,
			spread
		} = {
			takeProfit: 0.5,
			stopLoss: 0.5,
			dir: 'long',
			amount: 1,
			spread: 0.0002,
			...options
		}

		ensure(takeProfit, Number);
		assert(() => takeProfit > 0);
		this.takeProfit = takeProfit;

		ensure(stopLoss, Number);
		assert(() => stopLoss <= 1);
		assert(() => stopLoss > 0);
		this.stopLoss = stopLoss;

		ensure(dir, ['long', 'short']);
		this.dir = dir;

		ensure(amount, Number);
		assert(() => amount > 0);
		this.amount = amount;

		ensure(spread, Number);
		assert(() => spread >= 0);
		this.spread = spread;

		Object.freeze(this);
	}
}

const { assert, ensure } = require("../shared/assertion");


module.exports = class TradeOptions {
	constructor(options) {
		ensure(options, Object);

		const {
			takeProfit,
			stopLoss,
			direction,
			spread,
			leverage,
			nightlyCost
		} = {
			takeProfit: 0.5,
			stopLoss: 0.5,
			direction: 'long',
			spread: 0.0002,
			leverage: 1,
			nightlyCost: 0,
			...options
		}

		ensure(takeProfit, Number);
		assert(() => takeProfit > 0);
		this.takeProfit = takeProfit;

		ensure(stopLoss, Number);
		assert(() => stopLoss <= 1);
		assert(() => stopLoss > 0);
		this.stopLoss = stopLoss;

		ensure(direction, ['long', 'short']);
		this.direction = direction;

		ensure(spread, Number);
		assert(() => spread >= 0);
		this.spread = spread;

		ensure(leverage, Number);
		assert(() => leverage >= 0);
		this.leverage = leverage;

		ensure(nightlyCost, Number);
		assert(() => nightlyCost >= 0);
		this.nightlyCost = nightlyCost;

		Object.freeze(this);
	}

	static forEtoroIndices(options) {
		const leverage = options.leverage || 1;
		return new TradeOptions({
			leverage,
			nightlyCost: 0.00008,
			spread: 0.00017, // TODO: PRÜFEN
			stopLoss: 0.5,
			takeProfit: 0.5,
			...options
		});
	}
}

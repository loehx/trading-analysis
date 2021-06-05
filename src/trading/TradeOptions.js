const { assert, ensure } = require("../shared/assertion");
const { round } = require("../shared/util");


module.exports = class TradeOptions {
	constructor(options) {
		ensure(options, Object);

		const {
			takeProfit,
			stopLoss,
			fixedTakeProfit,
			fixedStopLoss,
			direction,
			spread,
			leverage,
			nightlyCost,
			maxDays,
			noFutureAwareness
		} = {
			...TradeOptions.defaultOptions,
			...options
		}

		if (fixedTakeProfit) {
			this.fixedTakeProfit = fixedTakeProfit;
		}
		else {
			ensure(takeProfit, Number);
			assert(() => takeProfit > 0);
			this.takeProfit = round(takeProfit, 3);
		}

		if (fixedStopLoss) {
			this.fixedStopLoss = fixedStopLoss;
		} else {
			ensure(stopLoss, Number);
			assert(() => stopLoss <= 1);
			assert(() => stopLoss > 0);
			this.stopLoss = round(stopLoss, 3);
		}

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

		ensure(maxDays, Number);
		assert(() => maxDays >= 0);
		this.maxDays = maxDays;

		this.noFutureAwareness = noFutureAwareness;

		Object.freeze(this);
	}

	toString() {
		return `[TradeOptions(${this.direction} x${this.leverage} +${this.takeProfit.toFixed(1)}/-${this.stopLoss.toFixed(1)} ${this.maxDays && this.maxDays + 'd'})]`;
	}

	static defaultOptions = {
		takeProfit: 0.5,
		stopLoss: 0.5,
		direction: 'long',
		spread: 0.0002,
		leverage: 1,
		nightlyCost: 0,
		maxDays: Infinity
	}

	static ETORO_INDICES = {
		nightlyCost: 0.00008,
		spread: 0.00017, // TODO: PRÜFEN
		stopLoss: 0.5,
		takeProfit: 0.5,
	}

	static forEtoroIndices(options) {
		return new TradeOptions({
			...TradeOptions.ETORO_INDICES,
			...options
		});
	}

	static ETORO_FOREX = {
		nightlyCost: 0.000051,
		spread: 0.00005, // TODO: PRÜFEN
		stopLoss: 0.5,
		takeProfit: 0.5,
	}

	static forEtoroForex(options) {
		return new TradeOptions({
			...TradeOptions.ETORO_FOREX,
			...options
		});
	}
}

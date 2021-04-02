const Data = require("../data/Data");
const { assert } = require("../shared/assertion");
const TradeOptions = require("./TradeOptions");

module.exports = class Trade {

	constructor(data, options) {
		assert(() => options instanceof TradeOptions);
		assert(() => data instanceof Data);
		const {
			takeProfit,
			stopLoss,
			dir,
			amount,
			spread,
		} = options;
		this.opions = options;
		this.takeProfit = takeProfit;
		this.stopLoss = stopLoss;
		this.amount = amount;
		this.openedAt = data;

		this.startPrice = data.close * (1 + options.spread);
		this.update(data);
	}

	get dir() { return this.options.dir; }

	get isOpen() { return !this.closedAt; }
	get isClosed() { return !!this.closedAt; }

	get profit() {
		return this.profitability * this.amount;
	}
	get profitability() { 
		return this.currentPrice / this.startPrice - 1; 
	}

	setTakeProfit(takeProfit) {
		ensure(takeProfit, Number);
		assert(() => takeProfit > 0);
		this.takeProfit = takeProfit;
	}

	setStopLoss(stopLoss) {
		ensure(stopLoss, Number);
		assert(() => stopLoss <= 1);
		assert(() => stopLoss > 0);
		this.stopLoss = stopLoss;
	}

	update(data) {
		assert(this.isOpen, 'Trade already closed.');

		this.current = data;
		this.currentPrice = data.close;

		const stopLossPrice = this.startPrice * (1 - this.stopLoss);
		const takeProfitPrice = this.startPrice * (1 + this.takeProfit);
		const stopLossAndTakeProfitAtTheSameTime = data.low <= stopLossPrice && data.high >= takeProfitPrice;
		if (stopLossAndTakeProfitAtTheSameTime) {
			console.warn('stopLossAndTakeProfitAtTheSameTime', {
				this: this,
				stopLossPrice,
				takeProfitPrice
			});
		}

		if (data.low <= stopLossPrice) {
			this.closeAt(stopLossPrice);
		}

		if (data.high >= takeProfitPrice) {
			this.closeAt(takeProfitPrice);
		}

		this.maxDrawdown = Math.min(0, this.profit, this.maxDrawdown || 0);
		this.maxDrawup = Math.max(0, this.profit, this.maxDrawup || 0);
	}

	closeAt(price) {
		assert(() => price >= this.current.low);
		assert(() => price <= this.current.high);

		this.currentPrice = price;
		this.closedAt = this.current;
	}

	close() {
		this.closeAt(this.current.close);
	}

}
const Data = require("../data/Data");
const { assert, ensure } = require("../shared/assertion");
const { round } = require("../shared/util");
const TradeOptions = require("./TradeOptions");

module.exports = class Trade {

	constructor(data, options) {
		assert(() => options instanceof TradeOptions);
		assert(() => data instanceof Data);
		assert(() => data.isAttached);

		this.options = options;
		this.setTakeProfit(options.takeProfit);
		this.setStopLoss(options.stopLoss);
		this.openedAt = data;

		data.dataSeries.subscribe((datasets) => datasets.forEach(d => this.update(d)));

		this.startPrice = data.close * (1 + options.spread);
		this.update(data);

		while(this.isOpen && this.current.next) {
			this.update(this.current.next);
		}
	}

	get dir() { return this.options.dir; }
	get leverage() { return this.options.leverage; }
	get spread() { return this.options.spread; }
	get nightlyCost() { return this.options.nightlyCost; }

	get isOpen() { return !this.closedAt; }
	get isClosed() { return !!this.closedAt; }

	get daysOpen() {
		const diff = this.current.timestamp - this.openedAt.timestamp;
		let days = diff / 1000 / 60 / 60 / 24;
		return days - (days % 1);
	}

	get totalNightlyCost() {
		return this.nightlyCost > 0 ? (this.daysOpen * this.nightlyCost) : 0;
	}

	get profit() { 
		return round((this.currentPrice / this.startPrice - 1) * this.leverage, 6); 
	}

	get netProfit() {
		return this.profit - this.totalNightlyCost;
	}

	setTakeProfit(takeProfit) {
		ensure(takeProfit, Number);
		assert(() => takeProfit > 0);
		this.takeProfit = takeProfit;
		this.actualTakeProfit = takeProfit / this.leverage;
	}

	setStopLoss(stopLoss) {
		ensure(stopLoss, Number);
		assert(() => stopLoss <= 1);
		assert(() => stopLoss > 0);
		this.stopLoss = stopLoss;
		this.actualStopLoss = stopLoss / this.leverage;
	}

	update(data) {
		assert(this.isOpen, 'Trade already closed.');

		this.current = data;
		this.currentPrice = data.close;

		const stopLossPrice = this.startPrice * (1 - this.actualStopLoss);
		const takeProfitPrice = this.startPrice * (1 + this.actualTakeProfit);
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
		else if (data.high >= takeProfitPrice) {
			this.closeAt(takeProfitPrice);
		}

		this.maxDrawdown = Math.min(0, this.profit, this.maxDrawdown || 0);
		this.maxDrawup = Math.max(0, this.profit, this.maxDrawup || 0);
	}

	closeAt(price) {
		// assert(price >= this.current.low, price + ' >= ' + this.current.low);
		// assert(price <= this.current.high, price + ' <= ' + this.current.high);
		this.currentPrice = price;
		this.closedAt = this.current;
	}

	close() {
		this.closeAt(this.current.close);
	}

	toString() {
		return [
			this.dir,
			'@ ' + this.openedAt.close.toFixed(2) + '$',
			(this.netProfit > 0 ? '+' : '') + (this.netProfit * 100).toFixed(0) + '%',
			this.isClosed && 'CLOSED'
		].filter(k => k).join(' ');
	}
}
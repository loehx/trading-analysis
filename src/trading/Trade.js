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

		this.startPrice = data.close * (1 + (options.spread * options.leverage));
		this.low = this.startPrice;
		this.high = this.startPrice;
		this.update(data);

		while(this.isOpen && this.current.next) {
			this.update(this.current.next);
		}

		if (this.isOpen) {
			data.dataSeries.subscribe((datasets) => datasets.forEach(d => this.update(d)));
		}
	}

	get direction() { return this.options.direction; }
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

	get actualTakeProfit() {
		return this.takeProfit / this.leverage;
	}

	get actualStopLoss() {
		return this.stopLoss / this.leverage;
	}

	get stopLossPrice() {
		return round(this.startPrice * (1 - this.actualStopLoss), 6);
	}

	get takeProfitPrice() {
		return round(this.startPrice * (1 + this.actualTakeProfit), 6);
	}

	get maxDrawdown() {
		return round((this.low / this.startPrice - 1) * this.leverage, 6); 
	}

	get maxDrawup() {
		return round((this.high / this.startPrice - 1) * this.leverage, 6); 
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

		const { stopLossPrice, takeProfitPrice } = this;
		const stopLossAndTakeProfitAtTheSameTime = data.low <= stopLossPrice && data.high >= takeProfitPrice;
		if (stopLossAndTakeProfitAtTheSameTime) {
			// console.warn('stopLossAndTakeProfitAtTheSameTime', {
			// 	this: this,
			// 	stopLossPrice,
			// 	takeProfitPrice
			// });
		}

		if (data.low <= stopLossPrice) {
			this.closeAt(stopLossPrice);
		}
		else if (data.high >= takeProfitPrice) {
			this.closeAt(takeProfitPrice);
		}

		if (data.low < this.low) {
			this.low = Math.max(data.low, stopLossPrice);
		}
		if (data.high > this.high) {
			this.high = Math.min(data.high, takeProfitPrice);
		}
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

	getSummary() {
		return {
			startPrice: this.startPrice,
			currentPrice: this.currentPrice,
			
			openedAt: this.openedAt.toString(),
			current: this.current.toString(),
			closedAt: this.closedAt?.toString(),
			
			direction: this.direction,
			leverage: this.leverage,
			spread: this.spread,
			
			nightlyCost: this.nightlyCost,
			daysOpen: this.daysOpen,
			totalNightlyCost: this.totalNightlyCost,

			isOpen: this.isOpen,
			isClosed: this.isClosed,

			profit: this.profit,
			netProfit: this.netProfit,
			
			stopLoss: this.options.stopLoss,
			stopLossPrice: this.stopLossPrice, 
			actualStopLoss: this.actualStopLoss,

			takeProfit: this.options.takeProfit,
			actualTakeProfit: this.actualTakeProfit,
			takeProfitPrice: this.takeProfitPrice,

			maxDrawdown: this.maxDrawdown,
			maxDrawup: this.maxDrawup,
		};
	}

	summary(log) {
		const _log = (log && log.write ? log.write : log) || console.log;
		_log(JSON.stringify(this.getSummary(), null, 4))
	}
}
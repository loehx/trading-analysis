const moment = require("moment");
const Data = require("./Data");
const { ensure, assert } = require("./assertion");
const util = require("../shared/util");
const indicators = require("./indicators");


module.exports = class DataSeries {

	constructor(data) {
		ensure(data, Array);
		assert(() => data.length > 0);
		this.data = [...data];
		this.data.sort((a, b) => a.timestamp - b.timestamp);
		this.data.forEach((d, i) => {
			assert(() => d instanceof Data);
			d._attachTo(this, i)
		});
		Object.freeze(this.data);
	}

	get(index) { return this.data[index]; }

	get first() { return this.data[0]; }
	get last() { return this.data[this.length - 1]; }
	get length() { return this.data.length; }

	get from() { return this.first.timestamp; }
	get to() { return this.last.timestamp; }

	get open() { return this.first.open };
	get close() { return this.last.close };
	get high() { return Math.max(...this.data.map(d => d.high)); };
	get low() { return Math.min(...this.data.map(d => d.low)); };

	get avgOpen() { return util.avg(...this.data.map(d => d.open)); }
	get avgClose() { return util.avg(...this.data.map(d => d.close)); }
	get avgHigh() { return util.avg(...this.data.map(d => d.high)); }
	get avgLow() { return util.avg(...this.data.map(d => d.low)); }
	
	get progress() { return this.close / this.open - 1 }
	
	toShuffledArray() {
		const items = [...this.data];
		items.sort(() => Math.random() - 0.5);
		return items;
	}

	get highs() {
		return this.__getCached('highs', () => this.data.map(d => d.high));
	}

	get lows() {
		return this.__getCached('lows', () => this.data.map(d => d.low));
	}

	get closes() {
		return this.__getCached('closes', () => this.data.map(d => d.close));
	}

	get opens() {
		return this.__getCached('opens', () => this.data.map(d => d.open));
	}

	toArray() {
		return this.data.slice();
	}

	toJSON(beautify = false) {
		return JSON.stringify({
			data: this.data
		}, null, beautify ? 3 : undefined)
	}
	
	getSMA(period) {
		const getter = () => indicators.getSMA(period, this.closes);
		return this.__getCached('sma'+period, getter);
	}

	getWMA(period) {
		const getter = () => indicators.getWMA(period, this.closes);
		return this.__getCached('wma'+period, getter);
	}

	getRSI(period) {
		const getter = () => indicators.getRSI(period, this.closes);
		return this.__getCached('rsi'+period, getter);
	}

	getATR(period) {
		const getter = () => indicators.getATR(period, this.highs, this.lows, this.closes);
		return this.__getCached('atr'+period, getter);
	}

	getCandlePatterns() {
		const getter = () => indicators.getCandlePatterns(this.opens, this.highs, this.closes, this.lows);
		return this.__getCached('cap', getter);
	}

	__getCached(key, getter) {
		let cache = this.__c;
		if (!cache) {
			Object.defineProperty(this, '__c', { writable: true });
			cache = this.__c = {};
		}

		return cache[key] || (cache[key] = getter());
	}

	static mock(count, step, stepType) {
		let from = moment('2000-01-01T00:00:00');
		const data = [];

		for (let i = 0; i < count; i++) {
			data.push(new Data({
				timestamp: from.toDate(),
				low: i,
				open: i + 1,
				close: i + 2,
				high: i + 3,
			}));
			from = from.add(step, stepType);
		}

		return new DataSeries(data);
	}

	static parseJSON(json) {
		ensure(json, String);
		const obj = JSON.parse(json);
		ensure(obj, Object);
		ensure(obj.data, Array);
		return new DataSeries(obj.data.map(d => new Data(d)));
	}
}
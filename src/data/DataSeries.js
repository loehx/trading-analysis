const moment = require("moment");
const Data = require("./Data");
const { ensure, assert } = require("../shared/assertion");
const util = require("../shared/util");
const indicators = require("../shared/indicators");
const EventEmitter = require('events');

module.exports = class DataSeries {

	constructor(data) {
		ensure(data, Array);
		assert(() => data.length > 0);
		this.data = [];
		this.addData(data);
	}

	get(index) { return this.data[index]; }

	get first() { return this.data[0]; }
	get last() { return this.data[this.length - 1]; }
	get length() { return this.data.length; }

	get from() { return this.first.timestamp; }
	get to() { return this.last.timestamp; }

	get open() { return this.first.open };
	get close() { return this.last.close };
	get high() { return util.maxBy(this.data, d => d.high); };
	get low() { return util.minBy(this.data, d => d.low); };

	get avgOpen() { return util.avgBy(this.data, d => d.open); }
	get avgClose() { return util.avgBy(this.data, d => d.close); }
	get avgHigh() { return util.avgBy(this.data, d => d.high); }
	get avgLow() { return util.avgBy(this.data, d => d.low); }
	get avgVolume() { return util.avgBy(this.data, d => d.volume); }
	
	get progress() { return this.close / this.open - 1 }
	
	toShuffledArray() {
		const items = [...this.data];
		items.sort(() => Math.random() - 0.5);
		return items;
	}

	get timestamps() {
		return this.__getCached('timestamps', () => this.data.map(d => d.timestamp));
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

	get volumes() {
		return this.__getCached('volumes', () => this.data.map(d => d.volume));
	}

	getResolution() {
		const first = this.data[0];
		const second = this.data[1];
		if (!second) {
			return '?';
		}
		const ms = second.timestamp - first.timestamp;
		return util.humanizeDuration(ms);
	}

	addData(data) {
		if (data instanceof Data) {
			data = [data];
		}
		this.data = this.data.concat(data);
		this.data.sort((a, b) => a.timestamp - b.timestamp);
		this.data.forEach((d, i) => {
			ensure(d);
			assert(() => d instanceof Data);
			d._attachTo(this, i)
		});
		if (this.__c) {
			delete this['__c']; 
		}
		if (this.eventBus) {
			this.eventBus.emit('newData', data);
		}
	}

	subscribe(fn) {
		const bus = this.eventBus || (this.eventBus = new EventEmitter());
		bus.on('newData', fn);
	}

	unsubscribe(fn) {
		if (!this.eventBus) {
			return false;
		}
		bus.off('newData', fn);
	}

	map(fn) {
		return this.data.map(fn);
	}

	forEach(fn) {
		this.data.forEach(fn);
	}

	toArray(start, count) {
		if (count === 0) {
			return [];
		}
		if (start < 0) {
			start = this.data.length + start;
		}
		if (count < 0) {
			return this.data.slice(start, this.data.length + count);	
		}
		return this.data.slice(start, count && (start + count));
	}

	toJSON(beautify = false) {
		return JSON.stringify({
			data: this.data
		}, null, beautify ? 3 : undefined)
	}
	
	getSMA(period) {
		const getter = () => indicators.getSMAs(period, this.closes);
		return this.__getCached('sma'+period, getter);
	}

	getWMA(period) {
		const getter = () => indicators.getWMAs(period, this.closes);
		return this.__getCached('wma'+period, getter);
	}

	getRSI(period) {
		const getter = () => indicators.getRSIs(period, this.closes);
		return this.__getCached('rsi'+period, getter);
	}

	getATR(period) {
		const getter = () => indicators.getATRs(period, this.highs, this.lows, this.closes);
		return this.__getCached('atr'+period, getter);
	}

	getCandlePatterns() {
		const getter = () => indicators.getCandlePatterns(this.opens, this.highs, this.closes, this.lows);
		return this.__getCached('cap', getter);
	}

	calculate(name, period) {
		return this.__getCached(name + period, () => {
			const data = this.getOpenCloseHighLowVolume();
			return indicators.get(name, period, data);
		})
	}

	getOpenCloseHighLowVolume() {
		return {
			open: this.opens,
			high: this.highs,
			close: this.closes,
			low: this.lows,
			volume: this.volumes
		};
	}

	toString() {
		const { first, last, length } = this;
		return `[DataSeries(${length} x ${this.getResolution()} / ${moment(first.timestamp).format('YYYY-MM-DD')} ${util.humanizeDuration(first.timestamp, last.timestamp)})]`
	}

	clearCache() {
		this.__c = null;
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

	static fromRawData(data) {
		return new DataSeries(data.map(r => new Data(r)));
	}
}
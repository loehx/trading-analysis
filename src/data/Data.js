const moment = require("moment");
const { ensure, assert } = require("../shared/assertion");
const indicators = require("../shared/indicators");
const util = require("../shared/util");


module.exports = class Data {

	constructor(data) {
		const { timestamp, low, high, open, close, volume } = data;
		ensure(data);
		ensure(timestamp);
		ensure(low, Number);
		ensure(high, Number);
		ensure(open, Number);
		ensure(close, Number);

		this.timestamp = moment.utc(timestamp).toDate();
		this.low = low;
		this.high = high;
		this.open = open;
		this.close = close;
		this.volume = volume;

		this._validate();
	}

	get mid() {
		return (this.open + this.close) / 2;
	}

	get hl2() {
		return (this.high + this.low) / 2;
	}

	get ohlc4() {
		return (this.high + this.low + this.close + this.open) / 4;
	}

	get progress() {
		return this.close / this.open - 1;
	}

	get isAttached() {
		return !!this.dataSeries;
	}

	get prev() {
		if (!this.isAttached) {
			return null;
		}
		return this.dataSeries.get(this.index - 1) || null;
	}

	get next() {
		if (!this.isAttached) {
			return null;
		}
		return this.dataSeries.get(this.index + 1) || null;
	}

	getPrev(n, includeSelf = false, padding = false) {
		//return this._getCached(`p${n}${includeSelf}${padding}`, () => {
			this._requireAttachment();
			const s = includeSelf ? 1 : 0;
			const start = this.index - n + s;
			const result = this.dataSeries.toArray(Math.max(start, 0), start < 0 ? n + start : n);
			if (padding) {
				return new Array(n - this.index).fill(null).concat(result);
			}
			return result;
		//})
	}

	getNext(n, includeSelf = false, padding = false) {
		//return this._getCached(`n${n}${includeSelf}${padding}`, () => {
			this._requireAttachment();
			const s = includeSelf ? 1 : 0;
			const start = this.index + s;
			const result = this.dataSeries.toArray(start, n);
			if (padding) {
				return [ ...result, ...new Array(n - this.index).fill(null)];
			}
			return result;
		//})
	}

	getSMA(period) {
		const prev = this.getPrev(period, true);
		return indicators.getSMA(prev.map(d => d.close));
	}

	getRSMA(period) {
		if (!this.prev) {
			return 0
		}
		const current = this.getSMA(period);
		const prev = this.prev.getSMA(period);
		return current / prev - 1;
	}

	getWMA(period) {
		const prev = this.getPrev(period, true);
		return indicators.getWMA(prev.map(d => d.close));
	}

	getRWMA(period) {
		if (!this.prev) {
			return 0
		}
		const current = this.getWMA(period);
		const prev = this.prev.getWMA(period);
		return current / prev - 1;
	}

	getRSI(period) {
		if (period <= 1) {
			return 0;
		}
		const prev = this.getPrev(period + 1, true);
		if (prev.length <= 1) {
			return 0;
		}
		return indicators.getRSI(prev.map(d => d.close));
	}

	getRRSI(period) {
		if (!this.prev) {
			return 0
		}
		const current = this.getRSI(period);
		const prev = this.prev.getRSI(period);
		return current / prev - 1;
	}

	getATR(period) {
		const prev = this.getPrev(period + 1, true);
		if (prev.length <= 1) {
			return 0;
		}
		return indicators.getATR(
			prev.map(d => d.high),
			prev.map(d => d.low),
			prev.map(d => d.close)
		);
	}

	getRATR(period) {
		if (!this.prev) {
			return 0
		}
		const current = this.getATR(period);
		const prev = this.prev.getATR(period);
		return current / prev - 1;
	}

	getCandlePattern() {
		return this._getCached('candlePattern', () => {
			const prev = this.getPrev(4, true);
			return indicators.getCandlePattern(		
				prev.map(d => d.open),
				prev.map(d => d.high),
				prev.map(d => d.close),
				prev.map(d => d.low)
			);
		})
	}

	toString() {
		const { timestamp, low, high, open, close } = this;
		return `[Data(${moment(timestamp).format()} ${open}o ${close}c ${low}l ${high}h)]`;
	}

	toObject() {
		const { timestamp, low, high, open, close, volume } = this;
		return { 
			timestamp, 
			low, 
			high, 
			open, 
			close, 
			volume 
		};
	}


	_validate() {
		const { timestamp, low, high, open, close } = this;
		assert(moment(timestamp).isValid(), 'timestamp is not valid: ' + timestamp);
		assert(high >= low, `.high (${high}) should be equal or greater than .low (${low})`);
		assert(open >= low, `.open (${open}) should be equal or greater than .low (${low})`);
		assert(close >= low, `.close (${close}) should be equal or greater than .low (${low})`);
		assert(open <= high, `.open (${open}) should be equal or smaller than .high (${high})`);
		assert(close <= high, `.close (${close}) should be equal or smaller than .high (${high})`);
	}

	_requireAttachment() {
		assert(this.isAttached, 'Data must be attached to a DataSerie');
	}

	_attachTo(dataSeries, index) {
		Object.defineProperty(this, 'dataSeries', { writable: true });
		Object.defineProperty(this, 'index', { writable: true });
		this.dataSeries = dataSeries;
		this.index = index;
		if (this.__c) {
			this.__c = null;
		}
	}

	_getCached(key, getter) {
		let cache = this.__c;
		if (!cache) {
			Object.defineProperty(this, '__c', { writable: true });
			cache = this.__c = {};
		}

		return cache[key] || (cache[key] = getter());
	}

	static random() {
		const random = Math.random() * 100;
		return new Data({
			timestamp: new Date(),
			low: random,
			high: random * 2,
			open: random * 1.1,
			close: random * 1.7,
		});
	}

	static create(timestamp, low, open, close, high) {
		return new Data({
			timestamp,
			low,
			open,
			close,
			high
		});
	}
}




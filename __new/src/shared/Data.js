const moment = require("moment");
const { ensure, assert } = require("./assertion");


module.exports = class Data {

	constructor(data) {
		const { timestamp, low, high, open, close, volume } = data;
		ensure(data);
		ensure(timestamp);
		ensure(low, Number);
		ensure(high, Number);
		ensure(open, Number);
		ensure(close, Number);

		this.timestamp = moment(timestamp).toDate();
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

	getSMA(period) {
		assert(this.isAttached, 'Data must be attached to a DataSerie');
		this.dataSeries.getSMA(period)[this.index];
	}

	toString() {
		const { timestamp, low, high, open, close } = this;
		return `${moment(timestamp).format()} h:${high} o:${open} c:${close} l:${low}`
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
		assert(moment(timestamp).isValid(), 'timestamp is not valid');
		assert(high >= low, `.high (${high}) should be equal or greater than .low (${low})`);
		assert(open >= low, `.open (${open}) should be equal or greater than .low (${low})`);
		assert(close >= low, `.close (${close}) should be equal or greater than .low (${low})`);
		assert(open <= high, `.open (${open}) should be equal or smaller than .high (${high})`);
		assert(close <= high, `.close (${close}) should be equal or smaller than .high (${high})`);
	}

	_attachTo(dataSeries, index) {
		Object.defineProperty(this, 'dataSeries', { writable: true });
		Object.defineProperty(this, 'index', { writable: true });
		this.dataSeries = dataSeries;
		this.index = index;
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




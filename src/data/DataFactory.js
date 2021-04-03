const TwelveData = require("./sources/twelveData")
const config = require("../../config");
const { ensure } = require("../shared/assertion");
const { Log } = require("../shared/log");
const Cache = require("../shared/cache");
const moment = require('moment');
const Data = require("./Data");
const DataSeries = require("./DataSeries");
module.exports = class DataFactory {

	constructor(log, cache) {
		this.log = new Log('DataFactory', log);
		this.twelveData = new TwelveData(config['twelveData.apiKey'], this.log);
		this.cache = cache || new Cache('datafactory');
	}

	async getHourly({ symbol, from, to }) {
		ensure(symbol, String);
		return await this._fetch({
			symbol,
			interval: '1h',
			from,
			to
		})
	}

	async _fetch(options) {
		ensure(options, Object);
		this.log.write(`fetch ${options.symbol} ${options.interval} ...`, options);

		const cacheKey = Object.values(options).map(v => v ? v.toString() : '').join('-');
		const cached = this.cache.getItem(cacheKey);
		if (cached) {
			this.log.write(`... found in cache.`);
			return new DataSeries(cached.map(r => new Data(r)));;
		}

		const result =  await this.twelveData.fetch({
			...options
		})

		if (result === null) {
			this.log.write(`... fetch failed.`);
			return null;
		}

		this.log.write(`... fetched ${result.length} values successfully`);
		const r = new DataSeries(result.map(r => new Data(r)));
		this.cache.setItem(cacheKey, result);
		return r;
	}

}

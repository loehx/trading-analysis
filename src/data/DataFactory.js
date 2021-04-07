const TwelveData = require("./sources/twelveData")
const config = require("../../config");
const { ensure } = require("../shared/assertion");
const { Log } = require("../shared/log");
const Cache = require("../shared/cache");
const moment = require('moment');
const Data = require("./Data");
const DataSeries = require("./DataSeries");
const BacktestMarket = require("./sources/BacktestMarket");
module.exports = class DataFactory {

	constructor(log, cache) {
		this.log = new Log('DataFactory', log);
		this.twelveData = new TwelveData(config['twelveData.apiKey'], this.log);
		this.cache = cache || new Cache('datafactory');
	}

	async getNASDAQHourly(options) {
		return await this._fetchTwelveData({
			...options,
			symbol: 'NDX',
			interval: '1h'
		});
	}

	async getHistoricalNASDAQHourly() {
		return DataSeries.fromRawData(await BacktestMarket.getData('NASDAQ_HOURLY'));
	}

	async getEURUSDHourly(options) {
		return await this._fetchTwelveData({
			...options,
			symbol: 'EUR/USD',
			interval: '1h'
		});
	}

	async getHistoricalEURUSDHourly() {
		return DataSeries.fromRawData(await BacktestMarket.getData('EURUSD_HOURLY'));
	}

	async _fetchTwelveData(options) {
		ensure(options, Object);
		this.log.write(`fetch data from TwelveData: ${options.symbol} ${options.interval} ...`, options);

		const datasets = await this._getCached(options, async () => {
			return await this.twelveData.fetch({
				...options
			})
		})

		if (datasets === null) {
			this.log.write(`... fetch failed.`);
			return null;
		}
		else {
			this.log.write(`... fetched ${datasets.length} datasets successfully`);
			return DataSeries.fromRawData(datasets);
		}
	}

	async _getCached(key, fn) {
		if (typeof key === 'object') {
			key = Object.values(key)
				.filter(v => v)
				.map(v => v.toString())
				.join('-');
		}

		const cached = this.cache.getItem(key);
		if (cached) {
			this.log.write('Found data in cache: ' + key);
			return cached;
		}

		const data = await fn();
		this.cache.setItem(key, data);
		return data;
	}
}

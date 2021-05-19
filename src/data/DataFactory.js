const TwelveData = require("./sources/twelveData")
const config = require("../../config");
const { ensure, assert } = require("../shared/assertion");
const { Log } = require("../shared/log");
const Cache = require("../shared/cache");
const moment = require('moment');
const Data = require("./Data");
const DataSeries = require("./DataSeries");
const BacktestMarket = require("./sources/BacktestMarket");

module.exports = class DataFactory {

	constructor(log, cache) {
		this.log = new Log('DataFactory', log);
		this.cache = cache || new Cache('datafactory');
		this.backtestMarket = BacktestMarket;
	}

	get twelveData() {

		return this._twelveData || (this._twelveData = new TwelveData(config['twelveData.apiKey'], this.log));
	}

	async getData(symbol, options) {
		assert(() => symbol.getter);
		return (await symbol.getter(this, options)).map(d => new Data(d));
	}

	async getDataSeries(symbol, options) {
		assert(() => symbol.getter);
		this.log.startTimer('.getDataSeries(' + symbol.name + ', ' + JSON.stringify(options) +')')
		let data = await symbol.getter(this, options);
		if (options) {
			if (options.limit && data && data.length > options.limit) {
				data = data.slice(data.length - options.limit);
			}
			if (options.to && data) {
				const to = moment(options.to);
				data = data.filter(d => moment(d.timestamp) < to);
			}
		}
		const dataSeries = DataSeries.fromRawData(data);
		this.log.stopTimer();
		this.log.write(`received: ${dataSeries.toString()}`)
		return dataSeries;
	}

	async _fetchBacktestMarketData(symbol, options = {}) {
		let datasets = await BacktestMarket.getData(symbol);

		if (options.from) {
			const from = moment.utc(options.from);
			datasets = datasets.filter(d => from.isBefore(d.timestamp));
		};

		return datasets;
	}

	async _fetchTwelveDataHourly(symbol, options) {
		return await this._fetchTwelveData({
			...options,
			symbol,
			interval: '1h'
		})
	}

	async _fetchTwelveData(options) {
		ensure(options, Object);
		//this.log.write(`fetch data from TwelveData: ${options.symbol} ${options.interval} ...`, options);

		const datasets = await this._getCached(options, async () => {
			return await this.twelveData.fetch({
				...options
			})
		})

		if (datasets === null) {
			//this.log.write(`... fetch failed.`);
			return null;
		}
		else {
			//this.log.write(`... fetched ${datasets.length} datasets successfully`);
			return datasets;
		}
	}

	_fetchForexData(pair, options) {
		const data = require('../../assets/data/' + pair + '.json');
		const datasets = data.map(Data.fromTinyObject);
		for (let i = 1; i < datasets.length; i++) {
			const d = datasets[i];
			let r = 1;
			let p = datasets[i - r];
			while(!p && r >= 0) {
				p = datasets[i - ++r];
			}
			
			const prog = d.close / p.close;

			if (prog > 1.5 || prog < .5) {
				this.log.write('filtered out dataset #' + i + ' due to its unusual values: ' + d.toString());
				datasets[i] = null;
			}	
		}
		return datasets.filter(k => k);
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

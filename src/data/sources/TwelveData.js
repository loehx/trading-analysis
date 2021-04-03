const twelvedata = require("twelvedata");
const { ensure } = require("../../shared/assertion");
const moment = require('moment');
const { Log } = require("../../shared/log");

module.exports = class TwelveData {
	constructor(apiKey, log) {
		this.log = new Log('TwelveData', log);
		this.log.write('Check your API Usage: https://api.twelvedata.com/api_usage?apikey=' + apiKey);
		this.client = twelvedata({
			key: apiKey
		});
	}

	async fetch({ symbol, interval, from, to }) {

		ensure(symbol);
		ensure(interval, ['1min', '5min', '15min', '30min', '45min', '1h', '2h', '4h', '1day', '1week', '1month']);

		const request = {
			symbol: resolveSynonym(symbol),
			interval,
			start_date: from && moment.utc(from).format('YYYY-MM-DD hh:mm:ss'),
			end_date: to && moment.utc(to).format('YYYY-MM-DD hh:mm:ss'),
			outputsize: 5000,
			format: 'JSON',
			timezone: 'utc',
			//exchange: 'NASDAQ'
		};

		this.log.write('fetching data', request);

		const result = await this.client.timeSeries(request);

		if (result.status === 'error') {
			this.log.error(`... error: ${result.message}`, result);
			return null;
		}

		this.log.write('fetched data');

		return result.values.map(v => ({
			timestamp: moment.utc(v.datetime, 'YYYY-MM-DD hh:mm:ss').format(),
			close: parseFloat(v.close),
			open: parseFloat(v.open),
			low: parseFloat(v.low),
			high: parseFloat(v.high),
			volume: 'volume' in v ? parseFloat(v.volume) : undefined,
		}))
	}

	clearCache() {
		this.cache.clear();
	}
}

function resolveSynonym(symbol) {
	switch(symbol) {
		case 'EURUSD': return 'EUR/USD';
		case 'NASDAQ': return 'NDX';
		default:
			return symbol;
	}
}
const twelvedata = require("twelvedata");
const { ensure } = require("../../shared/assertion");

module.exports = class TwelveData {
	constructor(apiKey) {
		this.client = twelvedata({
			key: apiKey
		});
	}

	async fetch({ symbol, interval }) {

		ensure(symbol);
		ensure(interval, ['1min', '5min', '15min', '30min', '45min', '1h', '2h', '4h', '1day', '1week', '1month']);

		const data = await this.client.timeSeries({
			symbol: resolveSynonym(symbol),
			interval,
			start_date: moment(from).format('YYYY-MM-DD hh:mm:ss'),
			end_date: moment(from).format('YYYY-MM-DD hh:mm:ss'),
			outputsize: 5000,
			format: 'JSON',
			timezone: 'utc'
		})

		return data;
	}
}

function resolveSynonym(symbol) {
	switch(symbol) {
		case 'EURUSD': return 'EUR/USD';
		case 'NASDAQ': return '???';
		default:
			return symbol;
	}
}
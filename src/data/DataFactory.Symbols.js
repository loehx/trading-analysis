const DataSeries = require("./DataSeries");

const SYMBOLS = module.exports = {
	NASDAQ_HOURLY_HISTORICAL: {
		name: 'NASDAQ_HOURLY_HISTORICAL',
		getter: async (factory, options) => {
			return await factory._fetchBacktestMarketData('NASDAQ_HOURLY', options);
		}
	},
	NASDAQ_HOURLY: {
		name: 'NASDAQ_HOURLY',
		getter: async (factory, options) => {
			return await factory._fetchTwelveData({
				...options,
				symbol: 'NDX',
				interval: '1h'
			});
		}
	},
	EURUSD_HOURLY_HISTORICAL: {
		name: 'EURUSD_HOURLY_HISTORICAL',
		getter: async (factory, options) => {
			return await factory._fetchBacktestMarketData('EURUSD_HOURLY', options);
		}
	},
	EURUSD_HOURLY: {
		name: 'EURUSD_HOURLY',
		getter: async (factory, options) => {
			return await factory._fetchTwelveData({
				...options,
				symbol: 'EUR/USD',
				interval: '1h'
			});
		}
	},
}
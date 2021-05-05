const DataSeries = require("./DataSeries");

const SYMBOLS = {
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

	EURUSD_HOURLY_HISTORICAL: { name: 'EURUSD_HOURLY_HISTORICAL', getter: (factory, options) => factory._fetchForexData('EURUSD', options) },
	EURCHF_HOURLY_HISTORICAL: { name: 'EURCHF_HOURLY_HISTORICAL', getter: (factory, options) => factory._fetchForexData('EURCHF', options) },
	EURGBP_HOURLY_HISTORICAL: { name: 'EURGBP_HOURLY_HISTORICAL', getter: (factory, options) => factory._fetchForexData('EURGBP', options) },
	EURJPY_HOURLY_HISTORICAL: { name: 'EURJPY_HOURLY_HISTORICAL', getter: (factory, options) => factory._fetchForexData('EURJPY', options) },
	EURAUD_HOURLY_HISTORICAL: { name: 'EURAUD_HOURLY_HISTORICAL', getter: (factory, options) => factory._fetchForexData('EURAUD', options) },
	USDCAD_HOURLY_HISTORICAL: { name: 'USDCAD_HOURLY_HISTORICAL', getter: (factory, options) => factory._fetchForexData('USDCAD', options) },
	USDCHF_HOURLY_HISTORICAL: { name: 'USDCHF_HOURLY_HISTORICAL', getter: (factory, options) => factory._fetchForexData('USDCHF', options) },
	USDJPY_HOURLY_HISTORICAL: { name: 'USDJPY_HOURLY_HISTORICAL', getter: (factory, options) => factory._fetchForexData('USDJPY', options) },
	USDMXN_HOURLY_HISTORICAL: { name: 'USDMXN_HOURLY_HISTORICAL', getter: (factory, options) => factory._fetchForexData('USDMXN', options) },
	GBPCHF_HOURLY_HISTORICAL: { name: 'GBPCHF_HOURLY_HISTORICAL', getter: (factory, options) => factory._fetchForexData('GBPCHF', options) },
	GBPJPY_HOURLY_HISTORICAL: { name: 'GBPJPY_HOURLY_HISTORICAL', getter: (factory, options) => factory._fetchForexData('GBPJPY', options) },
	GBPUSD_HOURLY_HISTORICAL: { name: 'GBPUSD_HOURLY_HISTORICAL', getter: (factory, options) => factory._fetchForexData('GBPUSD', options) },
	AUDJPY_HOURLY_HISTORICAL: { name: 'AUDJPY_HOURLY_HISTORICAL', getter: (factory, options) => factory._fetchForexData('AUDJPY', options) },
	AUDUSD_HOURLY_HISTORICAL: { name: 'AUDUSD_HOURLY_HISTORICAL', getter: (factory, options) => factory._fetchForexData('AUDUSD', options) },
	CHFJPY_HOURLY_HISTORICAL: { name: 'CHFJPY_HOURLY_HISTORICAL', getter: (factory, options) => factory._fetchForexData('CHFJPY', options) },
	NZDJPY_HOURLY_HISTORICAL: { name: 'NZDJPY_HOURLY_HISTORICAL', getter: (factory, options) => factory._fetchForexData('NZDJPY', options) },
	NZDUSD_HOURLY_HISTORICAL: { name: 'NZDUSD_HOURLY_HISTORICAL', getter: (factory, options) => factory._fetchForexData('NZDUSD', options) },
	XAUUSD_HOURLY_HISTORICAL: { name: 'XAUUSD_HOURLY_HISTORICAL', getter: (factory, options) => factory._fetchForexData('XAUUSD', options) },
	EURCAD_HOURLY_HISTORICAL: { name: 'EURCAD_HOURLY_HISTORICAL', getter: (factory, options) => factory._fetchForexData('EURCAD', options) },
	AUDCAD_HOURLY_HISTORICAL: { name: 'AUDCAD_HOURLY_HISTORICAL', getter: (factory, options) => factory._fetchForexData('AUDCAD', options) },
	CADJPY_HOURLY_HISTORICAL: { name: 'CADJPY_HOURLY_HISTORICAL', getter: (factory, options) => factory._fetchForexData('CADJPY', options) },
	EURNZD_HOURLY_HISTORICAL: { name: 'EURNZD_HOURLY_HISTORICAL', getter: (factory, options) => factory._fetchForexData('EURNZD', options) },
	GRXEUR_HOURLY_HISTORICAL: { name: 'GRXEUR_HOURLY_HISTORICAL', getter: (factory, options) => factory._fetchForexData('GRXEUR', options) },
	NZDCAD_HOURLY_HISTORICAL: { name: 'NZDCAD_HOURLY_HISTORICAL', getter: (factory, options) => factory._fetchForexData('NZDCAD', options) },
	SGDJPY_HOURLY_HISTORICAL: { name: 'SGDJPY_HOURLY_HISTORICAL', getter: (factory, options) => factory._fetchForexData('SGDJPY', options) },
	USDHKD_HOURLY_HISTORICAL: { name: 'USDHKD_HOURLY_HISTORICAL', getter: (factory, options) => factory._fetchForexData('USDHKD', options) },
	USDNOK_HOURLY_HISTORICAL: { name: 'USDNOK_HOURLY_HISTORICAL', getter: (factory, options) => factory._fetchForexData('USDNOK', options) },
	USDTRY_HOURLY_HISTORICAL: { name: 'USDTRY_HOURLY_HISTORICAL', getter: (factory, options) => factory._fetchForexData('USDTRY', options) },
	XAUAUD_HOURLY_HISTORICAL: { name: 'XAUAUD_HOURLY_HISTORICAL', getter: (factory, options) => factory._fetchForexData('XAUAUD', options) },
	AUDCHF_HOURLY_HISTORICAL: { name: 'AUDCHF_HOURLY_HISTORICAL', getter: (factory, options) => factory._fetchForexData('AUDCHF', options) },
	AUXAUD_HOURLY_HISTORICAL: { name: 'AUXAUD_HOURLY_HISTORICAL', getter: (factory, options) => factory._fetchForexData('AUXAUD', options) },
	EURHUF_HOURLY_HISTORICAL: { name: 'EURHUF_HOURLY_HISTORICAL', getter: (factory, options) => factory._fetchForexData('EURHUF', options) },
	EURPLN_HOURLY_HISTORICAL: { name: 'EURPLN_HOURLY_HISTORICAL', getter: (factory, options) => factory._fetchForexData('EURPLN', options) },
	FRXEUR_HOURLY_HISTORICAL: { name: 'FRXEUR_HOURLY_HISTORICAL', getter: (factory, options) => factory._fetchForexData('FRXEUR', options) },
	HKXHKD_HOURLY_HISTORICAL: { name: 'HKXHKD_HOURLY_HISTORICAL', getter: (factory, options) => factory._fetchForexData('HKXHKD', options) },
	NZDCHF_HOURLY_HISTORICAL: { name: 'NZDCHF_HOURLY_HISTORICAL', getter: (factory, options) => factory._fetchForexData('NZDCHF', options) },
	SPXUSD_HOURLY_HISTORICAL: { name: 'SPXUSD_HOURLY_HISTORICAL', getter: (factory, options) => factory._fetchForexData('SPXUSD', options) },
	USDHUF_HOURLY_HISTORICAL: { name: 'USDHUF_HOURLY_HISTORICAL', getter: (factory, options) => factory._fetchForexData('USDHUF', options) },
	USDPLN_HOURLY_HISTORICAL: { name: 'USDPLN_HOURLY_HISTORICAL', getter: (factory, options) => factory._fetchForexData('USDPLN', options) },
	USDZAR_HOURLY_HISTORICAL: { name: 'USDZAR_HOURLY_HISTORICAL', getter: (factory, options) => factory._fetchForexData('USDZAR', options) },
	XAUCHF_HOURLY_HISTORICAL: { name: 'XAUCHF_HOURLY_HISTORICAL', getter: (factory, options) => factory._fetchForexData('XAUCHF', options) },
	ZARJPY_HOURLY_HISTORICAL: { name: 'ZARJPY_HOURLY_HISTORICAL', getter: (factory, options) => factory._fetchForexData('ZARJPY', options) },
	BCOUSD_HOURLY_HISTORICAL: { name: 'BCOUSD_HOURLY_HISTORICAL', getter: (factory, options) => factory._fetchForexData('BCOUSD', options) },
	ETXEUR_HOURLY_HISTORICAL: { name: 'ETXEUR_HOURLY_HISTORICAL', getter: (factory, options) => factory._fetchForexData('ETXEUR', options) },
	EURCZK_HOURLY_HISTORICAL: { name: 'EURCZK_HOURLY_HISTORICAL', getter: (factory, options) => factory._fetchForexData('EURCZK', options) },
	EURSEK_HOURLY_HISTORICAL: { name: 'EURSEK_HOURLY_HISTORICAL', getter: (factory, options) => factory._fetchForexData('EURSEK', options) },
	GBPAUD_HOURLY_HISTORICAL: { name: 'GBPAUD_HOURLY_HISTORICAL', getter: (factory, options) => factory._fetchForexData('GBPAUD', options) },
	GBPNZD_HOURLY_HISTORICAL: { name: 'GBPNZD_HOURLY_HISTORICAL', getter: (factory, options) => factory._fetchForexData('GBPNZD', options) },
	JPXJPY_HOURLY_HISTORICAL: { name: 'JPXJPY_HOURLY_HISTORICAL', getter: (factory, options) => factory._fetchForexData('JPXJPY', options) },
	UDXUSD_HOURLY_HISTORICAL: { name: 'UDXUSD_HOURLY_HISTORICAL', getter: (factory, options) => factory._fetchForexData('UDXUSD', options) },
	USDCZK_HOURLY_HISTORICAL: { name: 'USDCZK_HOURLY_HISTORICAL', getter: (factory, options) => factory._fetchForexData('USDCZK', options) },
	USDSEK_HOURLY_HISTORICAL: { name: 'USDSEK_HOURLY_HISTORICAL', getter: (factory, options) => factory._fetchForexData('USDSEK', options) },
	WTIUSD_HOURLY_HISTORICAL: { name: 'WTIUSD_HOURLY_HISTORICAL', getter: (factory, options) => factory._fetchForexData('WTIUSD', options) },
	XAUEUR_HOURLY_HISTORICAL: { name: 'XAUEUR_HOURLY_HISTORICAL', getter: (factory, options) => factory._fetchForexData('XAUEUR', options) },
	AUDNZD_HOURLY_HISTORICAL: { name: 'AUDNZD_HOURLY_HISTORICAL', getter: (factory, options) => factory._fetchForexData('AUDNZD', options) },
	CADCHF_HOURLY_HISTORICAL: { name: 'CADCHF_HOURLY_HISTORICAL', getter: (factory, options) => factory._fetchForexData('CADCHF', options) },
	EURDKK_HOURLY_HISTORICAL: { name: 'EURDKK_HOURLY_HISTORICAL', getter: (factory, options) => factory._fetchForexData('EURDKK', options) },
	EURNOK_HOURLY_HISTORICAL: { name: 'EURNOK_HOURLY_HISTORICAL', getter: (factory, options) => factory._fetchForexData('EURNOK', options) },
	EURTRY_HOURLY_HISTORICAL: { name: 'EURTRY_HOURLY_HISTORICAL', getter: (factory, options) => factory._fetchForexData('EURTRY', options) },
	GBPCAD_HOURLY_HISTORICAL: { name: 'GBPCAD_HOURLY_HISTORICAL', getter: (factory, options) => factory._fetchForexData('GBPCAD', options) },
	NSXUSD_HOURLY_HISTORICAL: { name: 'NSXUSD_HOURLY_HISTORICAL', getter: (factory, options) => factory._fetchForexData('NSXUSD', options) },
	UKXGBP_HOURLY_HISTORICAL: { name: 'UKXGBP_HOURLY_HISTORICAL', getter: (factory, options) => factory._fetchForexData('UKXGBP', options) },
	USDDKK_HOURLY_HISTORICAL: { name: 'USDDKK_HOURLY_HISTORICAL', getter: (factory, options) => factory._fetchForexData('USDDKK', options) },
	USDSGD_HOURLY_HISTORICAL: { name: 'USDSGD_HOURLY_HISTORICAL', getter: (factory, options) => factory._fetchForexData('USDSGD', options) },
	XAGUSD_HOURLY_HISTORICAL: { name: 'XAGUSD_HOURLY_HISTORICAL', getter: (factory, options) => factory._fetchForexData('XAGUSD', options) },
	XAUGBP_HOURLY_HISTORICAL: { name: 'XAUGBP_HOURLY_HISTORICAL', getter: (factory, options) => factory._fetchForexData('XAUGBP', options) },
}

module.exports = SYMBOLS;


const fs = require('fs');
var moment = require('moment');

const SYMBOLS = {
    NASDAQ_HOURLY: {
        fileName: 'nasdaq-1h_2007-2021.csv',
        fileType: 'csv',
        lineConverter: backtestMarketCsvConverter
    },
    VIX_HOURLY: {
        fileName: 'vix-1h_2009-2021.csv',
        fileType: 'csv',
        lineConverter: backtestMarketCsvConverter
    }
};


module.exports = {
    async getData(symbol) {
        const symbolConfig = SYMBOLS[symbol.toUpperCase()];
        if (!symbolConfig) {
            throw "Symbol not found: '" + symbol + "'";
        }

        const { fileName, fileType, lineConverter } = symbolConfig;

        const contents = await fs.promises.readFile('./data/' + fileName);
        const lines = contents.toString().split('\n');

        if (fileType === 'csv') {
            return lines.map(lineConverter).filter(k => k);
        }
    },

    async getTimeSeriesFromYahoo(symbol, from, to) {
		const response = await axios.get('https://query1.finance.yahoo.com/v8/finance/chart/', {
			params: {
				symbol,
				period1: moment(from).unix(),
				period2: moment(to).unix(),
				interval: '1h',
				lang: 'en-US'
			}
		})

		const data = response.data.chart.result[0];
		const timestamp = data.timestamp;
		const { low, close, high, volume, open } = data.indicators.quote[0];

		const timeSeries = new Array(timestamp.length);
		for (let i = 0; i < timestamp.length; i++) {
			timeSeries[i] = {
				timestamp: timestamp[i],
				low: low[i],
				high: high[i],
				open: open[i],
				close: close[i],
				volume: volume[i],
			}
		}

		return timeSeries;
	},
}

function backtestMarketCsvConverter(line) {
    const data = line
        .trim()
        .substr(0, line.length - 1)
        .split(';');

    if (data.length <= 1) {
        return;
    }

    const [ date, time, open, high, low, close, volume ] = data;

    return {
        timestamp: moment(date + ' ' + time, 'DD/MM/YYYY hh:mm:ss'),
        low: Number(low),
        high: Number(high),
        open: Number(open),
        close: Number(close),
        volume: Number(volume),
        __source: line
    }
}
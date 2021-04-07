const fs = require("fs");
const axios = require("axios");
const config = require("../config");


(async () => {
	try {
		//const symbol = 'EUR/USD';
		const symbol = 'NDX';
		const baseUrl = 'https://api.twelvedata.com';
		const apiKey = config['twelveData.apiKey'];
		const interval = '1h';
		const format = 'csv';

		const response = await axios.get(`${baseUrl}/time_series?symbol=${symbol}&interval=${interval}&outputsize=5000&format=${format}&apikey=${apiKey}`);
		
		const { data } = response;
		const from = 2020;
		const to = 2020;
		await fs.promises.writeFile(`./${symbol.replace('/','')}-${interval}_${from}-${to}.${format}`.toLowerCase(), data);
	}
	catch(e) {
		console.error(e);
	}
})();
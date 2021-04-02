const TwelveData = require("./sources/twelveData")
const config = require("../../config");
const { ensure } = require("../shared/assertion");
const moment = require('moment');
module.exports = class DataFactory {

	constructor() {
		this.twelveData = new TwelveData(config['twelveData.apiKey']);
	}

	async getHourly({ symbol, from, to }) {
		ensure(symbol, String);
		return await this.twelveData.fetch({
			symbol,
			interval: '1h'
		})
	}

}

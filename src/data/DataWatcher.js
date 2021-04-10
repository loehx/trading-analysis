const moment = require('moment');
const { Log } = require('../shared/log');
const util = require('../shared/util');

module.exports = class DataWatcher {

	constructor(dataFactory, symbol, timestamp) {
		this.dataFactory = dataFactory;
		this.symbol = symbol;
		this.timestamp = timestamp;
		this.watchEveryMilliseconds = 10000;
		this.log = new Log(dataFactory.log);
	}

	async* watch(timeout) {

		const start = new Date();
		const timeSpent = () => (new Date() - start);

		while(!this._stop && timeSpent() < timeout) {

			const data = await this.dataFactory.getData(this.symbol, this.timestamp && { 
				from: this.timestamp
			});	

			if (data.length > 0) {
				this.timestamp = moment.utc(data[data.length - 1].timestamp).add(1, 'minute');

				yield data;
			}
			await util.timeout(Math.min(timeout - timeSpent(), this.watchEveryMilliseconds));
		} 
	}
}
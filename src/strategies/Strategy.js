const { assert } = require("../shared/assertion");
const { Log } = require("../shared/log")

module.exports = class Strategy {

	constructor(log) {
		assert(this.name, 'strategy.name is not implemented');
		this.log = new Log(this.name, log);
	}

	asses(data) {
		throw '.asses() is not implemented';
	}

	train(dataSeries) {
		throw 'Strategy is not trainable';
	}


}
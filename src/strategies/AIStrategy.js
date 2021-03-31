const DataSeries = require("../data/DataSeries");
const { assert } = require("../shared/assertion");
const Strategy = require("./Strategy");

module.exports = class AIStrategy extends Strategy {

	constructor(log) {
		super(log);
	}

	asses() {

	}

	train(series) {
		assert(() => series instanceof DataSeries);



	}

	save(path) {

	}

	load(path) {

	}
}
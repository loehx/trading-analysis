const { Log } = require("../../../src/shared/log");
const Johannis = require("../../../src/strategies/AIStrategy");

(async () => {
	const log = Log.consoleLog('Runner');
	const johannis = new Johannis(log);

	await johannis.run();

})();


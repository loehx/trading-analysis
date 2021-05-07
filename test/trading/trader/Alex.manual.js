const { Log } = require("../../../src/shared/log");
const Alex = require("../../../src/trading/trader/Alex");

(async () => {
	const log = Log.consoleLog('Runner');
	const alex = new Alex(log);

	await alex.run();

})();


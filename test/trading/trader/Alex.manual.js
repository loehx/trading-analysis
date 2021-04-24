const { Log } = require("../../../src/shared/log");
const Alex = require("../../../src/trading/trader/Alex");

(async () => {
	const log = Log.consoleLog('ManualTest');
	const alex = new Alex(log);

	await alex.run();

})();


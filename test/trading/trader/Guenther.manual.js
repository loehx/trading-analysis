const { Log } = require("../../../src/shared/log");
const Guenther = require("../../../src/trading/trader/Guenther");

(async () => {
	const log = Log.consoleLog('ManualTest');
	const guenni = new Guenther(log);

	await guenni.run();
})();


const fs = require("fs");
const path = require("path");
const axios = require("axios");
const moment = require("moment");
const config = require("../config");
const glob = require("glob");

const AdmZip = require("adm-zip");
const { Log } = require("../src/shared");
const { Data } = require("../src/data");

// !!! Chechout: https://github.com/philipperemy/FX-1-Minute-Data !!!
const SOURCE_FILES = '../temp/output/[PAIR]/*.zip';
const TARGET_DIRECTORY = '../assets/data';

const PAIRS = [
	'EURUSD',
	'EURCHF',
	'EURGBP',
	'EURJPY',
	'EURAUD',
	'USDCAD',
	'USDCHF',
	'USDJPY',
	'USDMXN',
	'GBPCHF',
	'GBPJPY',
	'GBPUSD',
	'AUDJPY',
	'AUDUSD',
	'CHFJPY',
	'NZDJPY',
	'NZDUSD',
	'XAUUSD',
	'EURCAD',
	'AUDCAD',
	'CADJPY',
	'EURNZD',
	'GRXEUR',
	'NZDCAD',
	'SGDJPY',
	'USDHKD',
	'USDNOK',
	'USDTRY',
	'XAUAUD',
	'AUDCHF',
	'AUXAUD',
	'EURHUF',
	'EURPLN',
	'FRXEUR',
	'HKXHKD',
	'NZDCHF',
	'SPXUSD',
	'USDHUF',
	'USDPLN',
	'USDZAR',
	'XAUCHF',
	'ZARJPY',
	'BCOUSD',
	'ETXEUR',
	'EURCZK',
	'EURSEK',
	'GBPAUD',
	'GBPNZD',
	'JPXJPY',
	'UDXUSD',
	'USDCZK',
	'USDSEK',
	'WTIUSD',
	'XAUEUR',
	'AUDNZD',
	'CADCHF',
	'EURDKK',
	'EURNOK',
	'EURTRY',
	'GBPCAD',
	'NSXUSD',
	'UKXGBP',
	'USDDKK',
	'USDSGD',
	'XAGUSD',
	'XAUGBP'
];

(async () => {
	try {
		//const symbol = 'EUR/USD';

		const log = Log.consoleLog('getForexData');

		for (const pair of PAIRS) {
			const searchpath = path.join(__dirname, SOURCE_FILES.replace('[PAIR]', pair.toLowerCase()));
			log.write(`start converting data: "${pair}" => ${searchpath}`)
			const zipFiles = glob.sync(searchpath);
			log.write(`found ${zipFiles.length} zip files`);

			const map = {};

			log.startTimer(`start converting data...`)
			let counter = 0;
			for (const zipFile of zipFiles) {
				const zip = new AdmZip(zipFile);
				const entries = zip.getEntries();
				const CSVs = entries.filter(e => e.entryName.substr(-4) === '.csv');
				const CSV = CSVs[0]; // should contain only 1x .csv

				const content = CSV.getData().toString();
				const lines = content.split('\n');
				
				for (const line of lines) {
					if (!line) {
						continue;
					}
					let [ datetime, open, high, low, close, volume ] = line.split(';');
					if (!datetime) {
						log.write('skip line: "' + line + '"')
						continue;
					}
					open = parseFloat(open);
					close = parseFloat(close);
					high = parseFloat(high);
					low = parseFloat(low);
					const mom = moment(datetime, 'YYYYMMDD hhnnss').startOf('hour');
					const key = mom.format();

					const hour = map[key];
					if (!hour) {
						map[key] = {
							timestamp: mom.format(),
							open,
							close,
							low,
							high
						};
					}
					else {
						hour.low = Math.min(hour.low, low);
						hour.high = Math.max(hour.high, high);
						hour.close = close;
					}
				}
				log.writeProgress(++counter, zipFiles.length, 1000, CSV.entryName);
			}

			const values = Object.values(map);
			values.slice(0, 1).forEach(console.log);
			values.sort((a,b) => a.timestamp - b.timestamp);

			const list = values.map(v => new Data(v).toTinyObject());
			const outContent = JSON.stringify(list);
			const targetFilePath = path.join(__dirname, TARGET_DIRECTORY, pair + '.json');
			fs.writeFileSync(targetFilePath, outContent);

			log.stopTimer('done');
		}
	}
	catch(e) {
		console.error(e);
	}
})();


function getZipFiles(folder) {
	const pairNames = readdirSync(SOURCE_DIRECTORY, { withFileTypes: true })
	.filter(dirent => dirent.isDirectory())
	.map(dirent => dirent.name);
}
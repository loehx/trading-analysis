const { Log, util } = require("../shared");
const { crossJoinByProps } = require("../shared/util");
const { Trade, TradeOptions } = require("../trading");
const Indicators = require("./Indicators");

module.exports = class AnalysisRunner {

	constructor(log) {
		this.log = new Log('AnalysisRunner', log);
	}

	async runAnalysis(options) {
		const stats = [];
		if (options.indicator === '*' || options.indicator[0] === '*') {
			options.indicator = Object.keys(Indicators);
		}
		const joinedOptions = crossJoinByProps(options);
		let count = 0;
		let lastPeriod = options.period[0];

		this.log.startTimer('start simulation');
		for (const option of joinedOptions) {
			const { series, period, indicator, futurePeriod, minSignal = 0 } = option;
			const func = Indicators[indicator];
			const signals = new Array(series.length);
			const graphs = {};
			
			if (lastPeriod !== period) {
				series.clearCache();
				lastPeriod = period;
			}

			this.log.writeProgress(count++, joinedOptions.length);

			const len = series.length - futurePeriod;
			for (let i = period; i < len; i++) {
				const data = series.get(i);
				
				let signal = func(data, period, (name, value) => {
					const graph = graphs[name] || (graphs[name] = new Array(series.length));
					graph[i] = value; 
					return value;
				});
				
				if (typeof signal === 'boolean') {
					signal = signal ? 1 : 0;
				}
				else {
					signal = Math.min(1, signal);
					signal = Math.max(0, signal);
				}

				//indicator === 'ADX' && console.log(signal) 
				signals[i] = signal >= minSignal ? 1 : -1;
			}

			const profitability = series.calculate('PROFITABILITY', futurePeriod).map(p => p >= .5 ? 1 : 0);
			const deviations = signals.map((k, i) => k < 0 ? undefined : (1 - Math.abs(k - profitability[i])));

			// deviations.forEach(d => console.log(indicators, d));
		
			stats.push({
				...option,
				title: Object.values(option).map(o => o?.toString() || 'null').join(' / '),
				profitability,
				accuracy: util.avg(deviations.filter(d => d !== undefined)),
				postiveSignals: util.sumBy(signals, k => k !== undefined && k > 0),
				deviations,
				graphs,
				signals,
				indicator,
				period,
				minSignal
			})
		}
		this.log.stopTimer('done!');

		return stats;
	}

}
const { Log, util } = require("../shared");
const { crossJoinByProps } = require("../shared/util");
const { Trade, TradeOptions } = require("../trading");

module.exports = class StrategyTester {

	constructor(log) {
		this.log = new Log('StrategyTester', log);
	}

	async runSimulation(options) {
		const stats = [];
		const joinedOptions = crossJoinByProps(options);
		let count = 0;

		this.log.startTimer('start simulation');
		for (const option of joinedOptions) {
			const { series, strategy } = option;
			const profitGraph = [];
			const tradeGraph = [];
			let trades = [];
			const graphs = {};

			this.log.writeProgress(count++, joinedOptions.length);
			series.forEach(data => {
				trades.forEach(t => t.isOpen && t.update(data));
				strategy.tick({
					series, 
					data, 
					trades,
					buy: (o) => trades.push(new Trade(data, new TradeOptions({ ...o, noFutureAwareness: true }))), 
					draw: (name, value) => {
						const graph = graphs[name] || (graphs[name] = util.newArray(series.length));
						graph[data.index] = value; 
					}
				})
				
				profitGraph.push(util.avgBy(trades, t => t.netProfit));
				tradeGraph.push(util.sumBy(trades, t => t.isOpen ? 1 : 0));
			})

			const netProfit = util.avgBy(trades, t => t.netProfit);
			const totalNetProfit = util.sumBy(trades, t => t.netProfit);
			stats.push({
				...option,
				title: Object.values(option).map(o => o?.toString() || 'null').join(' / '),
				trades,
				netProfit: netProfit,
				totalNetProfit,
				netProfitPerDay: totalNetProfit / util.sumBy(trades, t => t.daysOpen),
				profitGraph,
				tradeGraph,
				graphs,
			})
		}
		this.log.stopTimer('done!');

		return stats;
	}


}
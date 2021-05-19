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

			this.log.writeProgress(count++, joinedOptions.length);
			series.forEach(data => {
				trades.forEach(t => t.isOpen && t.update(data));
				strategy.tick({
					series, 
					data, 
					buy: (o) => trades.push(new Trade(data, new TradeOptions({ ...o, noFutureAwareness: true }))), 
					trades
				})
				
				profitGraph.push(util.sumBy(trades, t => t.netProfit));
				tradeGraph.push(util.sumBy(trades, t => t.isOpen ? 1 : 0));
			})

			const netProfit = util.sumBy(trades, t => t.netProfit);
			stats.push({
				...option,
				title: Object.values(option).map(o => o?.toString() || 'null').join(' / '),
				trades,
				netProfit: netProfit,
				netProfitPerDay: netProfit / util.sumBy(trades, t => t.daysOpen),
				profitGraph,
				tradeGraph
			})
		}
		this.log.stopTimer('done!');

		return stats;
	}

}
const { Data, DataSeries, DataFactory } = require('../../src/data');
const { Trade, TradeOptions } = require('../../src/trading');

describe('Trade', () => {
	test('new Trade()', () => {
		const series = DataSeries.mock(10, 1, 'hour');
		const options = new TradeOptions({
			amount: 1,
			spread: 0.0045,
		});
		const trade = new Trade(series.first, options);
		expect(trade.profit).toBeCloseTo(-.5);
	})

	test('Stop Loss', () => {
		const series = new DataSeries([
			Data.create('2000-01-01T00:00:00', 100, 100, 105, 106),
			Data.create('2000-01-01T01:00:00', 102, 105, 110, 112),
			Data.create('2000-01-01T01:00:00', 102, 110, 112, 112),
			Data.create('2000-01-01T02:00:00', 104, 112, 105, 112),
			Data.create('2000-01-01T03:00:00', 95, 105, 97, 107),
			Data.create('2000-01-01T03:00:00', 55, 97, 80, 110),
		])
		const options = new TradeOptions({
			takeProfit: .2,
			stopLoss: .2,
			amount: 1,
			spread: 0.0045,
		});
		const trade = new Trade(series.first, options);

		trade.update(series.get(1));
		expect(trade.profit).toBeCloseTo(0.043);
		expect(trade.isOpen).toBe(true);
		expect(trade.isClosed).toBe(false);

		trade.update(series.get(2));
		expect(trade.profit).toBeCloseTo(0.062);
		expect(trade.isOpen).toBe(true);

		trade.update(series.get(3));
		expect(trade.profit).toBeCloseTo(0);
		expect(trade.isOpen).toBe(true);

		trade.update(series.get(4));
		expect(trade.profit).toBeCloseTo(-0.08);
		expect(trade.isOpen).toBe(true);

		trade.update(series.get(5));
		expect(trade.profit).toBeCloseTo(-0.2);
		expect(trade.profitability).toBeCloseTo(-0.2);
		expect(trade.isOpen).toBe(false);

		expect(trade.maxDrawdown).toBeCloseTo(-0.2);
		expect(trade.maxDrawup).toBeCloseTo(0.062);
	})

	test('Take Profit', () => {
		const series = new DataSeries([
			Data.create('2000-01-01T00:00:00', 100, 100, 105, 106),
			Data.create('2000-01-01T01:00:00', 102, 105, 110, 112),
			Data.create('2000-01-01T01:00:00', 102, 110, 112, 155),
			Data.create('2000-01-01T02:00:00', 104, 112, 105, 112),
			Data.create('2000-01-01T03:00:00', 95, 105, 97, 107),
			Data.create('2000-01-01T03:00:00', 55, 97, 80, 110),
		])
		const options = new TradeOptions({
			takeProfit: .2,
			stopLoss: .2,
			amount: 1,
			spread: 0.0045,
		});
		const trade = new Trade(series.first, options);

		trade.update(series.get(1));
		expect(trade.profit).toBeCloseTo(0.043);
		expect(trade.isOpen).toBe(true);
		expect(trade.isClosed).toBe(false);

		trade.update(series.get(2));
		expect(trade.profit).toBeCloseTo(0.2);
		expect(trade.isOpen).toBe(false);

		expect(trade.maxDrawdown).toBeCloseTo(0);
		expect(trade.maxDrawup).toBeCloseTo(0.2);
	})
})

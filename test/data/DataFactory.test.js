const moment = require('moment');
const { Data, DataSeries, DataFactory } = require('../../src/data');
const { Log } = require('../../src/shared/log');
const Cache = require('../../src/shared/Cache');

describe('DataFactory', () => {
	
	// test('new DataFactory()', async () => {
	// 	const log = Log.consoleLog('Test');
	// 	const cache = new Cache('test');
	// 	cache.clear();
	// 	const factory = new DataFactory(log, cache);

	// 	const result = await factory.getHourly({
	// 		symbol: 'EURUSD',
	// 		from: '2021-01-01T00:00:00',
	// 		to: '2021-01-02T00:00:00',
	// 	})

	// 	expect(result != null).toBe(true);
	// 	expect(result.length).toBe(9);
	// 	expect(result.high).toBe(1.22265);
	// 	expect(result.low).toBe(1.20405);
	// 	expect(result.close).toBe(1.21335);
	// 	expect(result.open).toBe(1.21335);
	// })

	test('.getNASDAQHourly()', async () => {
		const log = Log.consoleLog('Test');
		const cache = new Cache('test');
		const factory = new DataFactory(log, cache);

		const result = await factory.getNASDAQHourly({
			from: '2021-01-04T00:00:00',
			to: '2021-01-05T00:00:00',
		})

		expect(result != null).toBe(true);
		expect(result.length).toBe(7);
		
		expect(result.high).toBe(12947.0918);
		expect(result.low).toBe(12537.42188);
		expect(result.close).toBe(12697.70605);
		expect(result.open).toBe(12947.0918);
	})
	
	test('.getHistoricalNASDAQHourly', async () => {
		const factory = new DataFactory();
		const result = await factory.getHistoricalNASDAQHourly();

		expect(result != null).toBe(true);
		expect(result.length).toBe(84079);
		expect(result.avgClose).toBeCloseTo(4325.8540);
	})

	test('.getEURUSDHourly', async () => {
		const factory = new DataFactory();
		const result = await factory.getEURUSDHourly({
			from: '2021-01-04T00:00:00',
			to: '2021-01-05T00:00:00',
		})

		expect(result != null).toBe(true);
		expect(result.length).toBe(25);
		expect(result.avgClose).toBeCloseTo(1.22675);
	})

	test('.getHistoricalEURUSDHourly', async () => {
		const factory = new DataFactory();
		const result = await factory.getHistoricalEURUSDHourly();

		expect(result != null).toBe(true);
		expect(result.length).toBe(117308);
		expect(result.open).toBeCloseTo(0.972);
		expect(result.close).toBeCloseTo(1.18734);
		expect(result.avgClose).toBeCloseTo(1.251);
	})

})

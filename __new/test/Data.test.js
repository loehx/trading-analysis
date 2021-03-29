const Data = require("../src/shared/Data");

test('new Data()', () => {
	expect(() => new Data()).toThrow(Error);
})

test('new Data(...)', () => {
	const now = new Date();
	const data = new Data({
		timestamp: new Date(),
		low: 0,
		high: 10,
		open: 2,
		close: 8
	});

	expect(data.timestamp).toStrictEqual(now);
	expect(data.low).toBe(0);
	expect(data.high).toBe(10);
	expect(data.open).toBe(2);
	expect(data.close).toBe(8);

	expect(data.mid).toBe(5);
	expect(data.hl2).toBe(5);
	expect(data.ohlc4).toBe(5);

	expect(data.progress).toBe(3); // 300% increase
})

test('new Data(...).toString()', () => {
	const data = new Data({
		timestamp: new Date(2020,0,1),
		low: 1,
		high: 1,
		open: 1,
		close: 1
	});
	expect(data.toString()).toBe('2020-01-01T00:00:00+01:00 h:1 o:1 c:1 l:1');
})

test('Data.random()', () => {
	expect(() => Data.random()).not.toThrow();
})

test('new Data() instanceof Data', () => {
	expect(Data.random() instanceof Data).toBe(true)
})

test('Data validation -> close', () => {
	const data = {
		timestamp: new Date(),
		low: 0,
		high: 10,
		open: 0,
		close: 11
	};
	expect(() => new Data(data)).toThrow('Assertion Failed: .close (11) should be equal or smaller than .high (10)');
})

test('Data validation -> open', () => {
	const data = {
		timestamp: new Date(),
		low: 0,
		high: 10,
		open: -1,
		close: 10
	};
	expect(() => new Data(data)).toThrow('Assertion Failed: .open (-1) should be equal or greater than .low (0)');
})

test('Data validation -> timestamp', () => {
	const data = {
		...Data.random(),
		timestamp: 'BAD_DATETIME',
	};
	expect(() => new Data(data)).toThrow('Assertion Failed: timestamp is not valid');
})

test('.isAttached()', () => {
	const data = Data.random();
	expect(data.isAttached).toBe(false);
})

test('.toJSON()', () => {
	const data = new Data({
		timestamp: '2020-01-01T00:00:00',
		low: 1,
		high: 1,
		open: 1,
		close: 1
	});
	
	const json = JSON.stringify(data);
	expect(json).toBe('{"timestamp":"2019-12-31T23:00:00.000Z","low":1,"high":1,"open":1,"close":1}');
})


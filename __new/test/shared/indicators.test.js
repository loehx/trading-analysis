const indicators = require("../../src/shared/indicators");

describe('indicators', () => {

	test('.getCandlePatterns', () => {
		const patterns = indicators.getCandlePatterns(
			[18.35,22.20,21.60],
			[21.60,22.70,22.05],
			[21.30,22.52,19.45],
			[18.13,21.87,19.30],
		);

		for (let name in patterns) {
			patterns[name] = patterns[name][2];
		};
		
		expect(patterns).toStrictEqual({"abandonedbaby": 0, "bearish": null, "bearishengulfingpattern": 0, "bearishharami": 0, "bearishharamicross": 0, "bearishmarubozu": 0, "bearishspinningtop": 0, "bullish": null, "bullishengulfingpattern": 0, "bullishharami": 0, "bullishharamicross": 0, "bullishmarubozu": 0, "bullishspinningtop": 1, "darkcloudcover": 0, "doji": 0, "downsidetasukigap": 0, "dragonflydoji": 0, "eveningdojistar": 0, "eveningstar": 1, "gravestonedoji": 0, "morningdojistar": 0, "morningstar": 0, "piercingline": 0, "threeblackcrows": 0, "threewhitesoldiers": 0})
	})

})
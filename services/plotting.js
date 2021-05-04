const { DataFactory, Symbols } = require("../src/data");
const { Log, plot2d, util } = require("../src/shared");
const { scaleMinMax, scaleByMean, crossJoinByProps } = require("../src/shared/util");
const tf = require('@tensorflow/tfjs');
const { plot } = require("nodeplotlib");

(async () => {
	const log = Log.consoleLog('plotting');
	const factory = new DataFactory(log);
	
	// const x = util.range(-5, 5, 0.1);
	// const fns = [
	// 	'acos',
	// 	'acosh',
	// 	'asin',
	// 	'asinh',
	// 	'atan',
	// 	//'atan2',
	// 	'atanh',
	// 	'ceil',
	// 	'cos',
	// 	'cosh',
	// 	'elu',
	// 	'erf',
	// 	'exp',
	// 	'expm1',
	// 	'floor',
	// 	'isInf',
	// 	'leakyRelu',
	// 	'log',
	// 	'log1p',
	// 	'logSigmoid',
	// 	'neg',
	// 	//'prelu',
	// 	'reciprocal',
	// 	'relu',
	// 	'relu6',
	// 	'round',
	// 	'rsqrt',
	// 	'selu',
	// 	'sigmoid',
	// 	'sign',
	// 	'sin',
	// 	'sinh',
	// 	'softplus',
	// 	'sqrt',
	// 	'square',
	// 	'step',
	// 	'tan',
	// 	'tanh'];

	// plot2d(...fns.map((fn, i) => ({
	// 	x: x,
	// 	'original': x,
	// 	[fn]: tf[fn](tf.tensor1d(x)).arraySync()
	// })));

	const series = await factory.getDataSeries(Symbols.NASDAQ_HOURLY_HISTORICAL, { limit: 40000 });

	const close = series.map(k => k.close);
	let mm = scaleMinMax(scaleByMean(close, 100))

	plot2d({
		x: series.map(k => k.timestamp),
		mm,
		mm1: scaleMinMax(util.reduceSpikes(mm, .2)),
	})

	return;

	// plot2d({
	// 	x: series.map(k => k.timestamp),
	// 	//'Default': close,
	// 	'scaleByMean': scaleMinMax(scaleByMean(close, 200)),
	// 	'erf': scaleMinMax(scaleByMean(close, 200)).map(erf),
	// })

	plot2d(crossJoinByProps({
		a1:  havg,
		a2:  -lavg,
		a3:  .8,
		a4: -.8,
		a5:  1,
		p:  0.1,
	}).map(o => ({
		mm,
		[JSON.stringify(o)]: mm.map(v => erf(v, o))
	})).reduce((a,b) => ({ ...a, ...b }), {x: series.map(k => k.timestamp)}))
})();


function erf(x, { a1, a2, a3, a4, a5, p }) {

    // Save the sign of x
    var sign = 1;
    if (x < 0) {
        sign = -1;
    }
    x = Math.abs(x);

    // A&S formula 7.1.26
    var t = 1.0/(1.0 + p*x);
    var y = 1.0 - (((((a5*t + a4)*t) + a3)*t + a2)*t + a1)*t*Math.exp(-x*x);

    return sign*y;
}
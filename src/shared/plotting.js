const { plot, Plot, stack } = require('nodeplotlib');
const util = require('./util');

const plotting = module.exports = {

	plotLines(options) {
		// type: line, bar, scatter, scatter3d
		const keys = Object.keys(options).filter(k => k != 'x');
		plot(
			keys.map(k => ({
				x: options.x,
				y: Array.isArray(options[k]) ? options[k] : options.x.map(options[k]),
				type: 'line',
				name: k
			}))
		);
	},

	plotData(options) {
		// type: line, bar, scatter, scatter3d
		const keys = Object.keys(options).filter(k => k !== 'x');
		const labels = options.labels && (Array.isArray(options.labels) ? options.labels : options.x.map(options.labels));

		plot(
			keys.map(k => {
				let y = options[k];
				if (typeof y === 'function') {
					y = options.x.map(options[k]);
				}
				
				if (!Array.isArray(y)) {
					return;
				}

				let x = options.x || options[k].map((_,i) => i + 1);
				
				if (options.scaleMinMax) {
					y = util.scaleMinMax(y, true);
				}

				return {
					x,
					y,
					type: options.type,
					mode: options.mode,
					text: labels,
					name: k
				};
			}).filter(k => k)
		);
	},

	plot3d(z) {
		plot([
			{
				z,
				type: 'surface'
			}
		]);
	},
};
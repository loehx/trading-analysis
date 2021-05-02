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

	plot2d(...args) {
		if (Array.isArray(args[0])) {
			args = args[0];
		}
		args.forEach(options => {
			// type: line, bar, scatter, scatter3d
			const keys = Object.keys(options).filter(k => k !== 'x');
			const labels = options.labels && (Array.isArray(options.labels) ? options.labels : options.x.map(options.labels));

			stack(
				keys.map(k => {
					let y = options[k];
					if (typeof y === 'function') {
						y = options.x.map(options[k]);
					}
					
					if (!Array.isArray(y)) {
						return;
					}

					const count = Math.min(y.length, options.max || Infinity);
					let x = options.x || util.range(1, count);

					if (y.length > options.max) {
						y = y.slice(y.length - options.max);
					}

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
		});
		plot();
	},

	plot3d(...args) {
		args.forEach(options => {
			let z = options.z || options.data;
			if (!Array.isArray(z[0])) {
				const chunkSize = Math.round(Math.sqrt(z.length));
				zNew = [];
				for (let i = 0; i < chunkSize; i++) {
					zNew.push(z.slice(i * chunkSize, (i + 1) * chunkSize));
				}
				z = zNew;
			}
			stack([
				{
					z,
					type: 'surface',
					title: options.title,
				}
			]);
		})
		
		plot();
	},
};
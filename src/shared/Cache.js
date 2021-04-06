const path = require('path');
const fs = require("fs");
const config = require("../../config");

class Cache {
	constructor(storageKey, caching = false) {
		const directory = config['cache.directory'];
		this.basePath = path.join(directory, storageKey);
		this.basePath = path.resolve(this.basePath);
		fs.mkdirSync(this.basePath, { recursive: true });
	}

	get length() {
		let count = 0;
		return fs.readdirSync(this.basePath, () => count++).length;
	}

	setItem(key, value) {
		const data = JSON.stringify(value, null, 4);
		fs.writeFileSync(this._filePath(key), data, 'utf8');
	}

	getItem(key) {
		if (this.hasItem(key)) {
			return require(this._filePath(key));
		}
		return null;
	}

	hasItem(key) {
		return fs.existsSync(this._filePath(key));
	}

	clear() {
		fs.rmdirSync(this.basePath, { recursive: true });
		fs.mkdirSync(this.basePath, { recursive: true });
	}

	removeItem(key) {
		fs.unlinkSync(this._filePath(key));
	}

	_filePath(key) {
		return path.join(this.basePath, this._key(key) + '.json');
	}

	_key(key) {
		return key.replace(/[\\/:"*?<>|]+/gi, '-').toLowerCase();
	}
}

module.exports = Cache;
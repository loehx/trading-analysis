const path = require('path');
const keyFileStorage = require("key-file-storage/dist")

class Cache {
	constructor(storageKey, caching = false) {
		// caching = true: Unlimited cache, anything will be cached on memory, good for small data volumes
		// caching = false: No cache, read the files from disk every time, good when other applications can modify the files' contents arbitrarily
		this.storage = keyFileStorage(path.join('./.cache', storageKey), caching);
	}

	setItem(key, value) {
		this.storage[key] = value;
	}

	getItem(key) {
		return this.storage[key];
	}

	hasItem(key) {
		return key in this.storage;
	}

	clear() {
		delete this.storage['*'];
	}

	removeItem(key) {
		delete this.storage[key];
	}
}

module.exports = Cache;
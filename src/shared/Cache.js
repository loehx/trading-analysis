const path = require('path');

// https://github.com/lmaccherone/node-localstorage
const { JSONStorage } = require('node-localstorage');

class Cache extends JSONStorage {
	constructor(storageKey) {
		super(path.join('./.cache', storageKey));
	}
}

module.exports = Cache;
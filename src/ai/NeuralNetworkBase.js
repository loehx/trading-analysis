const tf = require('@tensorflow/tfjs-node');
const { ensure, assert } = require("../shared/assertion");
const config = require("../../config");
const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');

assert(() => config['ai.directory']);

module.exports = class NeuralNetworkBase {

	constructor({ id, verbose, log }) {
		ensure(id, String);
		this.id = id.replace(/[\\/:"*?<>| ]+/gi, '-').toLowerCase();
		this.filePath = path.join(config['ai.directory'], this.id);
		this.log = log;
	}

	_log(...args) {
		this.log.write(...args);
	}

	_warn(...args) {
		this.log.warn(...args);
	}

	_compile() {
		throw "._compile() not implemented"
	}

	async fileExists() {
		try{
			return await fs.promises.access(this.filePath);
		}
		catch(e) {
			return false;
		}
	}
	
	async save() {
		assert(this.model, 'The model must have been trained before it can be saved.');
		if (await this.fileExists()) {
			await fs.promises.rmdir(this.filePath);
		}
		try{
			await fs.promises.mkdir(config['ai.directory'])}
		catch(e) {}
		this._log(`Save model to "${this.filePath}"`);
		return await this.model.save('file://' + this.filePath);
	}

	async tryLoad(id) {
		if (this.fileExists()) {
			this.model = await tf.loadLayersModel('file://' + this.filePath + '/model.json');
			this._log(`Model loaded successfully from: "${this.filePath}"`);
			this._compile();
			this._log(`Compiled successfully`);
			return true;
		}
		this._log(`No model found: "${this.filePath}"`);
		return false;
	}
};
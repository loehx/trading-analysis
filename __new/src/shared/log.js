const EventEmitter = require('events');
const util = require('./util');
const { ensure, assert } = require('./assertion');

class Log {

    constructor(name) {
        ensure(name, String);
        this.name = name || 'unnamed';
        this.eventBus = new EventEmitter();
    }

    getName() {
        return this.name;    
    }

    assert(...args) {
        try {
            assert(...args);
        }
        catch(e) {
            this.warning(e.message, e.value)
        }
    }

    ensure(...args) {
        try {
            ensure(...args);
        }
        catch(e) {
            this.warning(e.message, e.value)
        }
    }

    write(message, ...args) {
        this._write('write', message, ...args);
    }

    warning(message, ...args) {
        this._write('warning', message, ...args);
    }

    error(message, ...args) {
        this._write('error', message, ...args);
    }

    on(name, callback) {
        this.eventBus.on(name, callback);
    }

    _write(type, message, ...args) {
        message = message || '(empty)';
        message = `[${this.name}] ${message}`
        this.eventBus.emit(type, message, ...args);
    }
}

module.exports = {
    Log,

};
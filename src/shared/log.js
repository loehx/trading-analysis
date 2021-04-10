const EventEmitter = require('events');
const util = require('./util');
const { ensure, assert } = require('./assertion');

class Log {

    constructor(name, log) {
        ensure(name, String);
        
        if (log) {
            this.name = `${log.name}.${name}`;
            this.eventBus = log.eventBus;
        }
        else {
            this.name = name || 'unnamed';
            this.eventBus = new EventEmitter();
        }
    }

    getName() {
        return this.name;    
    }

    startTimer(name) {
        this.timers = this.timers || [];
        this.timers.push({
            start: new Date(),
            name: name
        })
    }

    stopTimer() {
        const timer = this.timers.pop();
        assert(timer, 'No timer found to stop.');
        const ms = new Date() - timer.start;
        this.write(`"${timer.name}" took ${ms/1000} seconds`);
    }

    assert(...args) {
        try {
            assert(...args);
        }
        catch(e) {
            this.warn(e.message, e.value)
        }
    }

    ensure(...args) {
        try {
            ensure(...args);
        }
        catch(e) {
            this.warn(e.message, e.value)
        }
    }

    write(message, ...args) {
        this._write('write', message, ...args);
    }

    warn(message, ...args) {
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
        this.eventBus.emit('all', type.toString() + ': ' + message, ...args);
    }

    static consoleLog(name) {
        const log = new Log(name);
        log.on('write', console.log);
        log.on('warning', console.warn);
        log.on('error', console.error);
        return log;
    }
}

module.exports = {
    Log
};
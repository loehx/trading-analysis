var rimraf = require("rimraf");
const config = require('../config');

rimraf(config['cache.directory'], function () { console.log("cache cleared!"); });
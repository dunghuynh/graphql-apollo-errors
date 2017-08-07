'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.formatErrorGenerator = exports.initSevenBoom = exports.SevenBoom = undefined;

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _sevenBoom = require('seven-boom');

var _sevenBoom2 = _interopRequireDefault(_sevenBoom);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var log = require('minilog')('grpahql-apollo-error');
require('minilog').enable();


var defaultArgsDef = [{
  name: 'errorCode',
  order: 1
}, {
  name: 'timeThrown',
  order: 2,
  default: null
}, {
  name: 'guid',
  order: 3,
  default: null
}];
_sevenBoom2.default.init(defaultArgsDef);

var defaultFormatErrorOptions = {
  logger: log,
  publicDataPath: '',
  hideSensitiveData: true,
  hooks: {}
};

exports.SevenBoom = _sevenBoom2.default;
var initSevenBoom = exports.initSevenBoom = function initSevenBoom(argsDef) {
  _sevenBoom2.default.init(argsDef);
};

var formatErrorGenerator = exports.formatErrorGenerator = function formatErrorGenerator(formatErrorOptions) {
  var actualOptions = _lodash2.default.defaults(formatErrorOptions, defaultFormatErrorOptions);
  var logger = actualOptions.logger,
      publicDataPath = actualOptions.publicDataPath,
      hooks = actualOptions.hooks,
      showLocations = actualOptions.showLocations,
      showPath = actualOptions.showPath,
      hideSensitiveData = actualOptions.hideSensitiveData;
  var onOriginalError = hooks.onOriginalError,
      onProcessedError = hooks.onProcessedError,
      onFinalError = hooks.onFinalError;

  publicDataPath = publicDataPath ? 'data.' + publicDataPath : 'data';

  return function formatError(graphqlError) {

    var err = graphqlError.originalError || graphqlError;

    if (onOriginalError && _lodash2.default.isFunction(onOriginalError)) {
      onOriginalError(err);
    }

    if (err === undefined || !err.isBoom) {
      err = _sevenBoom2.default.wrap(err, 500);
    }

    if (showLocations) {
      err.output.payload.locations = graphqlError.locations;
    }

    if (showPath) {
      err.output.payload.path = graphqlError.path;
    }

    if (onProcessedError && _lodash2.default.isFunction(onProcessedError)) {
      onProcessedError(err);
    }

    err.output.payload.data = _lodash2.default.get(err, publicDataPath, {});
    var finalError = err.output.payload;

    // Special implemantation for internal server errors
    if (err.isServer && hideSensitiveData) {
      // logger.error(err);
      delete finalError.data;
    } else {
      // logger.debug(err);
    }

    if (onFinalError && _lodash2.default.isFunction(onFinalError)) {
      onFinalError(finalError);
    }

    return finalError;
  };
};
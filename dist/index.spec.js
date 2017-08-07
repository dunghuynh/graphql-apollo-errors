'use strict';

var _chai = require('chai');

var _chai2 = _interopRequireDefault(_chai);

var _chaiAsPromised = require('chai-as-promised');

var _chaiAsPromised2 = _interopRequireDefault(_chaiAsPromised);

require('regenerator-runtime/runtime');

var _index = require('./index');

var _sinon = require('sinon');

var _sinon2 = _interopRequireDefault(_sinon);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_chai2.default.use(_chaiAsPromised2.default);
// var rewire = require("rewire");
// var index = rewire("./index.js");

_chai2.default.use(require('sinon-chai'));


var expect = _chai2.default.expect;

// Most of this tests are taken from the Boom repo
// In order to make sure that you can just replace all Boom with SevenBoom
describe('Init seven boom', function () {
  it('uses the default seven boom argsDefs - guid generator and timeThrown with errorCode arg', function (done) {
    var opts = [{
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

    (0, _index.initSevenBoom)(opts);
    var error = _index.SevenBoom.badRequest('my message', { 'key': 'val' }, 'myErrCode');
    expect(error.output.payload.guid).to.be.a('string');
    // expect(error.output.payload.timeThrown).to.be.a.dateString();
    expect(error.message).to.equal('my message');
    expect(error.output.statusCode).to.equal(400);
    expect(error.output.payload).to.include({
      statusCode: 400,
      error: 'Bad Request',
      message: 'my message',
      errorCode: 'myErrCode'
    });
    expect(error.data).to.include({ 'key': 'val' });
    done();
  });

  it('I can override the default seven-boom args', function (done) {
    var opts = [{
      name: 'myCustomField',
      order: 1
    }];

    (0, _index.initSevenBoom)(opts);
    var error = _index.SevenBoom.badRequest('my message', { 'key': 'val' }, 'myCustomFieldValue');
    expect(error.message).to.equal('my message');
    expect(error.output.statusCode).to.equal(400);
    expect(error.output.payload).to.include({
      statusCode: 400,
      error: 'Bad Request',
      message: 'my message',
      myCustomField: 'myCustomFieldValue'
    });
    expect(error.data).to.include({ 'key': 'val' });
    done();
  });
});

describe('Format error', function () {
  it('Send all data object in default', function (done) {
    var formatError = (0, _index.formatErrorGenerator)();
    var errData = { 'key': 'val' };
    var error = _index.SevenBoom.badRequest('my message', errData, 'myErrCode');
    var err = _simulateGraphqlWrapping(error);
    var finalError = formatError(err);
    expect(finalError.data).to.equal(errData);
    done();
  });

  it('Send only publicPath data', function (done) {
    var fromatErrorOpts = {
      publicDataPath: 'public'
    };
    var formatError = (0, _index.formatErrorGenerator)(fromatErrorOpts);
    var publicData = { 'myPublic': 'data' };
    var errData = { 'key': 'val', public: publicData };
    var error = _index.SevenBoom.badRequest('my message', errData, 'myErrCode');
    var err = _simulateGraphqlWrapping(error);
    var finalError = formatError(err);
    expect(finalError.data).to.equal(publicData);
    done();
  });

  it('Hooks are called', function (done) {
    var onOriginalError = _sinon2.default.spy();
    var onProcessedError = _sinon2.default.spy();
    var onFinalError = _sinon2.default.spy();

    var hooks = {
      onOriginalError: onOriginalError,
      onProcessedError: onProcessedError,
      onFinalError: onFinalError
    };
    var fromatErrorOpts = {
      hooks: hooks
    };
    var formatError = (0, _index.formatErrorGenerator)(fromatErrorOpts);
    // const errData = {'key': 'val'};
    // const originalError = new Error('my message', errData, 'myErrCode');
    var originalError = new Error('my message');
    var processedError = _index.SevenBoom.wrap(originalError, 500);
    var err = _simulateGraphqlWrapping(originalError);
    var finalError = formatError(err);
    expect(onOriginalError.calledWith(originalError)).to.be.true;
    expect(onProcessedError.calledWith(processedError)).to.be.true;
    expect(onFinalError.calledWith(finalError)).to.be.true;
    done();
  });

  it('Transform regular error to SevenBoom error', function (done) {
    var formatError = (0, _index.formatErrorGenerator)();
    var error = new Error('my message');
    var err = _simulateGraphqlWrapping(error);
    var finalError = formatError(err);
    expect(finalError.statusCode).to.equal(500);
    expect(finalError.message).to.equal('An internal server error occurred');
    done();
  });

  it('Add the locations and path if requested', function (done) {
    var fromatErrorOpts = {
      showLocations: true,
      showPath: true
    };
    var formatError = (0, _index.formatErrorGenerator)(fromatErrorOpts);
    var PATH = 'My path to the future';
    var LOCATIONS = 'In a great place';
    var error = new Error('my message');
    var err = _simulateGraphqlWrapping(error, LOCATIONS, PATH);

    var finalError = formatError(err);
    expect(finalError.path).to.equal(PATH);
    expect(finalError.locations).to.equal(LOCATIONS);
    done();
  });

  it('Default hide sensitive data from internal error', function (done) {
    var argsDef = [{
      name: 'errorCode',
      order: 1
    }, {
      name: 'timeThrown',
      order: 3,
      default: null
    }, {
      name: 'guid',
      order: 4,
      default: null
    }];
    (0, _index.initSevenBoom)(argsDef);
    var formatError = (0, _index.formatErrorGenerator)();
    var sensitiveData = { 'secret': 'SevenBoom' };
    var internalError = _index.SevenBoom.internal('Technial message which client should not see', sensitiveData, 'myErrCode');
    var err = _simulateGraphqlWrapping(internalError);

    var finalError = formatError(err);
    expect(finalError.data).to.be.empty;
    expect(finalError.statusCode).to.equal(500);
    expect(finalError.message).to.equal('An internal server error occurred');

    done();
  });

  it('Do not hide sensitive data from internal error when specifically asked', function (done) {
    var argsDef = [{
      name: 'errorCode',
      order: 1
    }, {
      name: 'timeThrown',
      order: 3,
      default: null
    }, {
      name: 'guid',
      order: 4,
      default: null
    }];
    (0, _index.initSevenBoom)(argsDef);
    var formatError = (0, _index.formatErrorGenerator)({ hideSensitiveData: false });
    var sensitiveData = { 'secret': 'SevenBoom' };
    var internalError = _index.SevenBoom.internal('Technial message which client should not see', sensitiveData, 'myErrCode');
    var err = _simulateGraphqlWrapping(internalError);
    var finalError = formatError(err);
    expect(finalError.data).to.include(sensitiveData);
    expect(finalError.statusCode).to.equal(500);
    expect(finalError.message).to.equal('An internal server error occurred');
    done();
  });
});

// Code taken from grpahql implemantation here (with some changes):
// https://github.com/graphql/graphql-js/blob/44f315d1ff72ab32b794937fd11a7f8e792fd873/src/error/GraphQLError.js#L66-L69
function _simulateGraphqlWrapping(originalError, locations, path, nodes, source, positions) {
  var resultError = new Error();
  Object.defineProperties(resultError, {
    message: {
      value: originalError.message,
      // By being enumerable, JSON.stringify will include `message` in the
      // resulting output. This ensures that the simplist possible GraphQL
      // service adheres to the spec.
      enumerable: true,
      writable: true
    },
    locations: {
      // Coercing falsey values to undefined ensures they will not be included
      // in JSON.stringify() when not provided.
      value: locations || [{
        "line": 5,
        "column": 12,
        "field": "email" // HERE
      }],
      // By being enumerable, JSON.stringify will include `locations` in the
      // resulting output. This ensures that the simplist possible GraphQL
      // service adheres to the spec.
      enumerable: true
    },
    path: {
      // Coercing falsey values to undefined ensures they will not be included
      // in JSON.stringify() when not provided.
      value: path || "Some path",
      // By being enumerable, JSON.stringify will include `path` in the
      // resulting output. This ensures that the simplist possible GraphQL
      // service adheres to the spec.
      enumerable: true
    },
    nodes: {
      value: nodes || 'Nodes'
    },
    source: {
      value: source || 'Source'
    },
    positions: {
      value: positions || 'Positions'
    },
    originalError: {
      value: originalError
    }
  });

  return resultError;
}
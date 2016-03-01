'use strict';
const _ = require('underscore');
const loopback = require('loopback')
const explorer = require('../boot/explorer');
const remoteMethods = require('../boot/remote-methods');
const realmProp = require('../boot/realm-prop');
const roleResolver = require('../boot/role-resolver');

module.exports = function(opts) {
  const app = opts.app;
  const options = _.defaults(opts, {
    sharedDataSource: false,
    config: {},
    defaultApiRoot: 'api',
    token: loopback.getModelByType('AccessToken')
  });
  const config = options.config;
  const hasDefaultApi = config.defaultApi && config.defaultApi.length > 0;
  const runMiddlewareBoot = function() {
    [realmProp, remoteMethods, explorer, roleResolver].forEach(function(fn) {
      fn.call(null, app, options);
    });
  };
  app.once('started', runMiddlewareBoot);

  function realmRoute(req, res, next) {
    const registry = app.registry;
    var realm = req.params.realm;
    var hasDefaultApi;

    if (hasDefaultApi && realm === options.defaultApiRoot) {
      realm = config.defaultApi;
    }

    if (!realm || !config.realms || config.realms.indexOf(realm) < 0) {
      var e = new Error('Invalid Realm');
      e.status = e.statusCode = 401;
      e.code = 'INVALID_REALM';
      return next(e);
    }

    req.__tenantMiddleware = Object.freeze({
      realm: realm
    });

    next();
  }
  if (options.defaultApiRoot) {
    app.middleware('auth:before', options.defaultApiRoot, function(req, res, next) {
      req.params.realm = config.defaultApi;
      realmRoute(req, res, next);
    });
  }
  app.middleware('auth:before', '/:realm/api', realmRoute);
};

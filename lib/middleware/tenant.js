'use strict';
const _ = require('underscore');
const loopback = require('loopback')
const explorer = require('../boot/explorer');
const remoteMethods = require('../boot/remote-methods');
const realmProp = require('../boot/remote-methods');

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
    realmProp(app);
    remoteMethods(app);
    explorer(app, options);
  };
  app.once('started', runMiddlewareBoot);

  app.middleware('auth:before', '/:realm/api', function(req, res, next) {
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
  });
};

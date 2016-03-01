'use strict';
const _ = require('underscore');
const ds = require('../mixins/multitenant-datasource');
const scope = require('../mixins/multitenant-scope');
const boot = require('../boot/remote-methods');

module.exports = function(opts) {
  var options;
  var config;
  var AccessToken;
  var hasBooted = false;
  const app = opts.app;
  const runMiddlewareBoot = function() {
    boot(app);
  };
  app.on('started', runMiddlewareBoot);

  app.middleware('auth:before', '/:realm/api', function(req, res, next) {
    const registry = app.registry;
    var realm = req.params.realm;
    var hasDefaultApi;

    if (app.isAuthEnabled) {
      AccessToken = registry.getModelByType('AccessToken');
    }

    if (!hasBooted) {
      runMiddlewareBoot();
    }

    if (!options) {
      options = _.defaults(opts || {}, {
        sharedDataSource: false,
        config: {},
        defaultApiRoot: 'api',
        token: AccessToken,
      });
      config = options.config;
      hasDefaultApi = config.defaultApi && config.defaultApi.length > 0;
    }

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

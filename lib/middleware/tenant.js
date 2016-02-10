'use strict';
const _ = require('underscore');
const setScope = require('../mixins/multitenant-scope').setScope;
const ds = require('../mixins/multitenant-datasource');

module.exports = function tenant(opts) {
  var options;
  var config;
  var AccessToken;
  var disableSharedDataSource = opts && opts.sharedDataSource === false;
  if (disableSharedDataSource) {
    ds.load(config);
  }

  return function (req, res, next) {
    const app = req.app;
    var tenant = req.params.tenant;
    var hasDefaultApi;

    if (app.isAuthEnabled) {
      AccessToken = registry.getModelByType('AccessToken');
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

    if (hasDefaultApi && tenant === options.defaultApiRoot) {
      tenant = config.defaultApi;
    }

    if (!tenant || !config.tenants || config.tenants.indexOf(tenant) < 0) {
      var e = new Error('Invalid Access Token');
      e.status = e.statusCode = 401;
      e.code = 'INVALID_TOKEN';
      return next(e);
    }

    req.__tenantMiddleware = Object.freeze({
      tenant: tenant,
      options: options,
    });

    if (disableSharedDataSource) {
      ds.set(options.token);
    }

    next();
  };
};

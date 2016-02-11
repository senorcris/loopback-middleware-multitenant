'use strict';
const _ = require('underscore');
const tenantMixin = require('../mixins/tenant');
const ds = require('../mixins/multitenant-datasource');
const scope = require('../mixins/multitenant-scope');

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
    const registry = app.registry;
    const context = app.loopback.getCurrentContext();
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
      Object.keys(app.models).forEach(function(name) {
        let model = app.models[name];
        tenantMixin(model);
      });
      scope.setApp(app);
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

    context.set('__tenantMiddleware', {
      tenant: tenant,
      options: options,
    });

    if (disableSharedDataSource) {
      ds.set(options.token);
    }

    next();
  };
};

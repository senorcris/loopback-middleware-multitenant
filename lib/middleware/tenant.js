'use strict';
const _ = require('underscore');
const loopback = require('loopback');
const setScope = require('../mixins/multitenant-scope').setScope;
const setDataSources = require('../mixins/multitenant-datasource').setDataSources;
const loadDataSources = require('../mixins/multitenant-datasource').loadDataSources;
const mergeQuery = require('loopback-datasource-juggler/lib/utils').mergeQuery;

module.exports = function tenant(app, opts) {
  const options = _.defaults(opts || {}, {
    sharedDataSource: false,
    config: {},
    defaultApiRoot: 'api'
  });
  const config = options.config;

  if (!options.sharedDataSource) {
    loadDataSources(config);
  }

  return function (req, res, next) {
    const _default = _.where(config, { 'default': true })[0];
    const context = loopback.getCurrentContext();
    let tenant = req.params.tenant;

    if (tenant === options.defaultApiRoot && config.defaultApi && config.defaultApi.length > 0) {
      tenant = config.defaultApi;
    }

    if (!tenant || !config.tenants || config.tenants.indexOf(tenant) < 0) {
      res.status(app.isAuthEnabled ? 401 : 500);
      res.send();
      return;
    }

    options.default = _default;

    context.set('tenant', tenant);
    context.set('tenantOptions', options);

    if (!options.sharedDataSource) {
      setDataSources(app.models.MemberAccessToken);
    }

    next();
  };
};

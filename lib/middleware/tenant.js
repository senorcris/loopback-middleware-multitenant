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
    tenantConfig: {},
    defaultApiRoot: 'api'
  });
  const tenantConfig = options.tenantConfig;

  if (!options.sharedDataSource) {
    loadDataSources(tenantConfig);
  }

  return function (req, res, next) {
    const _default = _.where(tenantConfig, { 'default': true })[0];
    const context = loopback.getCurrentContext();
    let tenant = req.params.tenant;

    if (tenant === options.defaultApiRoot && _default && _default.name && tenantConfig[_default.name]) {
      tenant = _default.name;
    }

    if (!tenant || !tenantConfig[tenant]) {
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

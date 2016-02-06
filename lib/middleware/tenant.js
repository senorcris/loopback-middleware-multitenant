'use strict';
const _ = require('underscore');
const loopback = require('loopback');
const setScope = require('../mixins/multitenant-scope').setScope;
const setDataSources = require('../mixins/multitenant-datasource').setDataSources;
const loadDataSources = require('../mixins/multitenant-datasource').loadDataSources;
const mergeQuery = require('loopback-datasource-juggler/lib/utils').mergeQuery;

module.exports = function tenant(app, options) {
  const tenantConfig = options.tenantConfig;
  options = options || {};

  if (!options.sharedDataSource) {
    loadDataSources(tenantConfig);
  }

  return function (req, res, next) {
    const _default = _.where(tenantConfig, { default: true })[0];
    const context = loopback.getCurrentContext();
    let tenant = req.params.tenant;

    if (tenant === 'api' && _default && _default.name && tenantConfig[_default.name]) {
      tenant = _default;
    }

    if (!tenant || !tenantConfig[tenant]) {
      res.status(500);
      res.json({ error: 'Something failed!' });
      return;
    }

    options.default = _default;

    context.set('tenant', tenant);
    context.set('tenantOptions', options);

    if (!options.sharedDataSource) {
      setDatasource(app.models.MemberAccessToken);
    }

    next();
  };
};

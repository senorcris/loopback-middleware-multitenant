'use strict';
const loopback = require('loopback');
const debug = require('debug')('loopback:middleware:multitenant');
const multitenantScope = require('./multitenant-scope');
const setDatasource = require('./multitenant-datasource').setDatasource;
const scope = require('./multitenant-scope');

module.exports = function (Model) {
  multitenantScope.extendWithTenantId(Model);
  Model.observe('access', multitenantScope.logAccess);
  Model.observe('access', multitenantScope.limitReadToTenant);
  Model.observe('before save', multitenantScope.limitChangesToTenant);

  Model.beforeRemote('**', function configureModel(ctx, instance, next) {
    const tenant = scope.getTenant();
    const options = tenant.options;

    if (!options.sharedDataSource) {
      setDatasource(Model);
    }

    next();
  });
};

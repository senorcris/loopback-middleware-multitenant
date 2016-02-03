'use strict';
const loopback = require('loopback');
const debug = require('debug')('loopback:middleware:multitenant');
const multitenantScope = require('./multitenant-scope');
const setDatasource = require('./multitenant-datasource').setDatasource;

module.exports = function (Model) {
  multitenantScope.extendWithTenantId(Model);
  Model.observe('access', multitenantScope.logAccess);
  Model.observe('access', multitenantScope.limitReadToTenant);
  Model.observe('before save', multitenantScope.limitChangesToTenant);

  Model.beforeRemote('**', function configureModel(ctx, instance, next) {
    const context = loopback.getCurrentContext();
    const options = context.get('tenantOptions');

    if (!options.sharedDataSource) {
      setDatasource(Model);
    }

    next();
  });
};

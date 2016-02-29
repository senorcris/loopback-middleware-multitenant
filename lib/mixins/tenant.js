'use strict';
const loopback = require('loopback');
const debug = require('debug')('loopback:middleware:multitenant');
const multitenantScope = require('./multitenant-scope');
const setDatasource = require('./multitenant-datasource').setDatasource;
const scope = require('./multitenant-scope');
const defineRealm = function(Model) {
  let settings = Model.definition.settings;
  Model.defineProperty('realm', {
    type: String
  });
  if (settings.hiddenProperties) {
    settings.hiddenProperties.realm = true;
  } else {
    settings.hidden = Model.definition.settings.hidden || [];
    settings.hidden.push('realm');
  }
  debug('Extended model with %s with `realm` property', Model.definition.name);
};

module.exports = function (Model) {
  defineRealm(Model);
  // Model.observe('access', multitenantScope.logAccess);
  // Model.observe('access', multitenantScope.limitReadToTenant);
  // Model.observe('before save', multitenantScope.limitChangesToTenant);
  // Model.beforeRemote('*.*', function(ctx, next) {
  //   debugger;
  //   next();
  // });
  // Model.beforeRemote('prototype.*', function(ctx, instance, next) {
  //   var accessToken = ctx.req.accessToken.realm;
  //
  //   if (!accessToken) {
  //     next();
  //   }
  //
  //   if (!instance.realm) {
  //     instance.realm = ctx.req.accessToken.realm;
  //   }
  //
  //   next();
  // });
};

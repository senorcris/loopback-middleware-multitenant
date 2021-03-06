'use strict';
const loopback = require('loopback');
const debug = require('debug')('loopback:middleware:multitenant');
const mergeQuery = require('loopback-datasource-juggler/lib/utils').mergeQuery;
const _ = require('underscore');
var app;

const setApp = function(_app) {
  app = _app;
};

const getTenant = function () {
  // const context = app.loopback.getCurrentContext();
  // const defaultOpt = {
  //   options: {}
  // };
  // return (context && context.get('__tenantMiddleware')) || defaultOpt;
  return { options: {} };
};

const extendWithTenantId = function extendWithTenantId(Model) {
  let settings = Model.definition.settings;
  Model.defineProperty('realm', {
    type: String,
  });
  if (settings.hiddenProperties) {
    settings.hiddenProperties.realm = true;
  } else {
    settings.hidden = Model.definition.settings.hidden || [];
    settings.hidden.push('realm');
  }

  debug('Extended model with %s with `realm` property', Model.definition.name);
};

const logAccess = function logAccess(ctx, next) {
  debug('Accessing %s matching', ctx.Model.modelName, ctx.query.where);
  next();
};

const limitReadToTenant = function limitReadToTenant(ctx, next) {
  const tenantOpts = getTenant();
  const tenant = tenantOpts.tenant;
  const options = tenantOpts.options;
  debugger;
  return next();

  console.log('limitReadToTenant:options', ctx.options && ctx.options.accessToken);

  if (!tenant) {
    console.log("options.sharedDataSource", options.sharedDataSource);
    return next(new Error('Invalid request'));
  }

  if (!options.sharedDataSource) {
    console.log("options.sharedDataSource", options.sharedDataSource);
    return next();
  }

  if (ctx.hookState.tenantMixinWhereExtended) {
    return next();
  }

  ctx.query = mergeQuery({ where: { realm: tenant } }, ctx.query);
  ctx.hookState.tenantMixinWhereExtended = true;

  debug('Access query modified to ', ctx.query.where);
  next();
};

const limitChangesToTenant = function limitChangesToTenant(ctx, next) {
  const tenantOpts = getTenant();
  var tenant = tenantOpts.tenant;
  const options = tenantOpts.options;
  var data;

  console.log('limitChangesToTenant:options', ctx.options && ctx.options.accessToken);

  if (!options.sharedDataSource) {
    console.log("options.sharedDataSource", options.sharedDataSource);
    return next();
  }

  if (ctx.instance) {
    data = ctx.instance;
  } else if (ctx.data) {
    data = ctx.data;
  }

  if (data && data.realm && !tenant) {
    console.log('limitChangesToTenant:Overriding tenant from data.realm ', tenantOpts, ctx.data, ctx.instance, ctx.Model.modelName);
    tenant = data.realm;
  }

  if (!tenant) {
    console.log('limitChangesToTenant:Tenant set realm for ', tenantOpts, ctx.data, ctx.instance, ctx.Model.modelName);
    return next(new Error('Invalid request'));
  }

  if (data) {
    data.realm = tenant;
    console.log('limitChangesToTenant:Tenant set realm for ', data.realm, ctx.Model.modelName);
    debug('limitChangesToTenant:Tenant set realm for %s', data.realm);
  }

  next();
};

const setScope = function setScope(ctx, next) {
  const tenantOpts = getTenant();
  const realm = tenantOpts.tenant;
  const options = tenantOpts.options;
  let filter;

  if (!options.sharedDataSource) {
    return next();
  }

  try {
    filter = ctx.args.filter && ctx.args.filter.length ? JSON.parse(ctx.args.filter) : {};
  } catch (e) {
    debug('Could not convert filter to JSON', e);
    return next();
  }

  filter.where = _.extend(filter.where || {}, {
    realm: realm,
  });

  debug('Overriding query for realm ', realm, ' to ', filter);
  ctx.args.filter = JSON.stringify(filter);
  next();
};

module.exports = {
  extendWithTenantId,
  logAccess,
  limitReadToTenant,
  limitChangesToTenant,
  setScope,
  setApp,
  getTenant,
};

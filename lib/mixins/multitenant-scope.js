'use strict';
const loopback = require('loopback');
const debug = require('debug')('loopback:middleware:multitenant');
const mergeQuery = require('loopback-datasource-juggler/lib/utils').mergeQuery;

const extendWithTenantId = function extendWithTenantId(Model) {
  Model.defineProperty('tenantId', {
    'type': String,
    'required': true
  });
  Model.definition.settings = Model.definition.settings || {};
  Model.definition.settings.hiddenProperties = Model.definition.settings.hiddenProperties || { tenantId: true };
  Model.definition.settings.hiddenProperties.tenantId = true;
  debug('Extended model with %s with `tenantId` property', Model.definition.name);
};

const logAccess = function logAccess(ctx, next) {
  debug('Accessing %s matching', ctx.Model.modelName, ctx.query.where);
  next();
};

const limitReadToTenant = function limitReadToTenant(ctx, next) {
  const context = loopback.getCurrentContext();
  const tenant = context.get('tenant');
  const options = context.get('tenantOptions');

  if (!tenant) {
    return next(new Error('Invalid query'));
  }

  if (ctx.hookState.tenantMixinWhereExtended || !options.sharedDataSource) {
    return next();
  }

  ctx.query = mergeQuery({ where: { tenantId: tenant } }, ctx.query);
  ctx.hookState.tenantMixinWhereExtended = true;

  debug('Access query modified to ', ctx.query.where);
  next();
};

const limitChangesToTenant = function limitChangesToTenant(ctx, next) {
  const context = loopback.getCurrentContext();
  const tenant = context.get('tenant');
  const options = context.get('tenantOptions');

  if (!options.sharedDataSource) {
    return next();
  }

  if (ctx.instance) {
    ctx.instance.tenantId = tenant;
    debug('Tenant set for instance %s', ctx.instance.tenantId);
  } else if (ctx.data) {
    ctx.data.tenantId = tenant;
    debug('Tenant set for data %s', ctx.data.tenantId);
  }

  next();
};

const setScope = function setScope(ctx) {
  let filter;
  const context = loopback.getCurrentContext();
  const tenant = context.get('tenant');
  const options = context.get('tenantOptions');

  if (!options.sharedDataSource) {
    return next();
  }

  try {
    filter = ctx.args.filter && ctx.args.filter.length ? JSON.parse(ctx.args.filter) : {};
  } catch (e) {
    debug('Could not convert filter to JSON', e);
    return;
  }
  let tenantFilters = Object.assign(filter, {
    where: {
      tenant: tenant
    }
  });

  debug('Overriding query for tenant', tenant, ' to ', tenantFilters);
  ctx.args.filter = JSON.stringify(tenantFilters);
};

module.exports = {
  extendWithTenantId,
  logAccess,
  limitReadToTenant,
  limitChangesToTenant,
  setScope
};

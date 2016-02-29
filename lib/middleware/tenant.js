'use strict';
const _ = require('underscore');
const realmMixin = require('../mixins/tenant');
const ds = require('../mixins/multitenant-datasource');
const scope = require('../mixins/multitenant-scope');
const mergeQuery = require('loopback-datasource-juggler/lib/utils').mergeQuery;
const errNotAllowed = function(code, msg) {
  var e = new Error(msg);
  e.status = e.statusCode = 401;
  e.code = code;
  return e;
};

module.exports = function(opts) {
  var options;
  var config;
  var AccessToken;

  if (true || opts.enableRemoteContext) {
    let app = opts.app;
    app.on('started', function() {
      Object.keys(app.models).forEach(function(name) {
        let model = app.models[name];
        realmMixin(model);
      });
      opts.app.remotes().before('**', function(ctx, next) {
        var err = null;
        var accessToken = ctx.req.accessToken;
        var middleware = ctx.req.__tenantMiddleware;
        var hasRealm = accessToken && middleware && accessToken.realm === middleware.realm;
        var isLogin = ctx.method.name === 'login';
        if (!isLogin && !hasRealm) {
          err = errNotAllowed('NOT_ALLOWED', 'Not allowed');
        }
        next(err);
      });
      opts.app.remotes().after('**', function(ctx, next) {
        var err = null;
        var accessToken = ctx.req.accessToken;
        var middleware = ctx.req.__tenantMiddleware;
        var hasRealm = accessToken && middleware && accessToken.realm === middleware.realm;
        var isLogin = ctx.method.name === 'login';
        if (!isLogin && !hasRealm) {
          err = errNotAllowed('NOT_ALLOWED', 'Not allowed');
        }
        if (ctx.result && ctx.result.length) {
          debugger;
          ctx.result = ctx.result.filter(function(model) {
            return !model.realm || (model.realm === middleware.realm);
          });
        } else if(ctx.result !== null && typeof ctx.result === 'object' && ctx.result.realm && ctx.result.realm !== middleware.realm) {
          err = errNotAllowed('NOT_ALLOWED', 'Not allowed');
        }
        next(err);
      });
      opts.app.remotes().before('**', function(ctx, next) {
        var realm = ctx.req.__tenantMiddleware.realm;
        var realmWhere = { where: { realm: realm } };

        if (!ctx.method.accepts) {
          return next();
        }

        if (ctx.args.data) {
          ctx.args.data.realm = realm;
        }

        debugger;
        if (_.where(ctx.method.accepts, { arg: 'filter' }).length === 1) {
          let filter;
          if (typeof ctx.args.filter === 'object' && ctx.args.filter !== null) {
            filter = ctx.args.filter || {};
            ctx.args.filter = mergeQuery(filter, realmWhere);
          } else {
            filter = JSON.parse(ctx.args.filter || '{}');
            ctx.args.filter = JSON.stringify(mergeQuery(filter, realmWhere));
          }
        } else if (_.where(ctx.method.accepts, { arg: 'where' }).length === 1) {
          let where;
          if (typeof ctx.args.where === 'object' && ctx.args.where !== null) {
            where = ctx.args.where || {};
            let filter = mergeQuery({ where: where }, realmWhere);
            ctx.args.where = JSON.stringify(filter.where);
          } else {
            where = JSON.parse(ctx.args.where || '{}');
            let filter = mergeQuery({ where: where }, realmWhere);
            ctx.args.where = filter.where;
          }
        }

        next();
      });
      opts.app.remotes().before('*.prototype.*', function(ctx, instance, next) {
        var accessToken = ctx.req.accessToken;

        if (typeof instance === 'function') {
          next = instance;
        }

        if (!accessToken || !instance) {
          return next();
        }

        if (!instance.realm) {
          instance.realm = ctx.req.accessToken.realm;
        } else if (instance.realm !== accessToken.realm) {
          next(errNotAllowed('REALM_REQUIRED', 'Realm is required'));
        }

        next();
      });
    });
  }

  opts.app.middleware('auth:before', '/:tenant/api', function(req, res, next) {
    const app = req.app;
    const registry = app.registry;
    var realm = req.params.tenant;
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

    if (hasDefaultApi && realm === options.defaultApiRoot) {
      realm = config.defaultApi;
    }

    if (!realm || !config.tenants || config.tenants.indexOf(realm) < 0) {
      var e = new Error('Invalid Realm');
      e.status = e.statusCode = 401;
      e.code = 'INVALID_REALM';
      return next(e);
    }

    req.__tenantMiddleware = Object.freeze({
      realm: realm
    });

    next();
  });
};

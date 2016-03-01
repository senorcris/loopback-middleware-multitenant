'use strict';
const realmMixin = require('../mixins/tenant');
const mergeQuery = require('loopback-datasource-juggler/lib/utils').mergeQuery;
const errNotAllowed = function(code, msg) {
  var e = new Error(msg);
  e.status = e.statusCode = 401;
  e.code = code;
  return e;
};

module.exports = function(app) {
  Object.keys(app.models).forEach(function(name) {
    let model = app.models[name];
    realmMixin(model);
  });

  app.remotes().before('**', function limitToRealm(ctx, next) {
    var err = null;
    var accessToken = ctx.req.accessToken;
    var middleware = ctx.req.__tenantMiddleware;
    var hasRealm = accessToken && middleware && accessToken.realm === middleware.realm;
    var isLogin = ctx.method.name === 'login';
    if (!isLogin && !hasRealm) {
      err = errNotAllowed('NOT_AUTHORIZED', 'Not Authorized');
    }
    next(err);
  });

  app.remotes().after('**', function filterUnauthorizedResults(ctx, next) {
    var err = null;
    var accessToken = ctx.req.accessToken;
    var middleware = ctx.req.__tenantMiddleware;

    if (ctx.result && ctx.result.length) {
      ctx.result = ctx.result.filter(function(model) {
        return !model.realm || (model.realm === middleware.realm);
      });
    } else if(ctx.result !== null && typeof ctx.result === 'object' && ctx.result.realm && ctx.result.realm !== middleware.realm) {
      err = errNotAllowed('NOT_AUTHORIZED', 'Not Authorized');
    }

    next(err);
  });

  app.remotes().before('**', function limitQueryToRealm(ctx, next) {
    var realm = ctx.req.__tenantMiddleware.realm;
    var realmWhere = { where: { realm: realm } };

    if (!ctx.method.accepts) {
      return next();
    }

    if (ctx.args.data) {
      ctx.args.data.realm = realm;
    }

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

  app.remotes().before('*.prototype.*', function setRealm(ctx, instance, next) {
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
};

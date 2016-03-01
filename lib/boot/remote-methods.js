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
  class RealmScope {
    constructor() {
      app.remotes().before('**', this.auth);
      app.remotes().before('**', this.applyScope);
      app.remotes().after('**', this.filterResults);
      app.remotes().before('*.prototype.*', this.setRealm);
    }
    auth(ctx, next) {
      var err = null;
      var accessToken = ctx.req.accessToken;
      var middleware = ctx.req.__tenantMiddleware;
      var hasRealm = accessToken && middleware && accessToken.realm === middleware.realm;
      var isLogin = ctx.method.name === 'login';
      if (!isLogin && !hasRealm) {
        err = this.errNotAllowed('NOT_AUTHORIZED', 'Not Authorized');
      }
      next(err);
    }
    applyScope(ctx, next) {
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
    }
    filterResults(ctx, next) {
      var err = null;
      var accessToken = ctx.req.accessToken;
      var middleware = ctx.req.__tenantMiddleware;

      if (ctx.result && ctx.result.length) {
        ctx.result = ctx.result.filter(function(model) {
          return !model.realm || (model.realm === middleware.realm);
        });
      } else if(ctx.result && ctx.result.realm && ctx.result.realm !== middleware.realm) {
        err = this.errNotAllowed('NOT_AUTHORIZED', 'Not Authorized');
      }

      next(err);
    }
    setRealm(ctx, next) {
      var err = null;
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
        err = errNotAllowed('REALM_REQUIRED', 'Realm is required');
      }

      next(err);
    }
  }
  new RealmScope();
};

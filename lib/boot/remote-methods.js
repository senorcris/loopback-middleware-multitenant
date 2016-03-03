'use strict';
const realmMixin = require('../mixins/tenant');
const mergeQuery = require('loopback-datasource-juggler/lib/utils').mergeQuery;
const errNotAllowed = function(code, msg) {
  var e = new Error(msg);
  e.status = e.statusCode = 401;
  e.code = code;
  return e;
};

module.exports = function(app, options) {
  class RealmScope {
    constructor() {
      app.remotes().before('**', this.auth);
      app.remotes().before('**', this.applyScope.bind(this));
      app.remotes().after('**', this.filterResults);
      app.remotes().before('*.prototype.*', this.setRealm);
    }
    auth(ctx, next) {
      var err = null;
      var accessToken = ctx.req.accessToken;
      var middleware = ctx.req.__tenantMiddleware;
      var hasRealm = accessToken && middleware && accessToken.realm === middleware.realm;
      var isLogin = ctx.method.name === 'login';
      var isActivate = !ctx.method.isStatic && ctx.method.name === 'activate';

      if (isLogin && ctx.args.credentials) {
        ctx.args.credentials.realm = (middleware && middleware.realm) || options.config.defaultApi;
      }

      if (!isLogin && !hasRealm && !ctx.method.isStatic && !isActivate) {
        err = errNotAllowed('NOT_AUTHORIZED', 'Not Authorized');
      }

      next(err);
    }
    setScope(source, scope) {
      let filter = source || {};
      if (typeof source === 'string') {
        filter = JSON.parse(source);
      }
      return mergeQuery(filter, scope);
    }
    applyScope(ctx, next) {
      var realm = ctx.req.__tenantMiddleware.realm;
      var scope = { where: { realm: realm } };

      if (!ctx.method.accepts) {
        return next();
      }

      if (ctx.args.data) {
        ctx.args.data.realm = realm;
      }

      if (_.where(ctx.method.accepts, { arg: 'filter' }).length === 1) {
        ctx.args.filter = this.setScope(ctx.args.filter, scope);
      } else if (_.where(ctx.method.accepts, { arg: 'where' }).length === 1) {
        ctx.args.where = this.setScope(ctx.args.where, scope);
      }

      next();
    }
    filterResults(ctx, next) {
      var err = null;
      var accessToken = ctx.req.accessToken;
      var middleware = ctx.req.__tenantMiddleware;
      var isLogin = ctx.method.name === 'login';

      if (isLogin) {
        return next();
      }

      if (ctx.result && ctx.result.length) {
        ctx.result = ctx.result.filter(function(model) {
          if (model.realm !== middleware.realm) {
            console.log("RealmMiddleWare: Unauthorized object filtered ", model, "ctx.method.name ", ctx.method.name, "ctx.args ", ctx.args);
          }
          return !model.realm || (model.realm === middleware.realm);
        });
      } else if(ctx.result && ctx.result.realm && ctx.result.realm !== middleware.realm) {
        err = errNotAllowed('NOT_AUTHORIZED', 'Not Authorized');
      }

      next(err);
    }
    setRealm(ctx, instance, next) {
      var err = null;
      var middleware = ctx.req.__tenantMiddleware;

      if (typeof instance === 'function') {
        next = instance;
      }

      if (!middleware || !instance) {
        return next();
      }

      if (!instance.realm) {
        instance.realm = middleware.realm;
      } else if (instance.realm !== middleware.realm) {
        err = errNotAllowed('REALM_REQUIRED', 'Realm is required');
      }

      next(err);
    }
  }
  new RealmScope();
};

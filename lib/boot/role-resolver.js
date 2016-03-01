module.exports = function(app) {
  var Role = app.models.Role;
  Role.registerResolver(Role.AUTHENTICATED, function(role, ctx, cb) {
    var err = null;
    var accessToken = ctx.accessToken;
    var middleware = ctx.remotingContext.req.__tenantMiddleware;
    var hasRealm = accessToken && middleware && accessToken.realm === middleware.realm;

    process.nextTick(function() {
      cb(null, hasRealm && ctx.isAuthenticated());
    });
  });
};

'use strict';

module.exports = function mountLoopBackExplorer(app, options) {
  const realms = options.config.realms;
  var explorer;

  try {
    explorer = require('loopback-component-explorer');
  } catch(err) {
    app.once('started', function(baseUrl) {
      console.log(
        'Run `npm install loopback-explorer` to enable the LoopBack explorer', baseUrl
      );
    });
    return;
  }

  app.use('/explorer', function(req, res, next) {
    const url = req.originalUrl.replace('/explorer', `/${options.config.defaultApi}/explorer`);
    return res.redirect(req.protocol + '://' + req.get('host') + url);
  });

  realms.forEach(function(name) {
    var explorerApp = explorer.routes(app, {
      basePath: `/${name}/api`,
      apiInfo: {
        'title': name
      }
    });
    app.use(`/${name}/explorer`, explorerApp);
    app.emit('realms:created:explorer', {
      realm: name,
      explorer: explorerApp
    });
    app.once('started', function() {
      var baseUrl = app.get('url').replace(/\/$/, '');
      var explorerPath = explorerApp.mountpath || explorerApp.route;
      console.log('Browse your REST API at %s%s', baseUrl, `/${name}/explorer`);
    });
  });
};

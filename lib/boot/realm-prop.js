'use strict';
const realmMixin = require('../mixins/tenant');

module.exports = function(app) {
  Object.keys(app.models).forEach(function(name) {
    let model = app.models[name];
    realmMixin(model);
  });
};

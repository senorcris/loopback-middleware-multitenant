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
};

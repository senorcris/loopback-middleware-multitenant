const debug = require('debug')('loopback:middleware:multitenant');
const _ = require('underscore');
const loopback = require('loopback');
const path = require('path');
const util = require('util');
const DataSource = require('loopback-datasource-juggler').DataSource;

const getConfig = _.memoize(function getConfig(name) {
  return tenantConfig[name];
});

const getDataSource = _.memoize(function getDataSource(tenant) {
  const config = getConfig(tenant);
  return new DataSource(config.mongodb);
});

const loadDataSources = function(tenantConfig) {
  Object.keys(tenantConfig).forEach(function(name) {
    const fileName = util.format('datasources.%s', name);
    const filePath = path.resolve(__dirname, '../', fileName);
    tenantConfig[name] = require(filePath);
    getDataSource(name);
  });
};

const setDatasource = function setDatasource(Model) {
  const context = loopback.getCurrentContext();
  const tenant = context.get('tenant');
  const dataSource = getDataSource(tenant);
  if (Model.definition) {
    debug('Setting data source for tenant %s and model %s', tenant, Model.definition.name);
  }
  loopback.configureModel(Model, { dataSource: dataSource });
};

module.exports = {
  loadDataSources,
  getDataSource,
  setDatasource
};

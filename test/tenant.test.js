'use strict';
var proxyquire = require('proxyquire').noCallThru();

describe.only('Tenant', function() {
  var sandbox;
  var tenantMiddleware;
  var ds;
  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    ds = sandbox.stub({
      'loadDataSources': function(){}
    });
    tenantMiddleware = proxyquire('../lib/middleware/tenant', {
      '../mixins/multitenant-datasource': ds
    });
  });
  afterEach(function() {
    sandbox.restore();
  });
  it('should call loadDataSources when options.sharedDataSource is falsy', function() {
    tenantMiddleware({}, { tenantConfig: {} });
    expect(ds.loadDataSources).to.have.been.called;
  });
  it('should set the tenant and tenantOptions for a request');
  it('should respond with a status of 500 when a tenant id is not valid');
  it('should use the default tenant when options.defaultRoot and defaultTenant are defined');
});

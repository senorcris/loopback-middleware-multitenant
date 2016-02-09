'use strict';
var proxyquire = require('proxyquire').noCallThru();
var httpMocks = require('node-mocks-http');

describe('Tenant', function() {
  var sandbox;
  var tenantMiddleware;
  var ds;
  var getContextStub;
  var setContextStub;
  var app;
  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    ds = sandbox.stub({
      'loadDataSources': function(){}
    });
    getContextStub = sandbox.stub();
    setContextStub = sandbox.stub();
    tenantMiddleware = proxyquire('../lib/middleware/tenant', {
      '../mixins/multitenant-datasource': ds,
    });
    app = {
      'loopback': {
        'getCurrentContext': function() {
          return {
            'get': getContextStub,
            'set': setContextStub,
          };
        },
      },
    };
  });

  afterEach(function() {
    sandbox.restore();
  });

  it('should initialize with default options', function() {
    tenantMiddleware(app);
    expect(ds.loadDataSources).to.have.been.called;
  });

  it('should call loadDataSources when options.sharedDataSource is falsy', function() {
    var next = sandbox.stub();
    var res = httpMocks.createResponse();
    var req = httpMocks.createRequest({
      params: {
        tenant: 'tenantOne',
      }
    });
    var middleware = tenantMiddleware(app, {
      sharedDataSource: true,
      config: {
        tenants: ['tenantOne'],
        defaultApi: 'tenantOne',
      }
    });
    middleware(req, res, next);
    expect(setContextStub).to.have.been.calledWith('tenant', 'tenantOne');
    expect(setContextStub).to.have.been.called;
    expect(setContextStub.getCall(1).args[0]).to.equal('tenantOptions');
    expect(setContextStub.getCall(1).args[1]).to.be.an.Object;
    expect(next).to.have.been.calledOnce;
  });
  it('should set the tenant and tenantOptions for a request', function() {
    tenantMiddleware(app, { tenantConfig: {} });
    expect(ds.loadDataSources).to.have.been.called;
  });
  it('should respond with a status of 500 when a tenant id is not valid', function() {
    var next = sandbox.stub();
    var res = httpMocks.createResponse();
    var req = httpMocks.createRequest({
      params: {
        tenant: 'tenantOne',
      }
    });
    var middleware = tenantMiddleware(app, {
      sharedDataSource: true,
      config: {}
    });
    middleware(req, res, next);
    expect(res.statusCode).to.equal(500);
    expect(setContextStub).to.have.not.have.been.called;
    expect(next).to.not.have.been.called;
  });
  it('should use the default tenant when options.defaultRoot and defaultTenant are defined', function() {
    var next = sandbox.stub();
    var res = httpMocks.createResponse();
    var req = httpMocks.createRequest({
      params: {
        tenant: 'api'
      }
    });
    var middleware = tenantMiddleware(app, {
      sharedDataSource: true,
      config: {
        tenants: ['tenantOne'],
        defaultApi: 'tenantOne',
      }
    });
    middleware(req, res, next);
    expect(setContextStub).to.have.have.been.calledTwice;
    expect(next).to.have.been.called;
  });
});

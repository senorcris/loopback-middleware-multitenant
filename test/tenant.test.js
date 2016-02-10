'use strict';
var proxyquire = require('proxyquire').noCallThru();
var httpMocks = require('node-mocks-http');

describe('Tenant', function () {
  var sandbox;
  var tenantMiddleware;
  var ds;
  var getContextStub;
  var setContextStub;
  var app;
  beforeEach(function () {
    sandbox = sinon.sandbox.create();
    ds = sandbox.stub({
      load: function () {},

      set: function () {},
    });
    getContextStub = sandbox.stub();
    setContextStub = sandbox.stub();
    tenantMiddleware = proxyquire('../lib/middleware/tenant', {
      '../mixins/multitenant-datasource': ds,
    });
    app = {
      loopback: {
        getCurrentContext: function () {
          return {
            get: getContextStub,
            set: setContextStub,
          };
        },
      },
    };
  });

  afterEach(function () {
    sandbox.restore();
  });

  it('should initialize with default options', function () {
    tenantMiddleware();
    expect(ds.load).to.not.have.been.called;
  });

  it('should load data source when options.sharedDataSource is falsy', function () {
    var next = sandbox.stub();
    var res = httpMocks.createResponse();
    var req = httpMocks.createRequest({
      app: app,
      params: {
        tenant: 'tenantOne',
      },
    });
    var middleware = tenantMiddleware({
      sharedDataSource: true,
      config: {
        tenants: ['tenantOne'],
        defaultApi: 'tenantOne',
      },
    });
    middleware(req, res, next);
    expect(req.__tenantMiddleware).to.contain.keys(['tenant', 'options']);
    expect(req.__tenantMiddleware.tenant).to.equal('tenantOne');
    expect(next).to.have.been.calledOnce;
  });

  it.skip('should set the tenant and tenantOptions for a request', function () {
    tenantMiddleware({ tenantConfig: {} });
    expect(ds.load).to.have.been.called;
  });

  it('should call next with an error when a tenant id is not valid', function () {
    var next = sandbox.stub();
    var res = httpMocks.createResponse();
    var req = httpMocks.createRequest({
      app: app,
      params: {
        tenant: 'tenantOne',
      },
    });
    var middleware = tenantMiddleware({
      sharedDataSource: true,
      config: {},
    });
    middleware(req, res, next);
    expect(setContextStub).to.have.not.have.been.called;
    expect(next).to.have.been.called;
    expect(next.getCall(0).args[0].statusCode).to.equal(401);
  });

  it('should use the default tenant when options.defaultRoot and defaultTenant are defined', function () {
    var next = sandbox.stub();
    var res = httpMocks.createResponse();
    var req = httpMocks.createRequest({
      app: app,
      params: {
        tenant: 'api',
      },
    });
    var middleware = tenantMiddleware({
      sharedDataSource: true,
      config: {
        tenants: ['tenantOne'],
        defaultApi: 'tenantOne',
      },
    });
    middleware(req, res, next);
    expect(req.__tenantMiddleware).to.contain.keys(['tenant', 'options']);
    expect(next).to.have.been.called;
  });
});

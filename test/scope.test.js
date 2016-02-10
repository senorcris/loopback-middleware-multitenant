'use strict';
var httpMocks = require('node-mocks-http');
var proxyquire = require('proxyquire').noCallThru();
var getStub;
var multitenantScope = proxyquire('../lib/mixins/multitenant-scope', {
  loopback: {
    getCurrentContext: function () {
      return {
        get: getStub,
      };
    },
  },
});

describe('Scope', function () {
  var sandbox;

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
    getStub = sandbox.stub();
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('extendWithTenantId', function () {
    it('should create the property `tenantId` for a model -- hiddenProperties', function () {
      var ModelStub = sandbox.stub({
        definition: {
          name: 'ModelStub',
          settings: {
            hiddenProperties: {},
          },
        },
        defineProperty: function () {},
      });
      multitenantScope.extendWithTenantId(ModelStub);
      expect(ModelStub.defineProperty).to.have.been.calledWith('tenantId', {
        type: String,
        required: true,
      });
      expect(ModelStub.definition.settings.hiddenProperties).to.contain.key('tenantId');
      expect(ModelStub.definition.settings.hiddenProperties.tenantId).to.be.true;
    });

    it('should create the property `tenantId` for a model -- hidden', function () {
      var ModelStub = sandbox.stub({
        definition: {
          name: 'ModelStub',
          settings: {
            hidden: [],
          },
        },
        defineProperty: function () {},
      });
      multitenantScope.extendWithTenantId(ModelStub);
      expect(ModelStub.defineProperty).to.have.been.calledWith('tenantId', {
        type: String,
        required: true,
      });
      expect(ModelStub.definition.settings.hidden).to.contain('tenantId');
    });

    it('should create the property `tenantId` for a model', function () {
      var ModelStub = sandbox.stub({
        definition: {
          name: 'ModelStub',
          settings: {},
        },
        defineProperty: function () {},
      });
      multitenantScope.extendWithTenantId(ModelStub);
      expect(ModelStub.defineProperty).to.have.been.calledWith('tenantId', {
        type: String,
        required: true,
      });
      expect(ModelStub.definition.settings.hidden).to.contain('tenantId');
    });
  });

  describe('limitReadToTenant', function () {
    it('should call next with an error when tenant is not defined', function () {
      var ctx = sandbox.stub({
        req: httpMocks.createRequest(),
      });
      var next = sandbox.stub();
      multitenantScope.limitReadToTenant(ctx, next);
      expect(next).to.have.been.called;
    });

    it('should call next when the tenant mixin has been extended', function () {
      var ctx = sandbox.stub({
        req: httpMocks.createRequest({
          __tenantMiddleware: {
            tenant: 'tenantOne',
            options: {
              sharedDataSource: true,
            },
          },
        }),
        hookState: {},
        query: {},
      });
      var next = sandbox.stub();
      multitenantScope.limitReadToTenant(ctx, next);
      multitenantScope.limitReadToTenant(ctx, next);
      expect(ctx.hookState.tenantMixinWhereExtended).to.be.true;
      expect(next).to.have.been.calledTwice;
    });

    it('should limit all queries to a specific tenantId', function () {
      var ctx = sandbox.stub({
        req: httpMocks.createRequest({
          __tenantMiddleware: {
            tenant: 'tenantOne',
            options: {
              sharedDataSource: true,
            },
          },
        }),
        hookState: {},
        query: {},
      });
      var next = sandbox.stub();
      multitenantScope.limitReadToTenant(ctx, next);
      expect(next).to.have.been.called;
      expect(ctx.hookState.tenantMixinWhereExtended).to.be.true;
      expect(ctx.query.where.tenantId).to.equal('tenantOne');
    });
  });

  describe('limitChangesToTenant', function () {
    it('should not change ctx.instance or ctx.data when the data source is not shared', function () {
      var ctx = sandbox.stub({
        req: httpMocks.createRequest({
          __tenantMiddleware: {
            tenant: 'tenantOne',
            options: {
              sharedDataSource: false,
            },
          },
        }),
        hookState: {},
        query: {},
        instance: {},
        data: {},
      });
      var next = sandbox.stub();
      multitenantScope.limitChangesToTenant(ctx, next);
      expect(ctx.instance).to.not.contain.key('tenantId');
      expect(ctx.data).to.not.contain.key('tenantId');
    });

    it('should extend ctx.instance with a tenantId', function () {
      var ctx = sandbox.stub({
        req: httpMocks.createRequest({
          __tenantMiddleware: {
            tenant: 'tenantOne',
            options: {
              sharedDataSource: true,
            },
          },
        }),
        hookState: {},
        query: {},
        instance: {},
        data: {},
      });
      var next = sandbox.stub();
      multitenantScope.limitChangesToTenant(ctx, next);
      expect(ctx.instance).to.contain.key('tenantId');
      expect(ctx.instance.tenantId).to.equal('tenantOne');
      expect(ctx.data).to.not.contain.key('tenantId');
    });

    it('should extend ctx.data with a tenantId', function () {
      var ctx = sandbox.stub({
        req: httpMocks.createRequest({
          __tenantMiddleware: {
            tenant: 'tenantOne',
            options: {
              sharedDataSource: true,
            },
          },
        }),
        hookState: {},
        query: {},
        data: {},
      });
      var next = sandbox.stub();
      getStub.onCall(0).returns('tenantOne');
      getStub.onCall(1).returns({ sharedDataSource: true });
      multitenantScope.limitChangesToTenant(ctx, next);
      expect(ctx.data).to.contain.key('tenantId');
      expect(ctx.data.tenantId).to.equal('tenantOne');
    });
  });

  describe('setScope', function () {
    it('should not run when sharedDataSource is false', function () {
      var ctx = sandbox.stub({
        req: httpMocks.createRequest({
          __tenantMiddleware: {
            tenant: 'tenantOne',
            options: {
              sharedDataSource: false,
            },
          },
        }),
        args: {
          filter: '',
        },
      });
      var next = sandbox.stub();
      multitenantScope.setScope(ctx, next);
      expect(ctx.args.filter).to.equal('');
      expect(next).to.have.been.calledOnce;
    });

    it('should bail if invalid JSON is used for the filters', function () {
      var ctx = sandbox.stub({
        req: httpMocks.createRequest({
          __tenantMiddleware: {
            tenant: 'tenantOne',
            options: {
              sharedDataSource: true,
            },
          },
        }),
        args: {
          filter: '{"where":{"key":"value"},}',
        },
      });
      var next = sandbox.stub();
      sandbox.spy(JSON, 'parse');
      getStub.onCall(0).returns('tenantOne');
      getStub.onCall(1).returns({ sharedDataSource: true });
      multitenantScope.setScope(ctx, next);
      expect(JSON.parse).to.have.been.calledWith(ctx.args.filter);
      expect(next).to.have.been.calledOnce;
    });

    it('should extend filters with a `tenantId` where clause', function () {
      var ctx = sandbox.stub({
        req: httpMocks.createRequest({
          __tenantMiddleware: {
            tenant: 'tenantOne',
            options: {
              sharedDataSource: true,
            },
          },
        }),
        args: {
          filter: '{"where":{"key":"value"}}',
        },
      });
      var next = sandbox.stub();
      sandbox.spy(JSON, 'stringify');
      multitenantScope.setScope(ctx, next);
      expect(JSON.stringify).to.have.been.calledWith({
        where: {
          key: 'value',
          tenant: 'tenantOne',
        },
      });
      expect(next).to.have.been.calledOnce;
    });
  });
});

'use strict';
var httpMocks = require('node-mocks-http');
var proxyquire = require('proxyquire').noCallThru();
var multitenantScope = require('../lib/mixins/multitenant-scope');

describe('Scope', function () {
  var sandbox;
  var getContextStub;

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
    getContextStub = sandbox.stub();
    multitenantScope.setApp({
      loopback: {
        getCurrentContext: function() {
          return {
            get: getContextStub,
            set: sandbox.stub(),
          }
        }
      }
    })
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('extendWithTenantId', function () {
    it('should create the property `realm` for a model -- hiddenProperties', function () {
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
      expect(ModelStub.defineProperty).to.have.been.calledWith('realm', {
        type: String,
        required: true,
      });
      expect(ModelStub.definition.settings.hiddenProperties).to.contain.key('realm');
      expect(ModelStub.definition.settings.hiddenProperties.realm).to.be.true;
    });

    it('should create the property `realm` for a model -- hidden', function () {
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
      expect(ModelStub.defineProperty).to.have.been.calledWith('realm', {
        type: String,
        required: true,
      });
      expect(ModelStub.definition.settings.hidden).to.contain('realm');
    });

    it('should create the property `realm` for a model', function () {
      var ModelStub = sandbox.stub({
        definition: {
          name: 'ModelStub',
          settings: {},
        },
        defineProperty: function () {},
      });
      multitenantScope.extendWithTenantId(ModelStub);
      expect(ModelStub.defineProperty).to.have.been.calledWith('realm', {
        type: String,
        required: true,
      });
      expect(ModelStub.definition.settings.hidden).to.contain('realm');
    });
  });

  describe('limitReadToTenant', function () {
    it('should call next with an error when tenant is not defined', function () {
      var ctx = sandbox.stub({});
      var next = sandbox.stub();
      getContextStub.returns({
        options: {
          sharedDataSource: true,
        },
      });
      multitenantScope.limitReadToTenant(ctx, next);
      expect(next).to.have.been.called;
    });

    it('should call next when the tenant mixin has been extended', function () {
      var ctx = sandbox.stub({
        hookState: {},
        query: {},
      });
      var next = sandbox.stub();
      getContextStub.returns({
        tenant: 'tenantOne',
        options: {
          sharedDataSource: true,
        },
      });
      multitenantScope.limitReadToTenant(ctx, next);
      multitenantScope.limitReadToTenant(ctx, next);
      expect(ctx.hookState.tenantMixinWhereExtended).to.be.true;
      expect(next).to.have.been.calledTwice;
    });

    it('should limit all queries to a specific realm', function () {
      var ctx = sandbox.stub({
        hookState: {},
        query: {},
      });
      var next = sandbox.stub();
      getContextStub.returns({
        tenant: 'tenantOne',
        options: {
          sharedDataSource: true,
        },
      });
      multitenantScope.limitReadToTenant(ctx, next);
      expect(next).to.have.been.called;
      expect(ctx.hookState.tenantMixinWhereExtended).to.be.true;
      expect(ctx.query.where.realm).to.equal('tenantOne');
    });
  });

  describe('limitChangesToTenant', function () {
    it('should not change ctx.instance or ctx.data when the data source is not shared', function () {
      var ctx = sandbox.stub({
        hookState: {},
        query: {},
        instance: {},
        data: {},
      });
      var next = sandbox.stub();
      getContextStub.returns({
        tenant: 'tenantOne',
        options: {
          sharedDataSource: false,
        },
      });
      multitenantScope.limitChangesToTenant(ctx, next);
      expect(ctx.instance).to.not.contain.key('realm');
      expect(ctx.data).to.not.contain.key('realm');
    });

    it('should extend ctx.instance with a realm', function () {
      var ctx = sandbox.stub({
        hookState: {},
        query: {},
        instance: {},
        data: {},
      });
      var next = sandbox.stub();
      getContextStub.returns({
        tenant: 'tenantOne',
        options: {
          sharedDataSource: true,
        },
      });
      multitenantScope.limitChangesToTenant(ctx, next);
      expect(ctx.instance).to.contain.key('realm');
      expect(ctx.instance.realm).to.equal('tenantOne');
      expect(ctx.data).to.not.contain.key('realm');
    });

    it('should extend ctx.data with a realm', function () {
      var ctx = sandbox.stub({
        hookState: {},
        query: {},
        data: {},
      });
      var next = sandbox.stub();
      getContextStub.returns({
        tenant: 'tenantOne',
        options: {
          sharedDataSource: true,
        },
      });
      multitenantScope.limitChangesToTenant(ctx, next);
      expect(ctx.data).to.contain.key('realm');
      expect(ctx.data.realm).to.equal('tenantOne');
    });
  });

  describe('setScope', function () {
    it('should not run when sharedDataSource is false', function () {
      var ctx = sandbox.stub({
        args: {
          filter: '',
        },
      });
      var next = sandbox.stub();
      getContextStub.returns({
        tenant: 'tenantOne',
        options: {
          sharedDataSource: false,
        },
      });
      multitenantScope.setScope(ctx, next);
      expect(ctx.args.filter).to.equal('');
      expect(next).to.have.been.calledOnce;
    });

    it('should bail if invalid JSON is used for the filters', function () {
      var ctx = sandbox.stub({
        args: {
          filter: '{"where":{"key":"value"},}',
        },
      });
      var next = sandbox.stub();
      sandbox.spy(JSON, 'parse');
      getContextStub.returns({
        tenant: 'tenantOne',
        options: {
          sharedDataSource: true,
        },
      });
      multitenantScope.setScope(ctx, next);
      expect(JSON.parse).to.have.been.calledWith(ctx.args.filter);
      expect(next).to.have.been.calledOnce;
    });

    it('should extend filters with a `realm` where clause', function () {
      var ctx = sandbox.stub({
        args: {
          filter: '{"where":{"key":"value"}}',
        },
      });
      var next = sandbox.stub();
      sandbox.spy(JSON, 'stringify');
      getContextStub.returns({
        tenant: 'tenantOne',
        options: {
          sharedDataSource: true,
        },
      });
      multitenantScope.setScope(ctx, next);
      expect(JSON.stringify).to.have.been.calledWith({
        where: {
          key: 'value',
          realm: 'tenantOne',
        },
      });
      expect(next).to.have.been.calledOnce;
    });
  });
});

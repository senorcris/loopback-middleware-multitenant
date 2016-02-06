'use strict';
var proxyquire = require('proxyquire').noCallThru();
var getStub;
var multitenantScope = proxyquire('../lib/mixins/multitenant-scope', {
  'loopback': {
    'getCurrentContext': function() {
      return {
        'get': getStub
      };
    }
  }
});

describe('Scope', function() {
  var sandbox;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    getStub = sandbox.stub();
  });

  afterEach(function() {
    sandbox.restore();
  });

  it('should create the property `tenantId` for a model -- hiddenProperties', function() {
    var ModelStub = sandbox.stub({
      definition: {
        name: 'ModelStub',
        settings: {
          hiddenProperties: {}
        }
      },
      defineProperty: function(){}
    });
    multitenantScope.extendWithTenantId(ModelStub);
    expect(ModelStub.defineProperty).to.have.been.calledWith('tenantId', {
      'type': String,
      'required': true
    });
    expect(ModelStub.definition.settings.hiddenProperties).to.contain.key('tenantId');
    expect(ModelStub.definition.settings.hiddenProperties.tenantId).to.be.true;
  });

  it('should create the property `tenantId` for a model -- hidden', function() {
    var ModelStub = sandbox.stub({
      definition: {
        name: 'ModelStub',
        settings: {
          hidden: []
        }
      },
      defineProperty: function(){}
    });
    multitenantScope.extendWithTenantId(ModelStub);
    expect(ModelStub.defineProperty).to.have.been.calledWith('tenantId', {
      'type': String,
      'required': true
    });
    expect(ModelStub.definition.settings.hidden).to.contain('tenantId');
  });

  it('should create the property `tenantId` for a model', function() {
    var ModelStub = sandbox.stub({
      definition: {
        name: 'ModelStub',
        settings: {}
      },
      defineProperty: function(){}
    });
    multitenantScope.extendWithTenantId(ModelStub);
    expect(ModelStub.defineProperty).to.have.been.calledWith('tenantId', {
      'type': String,
      'required': true
    });
    expect(ModelStub.definition.settings.hidden).to.contain('tenantId');
  });

  it('should call next with an error when tenant is not defined', function() {
    var ctx = sandbox.stub();
    var next = sandbox.stub();
    multitenantScope.limitReadToTenant(ctx, next);
    expect(next).to.have.been.called;
  });

  it('should call next when the tenant mixin has been extended', function() {
    var ctx = sandbox.stub({
      hookState: {},
      query: {}
    });
    var next = sandbox.stub();
    getStub.onCall(0).returns('tenantOne');
    getStub.onCall(1).returns({ sharedDataSource: true });
    getStub.onCall(2).returns('tenantOne');
    getStub.onCall(3).returns({ sharedDataSource: true });
    multitenantScope.limitReadToTenant(ctx, next);
    multitenantScope.limitReadToTenant(ctx, next);
    expect(ctx.hookState.tenantMixinWhereExtended).to.be.true;
    expect(next).to.have.been.calledTwice;
  });

  it('should limit all queries to a specific tenantId', function() {
    var ctx = sandbox.stub({ hookState: {}, query: {} });
    var next = sandbox.stub();
    getStub.onCall(0).returns('tenantOne');
    getStub.onCall(1).returns({ sharedDataSource: true });
    multitenantScope.limitReadToTenant(ctx, next);
    expect(next).to.have.been.called;
    expect(ctx.hookState.tenantMixinWhereExtended).to.be.true;
    expect(ctx.query.where.tenantId).to.equal('tenantOne');
  });
});

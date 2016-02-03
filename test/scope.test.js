'use strict';
var proxyquire = require('proxyquire').noCallThru();
var getStub = sinon.stub();
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
  it('should create the property `tenantId` for a model', function() {
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
  it('should call next with an error when tenant is not defined', function() {
    var ctx = sandbox.stub();
    var next = sandbox.stub();
    multitenantScope.limitReadToTenant(ctx, next);
    expect(next).to.have.been.calledWith(new Error('Invalid query'));
  });
  it('should limit all queries to a specific tenantId', function() {
    var loopback = require('loopback');
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

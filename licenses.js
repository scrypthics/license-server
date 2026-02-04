const tierPolicy = {
  Free: { maxActivations: 0, features: ['basic'] },
  Pro: { maxActivations: 2, features: ['basic','advanced'] },
  Enterprise: { maxActivations: 10, features: ['basic','advanced','multi-seat'] },
};

const licenses = new Map([
  ['FREE-0000-0000', { tier: 'Free', expiry: null, status: 'active', activations: [] }],
  ['PRO-1234-ABCD', { tier: 'Pro', expiry: '2027-12-31', status: 'active', activations: [] }],
  ['ENT-9999-ZZZZ', { tier: 'Enterprise', expiry: '2028-12-31', status: 'active', activations: [] }],
]);

module.exports = { licenses, tierPolicy };

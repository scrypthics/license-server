const tierPolicy = {
  Trial: { maxActivations: 1, features: ['basic'] },
  Pro: { maxActivations: 3, features: ['pro'] },
};

const licenses = new Map([
  ['TRIAL-TESTDEVICE123', { tier: 'Trial', expiry: null, status: 'active', activations: [] }],
  ['PRO-1234-ABCD', { tier: 'Pro', expiry: '2027-12-31', status: 'active', activations: [] }],
]);

module.exports = { licenses, tierPolicy };

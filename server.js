require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const { licenses, tierPolicy } = require('./licenses');

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const PORT = process.env.PORT || 10000;

function signPayload(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

app.get('/health', (req,res)=>res.json({status:'ok'}));

app.post('/activate',(req,res)=>{
  const { licenseKey, deviceId } = req.body;
  const record = licenses.get(licenseKey);
  if(!record) return res.status(404).json({error:'license not found'});
  const policy = tierPolicy[record.tier];
  record.activations = record.activations||[];
  if(!record.activations.includes(deviceId)){
    if(record.activations.length>=policy.maxActivations) return res.status(403).json({error:'limit reached'});
    record.activations.push(deviceId);
  }
  const payload={licenseKey,tier:record.tier,expiry:record.expiry,features:policy.features,deviceId};
  res.json({status:'active',token:signPayload(payload),...payload});
});

// Issue trial license
app.post('/issue-trial', (req, res) => {
  const { deviceId, appVersion } = req.body || {};
  if (!deviceId) {
    return res.status(400).json({ error: 'deviceId is required' });
  }

  // Trial policy: 30 days, 1 activation per device
  const now = new Date();
  const expiry = new Date();
  expiry.setDate(now.getDate() + 30);

  const payload = {
    licenseKey: `TRIAL-${deviceId}`,
    tier: 'Trial',
    expiry: expiry.toISOString(),
    features: ['basic'],
    deviceId,
    appVersion,
    issuedAt: now.toISOString(),
  };

  const token = signPayload(payload);
  return res.json({ status: 'trial-issued', token, ...payload });
});

app.listen(PORT,()=>console.log(`Running on ${PORT}`));

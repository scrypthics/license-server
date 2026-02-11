require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const cors = require('cors');
const { licenses, tierPolicy } = require('./licenses');

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const PORT = process.env.PORT || 10000;
const ADMIN_KEY = process.env.LICENSE_ADMIN_KEY || '';
const DB_FILE = process.env.LICENSE_DB_FILE || path.join(__dirname, 'licenses_store.json');

function signPayload(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

function saveLicensesToFile() {
  try {
    const obj = {};
    for (const [k, v] of licenses.entries()) obj[k] = v;
    fs.writeFileSync(DB_FILE, JSON.stringify(obj, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to persist licenses:', err);
  }
}

function loadLicensesFromFile() {
  try {
    if (!fs.existsSync(DB_FILE)) return;
    const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    for (const k of Object.keys(data)) licenses.set(k, data[k]);
  } catch (err) {
    console.error('Failed to load licenses from file:', err);
  }
}

loadLicensesFromFile();

function requireAdmin(req, res, next) {
  const key = req.get('X-API-Key') || '';
  if (!ADMIN_KEY) return res.status(500).json({ error: 'server admin key not configured' });
  if (key !== ADMIN_KEY) return res.status(401).json({ error: 'unauthorized' });
  next();
}

app.get('/health', (req,res)=>res.json({status:'ok'}));

app.post('/activate',(req,res)=>{
  const { licenseKey, deviceId } = req.body || {};
  const record = licenses.get(licenseKey);
  if(!record) return res.status(404).json({error:'license not found'});
  const policy = tierPolicy[record.tier] || { maxActivations: 1, features: [] };
  record.activations = record.activations||[];
  if(!record.activations.includes(deviceId)){
    if(record.activations.length>= (record.maxActivations || policy.maxActivations)) return res.status(403).json({error:'limit reached'});
    record.activations.push(deviceId);
    saveLicensesToFile();
  }
  const payload={licenseKey,tier:record.tier,expiry:record.expiry,features:record.features||policy.features,deviceId};
  res.json({status:'active',token:signPayload(payload),...payload});
});

// Issue trial license (public)
app.post('/issue-trial', (req, res) => {
  const { deviceId, appVersion } = req.body || {};
  if (!deviceId) {
    return res.status(400).json({ error: 'deviceId is required' });
  }

  const now = new Date();
  const expiry = new Date();
  expiry.setDate(now.getDate() + 30);

  const licenseKey = `TRIAL-${deviceId}`;
  const payload = {
    licenseKey,
    tier: 'Trial',
    expiry: expiry.toISOString(),
    features: ['basic'],
    deviceId,
    appVersion,
    issuedAt: now.toISOString(),
    activations: [deviceId],
  };

  licenses.set(licenseKey, payload);
  saveLicensesToFile();

  const token = signPayload(payload);
  return res.json({ status: 'trial-issued', token, ...payload });
});

// Admin: issue a PRO license (time-bound or perpetual)
app.post('/issue-license', requireAdmin, (req, res) => {
  const { email, tier = 'Pro', durationDays, perpetual, maxActivations = 3, features = [] } = req.body || {};

  const now = new Date();
  let expiry = null;
  if (!perpetual) {
    const days = durationDays || 365;
    expiry = new Date(now);
    expiry.setDate(now.getDate() + days);
    expiry = expiry.toISOString();
  }

  const rnd = crypto.randomBytes(6).toString('hex').toUpperCase();
  const licenseKey = `PRO-${rnd}`;
  const record = {
    licenseKey,
    tier,
    email: email || '',
    expiry,
    features,
    issuedAt: now.toISOString(),
    activations: [],
    maxActivations
  };

  licenses.set(licenseKey, record);
  saveLicensesToFile();
  return res.json({ status: 'issued', licenseKey, record });
});

// Admin: register an externally-generated license record into the server
app.post('/register', requireAdmin, (req, res) => {
  const license = req.body || {};
  if (!license.licenseKey) return res.status(400).json({ error: 'licenseKey required' });
  licenses.set(license.licenseKey, license);
  saveLicensesToFile();
  return res.json({ status: 'registered', licenseKey: license.licenseKey });
});

// Admin: list licenses
app.get('/licenses', requireAdmin, (req, res) => {
  const out = [];
  for (const [k, v] of licenses.entries()) out.push(v);
  res.json({ count: out.length, licenses: out });
});

app.listen(PORT,()=>console.log(`Running on ${PORT}`));

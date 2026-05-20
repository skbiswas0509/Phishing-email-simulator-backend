const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { v4: uuidv4 } = require('uuid');

function logEvent(token, type, req) {
  const recipient = db.prepare('SELECT * FROM recipients WHERE token = ?').get(token);
  if (!recipient) return null;

  db.prepare(`
    INSERT INTO events (id, token, campaign_id, recipient_id, type, ip, user_agent)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    uuidv4(),
    token,
    recipient.campaign_id,
    recipient.id,
    type,
    req.ip,
    req.headers['user-agent']
  );

  return recipient;
}

// Tracking pixel — logs email open
router.get('/open/:token', (req, res) => {
  logEvent(req.params.token, 'open', req);

  // Return a 1x1 transparent GIF
  const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
  res.writeHead(200, { 'Content-Type': 'image/gif', 'Content-Length': pixel.length });
  res.end(pixel);
});

// Click tracking — logs click then redirects to fake landing page
router.get('/click/:token', (req, res) => {
  const recipient = logEvent(req.params.token, 'click', req);
  if (!recipient) return res.status(404).send('Invalid link');

  res.redirect(`${process.env.FRONTEND_URL}/landing/${req.params.token}`);
});

// Credential capture — logs event, discards actual data immediately
router.post('/creds/:token', (req, res) => {
  const recipient = logEvent(req.params.token, 'cred', req);
  if (!recipient) return res.status(404).json({ error: 'Invalid token' });

  // Data is intentionally NOT saved — we only log that it happened
  res.json({ redirect: `${process.env.FRONTEND_URL}/awareness` });
});

// Get events for a campaign (for results page)
router.get('/events/:campaignId', (req, res) => {
  const events = db.prepare(`
    SELECT e.*, r.name, r.email
    FROM events e
    JOIN recipients r ON e.recipient_id = r.id
    WHERE e.campaign_id = ?
    ORDER BY e.created_at DESC
  `).all(req.params.campaignId);

  res.json(events);
});

module.exports = router;
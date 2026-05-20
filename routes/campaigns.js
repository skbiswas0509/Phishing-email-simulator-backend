const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { v4: uuidv4 } = require('uuid');

// GET all campaigns
router.get('/', (req, res) => {
  const campaigns = db.prepare('SELECT * FROM campaigns ORDER BY created_at DESC').all();
  res.json(campaigns);
});

// GET single campaign with stats
router.get('/:id', (req, res) => {
  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(req.params.id);
  if (!campaign) return res.status(404).json({ error: 'Not found' });

  const recipients = db.prepare('SELECT * FROM recipients WHERE campaign_id = ?').all(req.params.id);
  const events     = db.prepare('SELECT * FROM events WHERE campaign_id = ?').all(req.params.id);

  const sent    = recipients.length;
  const opened  = events.filter(e => e.type === 'open').length;
  const clicked = events.filter(e => e.type === 'click').length;
  const creds   = events.filter(e => e.type === 'cred').length;

  res.json({
    ...campaign,
    stats: { sent, opened, clicked, creds }
  });
});

// POST create campaign
router.post('/', (req, res) => {
  const { name, template, target_group, send_date, send_time } = req.body;

  if (!name || !template || !target_group) {
    return res.status(400).json({ error: 'name, template and target_group are required' });
  }

  const id = uuidv4();
  db.prepare(`
    INSERT INTO campaigns (id, name, template, target_group, send_date, send_time, status)
    VALUES (?, ?, ?, ?, ?, ?, 'draft')
  `).run(id, name, template, target_group, send_date, send_time);

  res.status(201).json({ id, message: 'Campaign created' });
});

// PATCH update campaign status
router.patch('/:id/status', (req, res) => {
  const { status } = req.body;
  db.prepare('UPDATE campaigns SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ message: 'Status updated' });
});

// DELETE campaign
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM events     WHERE campaign_id = ?').run(req.params.id);
  db.prepare('DELETE FROM recipients WHERE campaign_id = ?').run(req.params.id);
  db.prepare('DELETE FROM campaigns  WHERE id = ?').run(req.params.id);
  res.json({ message: 'Campaign deleted' });
});

module.exports = router;
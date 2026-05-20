const express    = require('express');
const router     = express.Router();
const db         = require('../db');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');

// Configure your SMTP transporter
const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST,
  port:   process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Email templates
function buildEmail(recipientName, token, template) {
  const clickUrl = `${process.env.BACKEND_URL}/track/click/${token}`;
  const pixelUrl = `${process.env.BACKEND_URL}/track/open/${token}`;

  const templates = {
    'IT Support Request': {
      subject: 'Action Required: Verify Your Account',
      html: `
        <p>Hi ${recipientName},</p>
        <p>Your account requires immediate verification to avoid suspension.</p>
        <p><a href="${clickUrl}">Click here to verify your account</a></p>
        <img src="${pixelUrl}" width="1" height="1" />
      `,
    },
    'DocuSign Contract': {
      subject: 'Please sign: Q2 Contract',
      html: `
        <p>Hi ${recipientName},</p>
        <p>Please review and sign the attached Q2 contract before EOD.</p>
        <p><a href="${clickUrl}">Review Document</a></p>
        <img src="${pixelUrl}" width="1" height="1" />
      `,
    },
    'CEO Wire Transfer': {
      subject: 'Urgent: Wire Transfer Needed',
      html: `
        <p>Hi ${recipientName},</p>
        <p>Please process this wire transfer before close of business today.</p>
        <p><a href="${clickUrl}">View Transfer Details</a></p>
        <img src="${pixelUrl}" width="1" height="1" />
      `,
    },
    'Password Reset Alert': {
      subject: 'Your password expires in 24 hours',
      html: `
        <p>Hi ${recipientName},</p>
        <p>Your password expires in 24 hours. Reset it now to avoid losing access.</p>
        <p><a href="${clickUrl}">Reset Password</a></p>
        <img src="${pixelUrl}" width="1" height="1" />
      `,
    },
  };

  return templates[template] || templates['IT Support Request'];
}

// POST /api/send/:campaignId
// Body: { recipients: [{ name, email }] }
router.post('/:campaignId', async (req, res) => {
  const { campaignId } = req.params;
  const { recipients  } = req.body;

  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(campaignId);
  if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

  if (!recipients || recipients.length === 0) {
    return res.status(400).json({ error: 'No recipients provided' });
  }

  const results = { sent: [], failed: [] };

  for (const recipient of recipients) {
    const token = uuidv4();
    const id    = uuidv4();

    // Save recipient with unique token
    db.prepare(`
      INSERT INTO recipients (id, campaign_id, name, email, token)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, campaignId, recipient.name, recipient.email, token);

    // Build and send email
    const { subject, html } = buildEmail(recipient.name, token, campaign.template);

    try {
      await transporter.sendMail({
        from:    process.env.SMTP_FROM,
        to:      recipient.email,
        subject,
        html,
      });

      // Mark as sent
      db.prepare("UPDATE recipients SET sent_at = datetime('now') WHERE id = ?").run(id);
      results.sent.push(recipient.email);

    } catch (err) {
      results.failed.push({ email: recipient.email, error: err.message });
    }
  }

  // Update campaign status to running
  db.prepare('UPDATE campaigns SET status = ? WHERE id = ?').run('running', campaignId);

  res.json({ message: 'Campaign launched', ...results });
});

module.exports = router;
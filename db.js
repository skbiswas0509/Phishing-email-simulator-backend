const Database = require('better-sqlite3');
const db = new Database('phishguard.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS campaigns (
    id           TEXT PRIMARY KEY,
    name         TEXT NOT NULL,
    template     TEXT NOT NULL,
    target_group TEXT NOT NULL,
    send_date    TEXT,
    send_time    TEXT,
    status       TEXT DEFAULT 'draft',
    created_at   TEXT DEFAULT (datetime('now'))
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS recipients (
    id          TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL,
    name        TEXT NOT NULL,
    email       TEXT NOT NULL,
    token       TEXT UNIQUE NOT NULL,
    sent_at     TEXT,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    id           TEXT PRIMARY KEY,
    token        TEXT NOT NULL,
    campaign_id  TEXT NOT NULL,
    recipient_id TEXT NOT NULL,
    type         TEXT NOT NULL,
    ip           TEXT,
    user_agent   TEXT,
    created_at   TEXT DEFAULT (datetime('now'))
  )
`);

module.exports = db;
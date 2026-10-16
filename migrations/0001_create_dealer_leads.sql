-- Dealer enquiries from /dealership/. One row per accepted submission.
-- email_status: 'pending' until the notification is attempted, then 'sent' or 'failed'.
-- The team follows up on anything not 'sent'.
CREATE TABLE dealer_leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reference_id TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  business_name TEXT NOT NULL,
  business_type TEXT NOT NULL,
  gstin TEXT,
  years_in_business TEXT,
  state TEXT NOT NULL,
  city TEXT NOT NULL,
  pincode TEXT NOT NULL,
  products TEXT NOT NULL,
  monthly_volume TEXT,
  message TEXT,
  email_status TEXT NOT NULL DEFAULT 'pending'
);

CREATE INDEX dealer_leads_created_at ON dealer_leads (created_at);
CREATE INDEX dealer_leads_email_status ON dealer_leads (email_status);

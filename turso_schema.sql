-- Xpense Share Schema (Turso/LibSQL)

DROP TABLE IF EXISTS expense_splits;
DROP TABLE IF EXISTS expenses;
DROP TABLE IF EXISTS group_members;
DROP TABLE IF EXISTS groups;
DROP TABLE IF EXISTS profiles;

-- Profiles Table (Synced from Clerk via webhooks or application logic)
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY, -- Clerk User ID
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  subscription_tier TEXT DEFAULT 'free',
  max_groups INTEGER DEFAULT 10,
  max_members_per_group INTEGER DEFAULT 15,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Groups Table
CREATE TABLE IF NOT EXISTS groups (
  id TEXT PRIMARY KEY DEFAULT (upper(hex(randomblob(16)))),
  name TEXT NOT NULL,
  icon_url TEXT,
  created_by TEXT NOT NULL, -- Clerk User ID
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Group Members Table
CREATE TABLE IF NOT EXISTS group_members (
  id TEXT PRIMARY KEY DEFAULT (upper(hex(randomblob(16)))),
  group_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(group_id, user_id),
  FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
);

-- Expenses Table
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY DEFAULT (upper(hex(randomblob(16)))),
  group_id TEXT,
  description TEXT NOT NULL,
  amount REAL NOT NULL,
  payer_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT NOT NULL,
  FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
  FOREIGN KEY (payer_id) REFERENCES profiles(id) ON DELETE CASCADE
);

-- Expense Splits Table
CREATE TABLE IF NOT EXISTS expense_splits (
  id TEXT PRIMARY KEY DEFAULT (upper(hex(randomblob(16)))),
  expense_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  amount_owed REAL NOT NULL,
  FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
);
-- Settlements Table (User-to-user payments)
CREATE TABLE IF NOT EXISTS settlements (
  id TEXT PRIMARY KEY DEFAULT (upper(hex(randomblob(16)))),
  group_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  receiver_id TEXT NOT NULL,
  amount REAL NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'rejected'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (receiver_id) REFERENCES profiles(id) ON DELETE CASCADE
);

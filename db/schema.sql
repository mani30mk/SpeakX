-- SpeakX Database Schema

-- Practice sessions
CREATE TABLE IF NOT EXISTS sessions (
    id            TEXT PRIMARY KEY,
    scenario_id   TEXT,
    started_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ended_at      DATETIME,
    duration_secs INTEGER,
    transcript    TEXT,           -- full JSON transcript [{role, text, timestamp}]
    summary       TEXT,           -- AI-generated session summary
    feedback      TEXT,           -- AI-generated feedback report (JSON)
    fluency_score REAL,
    grammar_score REAL,
    vocab_score   REAL,
    filler_count  INTEGER DEFAULT 0,
    FOREIGN KEY (scenario_id) REFERENCES scenarios(id)
);

-- Vocabulary deck with SM-2 spaced repetition
CREATE TABLE IF NOT EXISTS vocabulary (
    id            TEXT PRIMARY KEY,
    word          TEXT NOT NULL,
    definition    TEXT,
    context       TEXT,           -- sentence where it was used/misused
    source_session TEXT,
    -- SM-2 fields
    repetition    INTEGER DEFAULT 0,
    efactor       REAL DEFAULT 2.5,
    interval_days INTEGER DEFAULT 1,
    next_review   DATETIME,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (source_session) REFERENCES sessions(id)
);

-- Daily activity for streaks
CREATE TABLE IF NOT EXISTS streaks (
    date              TEXT PRIMARY KEY,  -- YYYY-MM-DD
    sessions_done     INTEGER DEFAULT 0,
    minutes_practiced REAL DEFAULT 0,
    words_reviewed    INTEGER DEFAULT 0
);

-- Conversation scenarios
CREATE TABLE IF NOT EXISTS scenarios (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    category      TEXT NOT NULL,    -- everyday, interview, presentation, debate, phone
    description   TEXT,
    system_prompt TEXT,             -- persona + context for Gemini
    difficulty    TEXT DEFAULT 'intermediate',
    icon          TEXT              -- emoji icon
);

-- Memory briefs compiled from past sessions
CREATE TABLE IF NOT EXISTS memory_briefs (
    id            TEXT PRIMARY KEY,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    content       TEXT NOT NULL,    -- compiled brief for system prompt injection
    sessions_used TEXT              -- JSON array of session IDs included
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_sessions_started ON sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_vocab_next_review ON vocabulary(next_review);
CREATE INDEX IF NOT EXISTS idx_vocab_word ON vocabulary(word);
CREATE INDEX IF NOT EXISTS idx_streaks_date ON streaks(date);
CREATE INDEX IF NOT EXISTS idx_scenarios_category ON scenarios(category);

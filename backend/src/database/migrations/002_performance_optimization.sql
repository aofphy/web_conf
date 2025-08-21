-- Performance optimization migration
-- Migration 002: Add advanced indexes and performance optimizations

-- Composite indexes for common query patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_submissions_user_status ON submissions(user_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_submissions_session_status ON submissions(session_type, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_submission_completed ON reviews(submission_id, is_completed);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role_active ON users(role, is_active);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payment_records_user_status ON payment_records(user_id, status);

-- Partial indexes for common filtered queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_submissions_active ON submissions(id) WHERE status IN ('submitted', 'under_review');
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_pending ON reviews(id) WHERE is_completed = false;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_active ON users(id) WHERE is_active = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payment_pending ON payment_records(id) WHERE status = 'pending';

-- Text search indexes for abstracts and titles
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_submissions_title_text ON submissions USING gin(to_tsvector('english', title));
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_submissions_abstract_text ON submissions USING gin(to_tsvector('english', abstract));
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_submissions_keywords ON submissions USING gin(keywords);

-- Indexes for date-based queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_submissions_submission_date ON submissions(submission_date DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_review_date ON reviews(review_date DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payment_records_payment_date ON payment_records(payment_date DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_registration_date ON users(registration_date DESC);

-- Covering indexes for frequently accessed columns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_submissions_list_covering ON submissions(user_id, status) 
    INCLUDE (id, title, session_type, presentation_type, submission_date);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_profile_covering ON users(id) 
    INCLUDE (email, first_name, last_name, participant_type, role, payment_status);

-- Statistics for better query planning
ANALYZE users;
ANALYZE submissions;
ANALYZE reviews;
ANALYZE payment_records;
ANALYZE authors;
ANALYZE user_sessions;

-- Create materialized view for submission statistics (for admin dashboard)
CREATE MATERIALIZED VIEW IF NOT EXISTS submission_stats AS
SELECT 
    session_type,
    status,
    presentation_type,
    COUNT(*) as count,
    AVG(CASE WHEN r.score IS NOT NULL THEN r.score END) as avg_score
FROM submissions s
LEFT JOIN reviews r ON s.id = r.submission_id AND r.is_completed = true
GROUP BY session_type, status, presentation_type;

-- Create unique index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_submission_stats_unique 
    ON submission_stats(session_type, status, presentation_type);

-- Create materialized view for user statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS user_stats AS
SELECT 
    participant_type,
    role,
    payment_status,
    country,
    COUNT(*) as count,
    DATE_TRUNC('day', registration_date) as registration_day
FROM users
WHERE is_active = true
GROUP BY participant_type, role, payment_status, country, DATE_TRUNC('day', registration_date);

-- Create index on user stats materialized view
CREATE INDEX IF NOT EXISTS idx_user_stats_type_role ON user_stats(participant_type, role);
CREATE INDEX IF NOT EXISTS idx_user_stats_payment ON user_stats(payment_status);
CREATE INDEX IF NOT EXISTS idx_user_stats_date ON user_stats(registration_day);

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_stats_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY submission_stats;
    REFRESH MATERIALIZED VIEW CONCURRENTLY user_stats;
END;
$$ LANGUAGE plpgsql;

-- Create function to get submission statistics efficiently
CREATE OR REPLACE FUNCTION get_submission_statistics()
RETURNS TABLE(
    session_type session_type,
    status submission_status,
    presentation_type presentation_type,
    count bigint,
    avg_score numeric
) AS $$
BEGIN
    RETURN QUERY
    SELECT s.session_type, s.status, s.presentation_type, s.count, s.avg_score
    FROM submission_stats s
    ORDER BY s.session_type, s.status, s.presentation_type;
END;
$$ LANGUAGE plpgsql;

-- Create function to get user statistics efficiently
CREATE OR REPLACE FUNCTION get_user_statistics()
RETURNS TABLE(
    participant_type participant_type,
    role user_role,
    payment_status payment_status,
    country text,
    count bigint,
    registration_day date
) AS $$
BEGIN
    RETURN QUERY
    SELECT u.participant_type, u.role, u.payment_status, u.country, u.count, u.registration_day::date
    FROM user_stats u
    ORDER BY u.registration_day DESC, u.participant_type;
END;
$$ LANGUAGE plpgsql;
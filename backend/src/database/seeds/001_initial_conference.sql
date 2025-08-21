-- Seed data for initial conference setup
-- This creates a sample conference with sessions and registration fees

-- Insert initial conference
INSERT INTO conferences (
    id,
    name,
    description,
    start_date,
    end_date,
    venue,
    registration_deadline,
    submission_deadline,
    is_active
) VALUES (
    uuid_generate_v4(),
    'International Academic Conference 2024',
    'A comprehensive academic conference covering computational chemistry, computer science, biology, mathematics, and physics.',
    '2024-09-15',
    '2024-09-17',
    'International Convention Center, Academic City',
    '2024-08-15 23:59:59+00',
    '2024-07-31 23:59:59+00',
    true
) ON CONFLICT DO NOTHING;

-- Get the conference ID for subsequent inserts
DO $$
DECLARE
    conf_id UUID;
BEGIN
    SELECT id INTO conf_id FROM conferences WHERE name = 'International Academic Conference 2024' LIMIT 1;
    
    -- Insert sessions
    INSERT INTO sessions (conference_id, type, name, description) VALUES
    (conf_id, 'CHE', 'Computational Chemistry', 'Advanced computational methods in chemistry research'),
    (conf_id, 'CSE', 'Computer Science & Engineering', 'High performance computing and engineering applications'),
    (conf_id, 'BIO', 'Computational Biology', 'Bioinformatics, biochemistry, and biophysics research'),
    (conf_id, 'MST', 'Mathematics & Statistics', 'Mathematical modeling and statistical analysis'),
    (conf_id, 'PFD', 'Computational Physics', 'Computational fluid dynamics and solid mechanics')
    ON CONFLICT DO NOTHING;
    
    -- Insert registration fees for different participant types
    INSERT INTO registration_fees (
        conference_id,
        participant_type,
        early_bird_fee,
        regular_fee,
        late_fee,
        currency,
        early_bird_deadline,
        late_registration_start
    ) VALUES
    -- Presenters/Speakers
    (conf_id, 'keynote_speaker', 0.00, 0.00, 0.00, 'USD', '2024-06-15 23:59:59+00', '2024-08-01 00:00:00+00'),
    (conf_id, 'oral_presenter', 150.00, 200.00, 250.00, 'USD', '2024-06-15 23:59:59+00', '2024-08-01 00:00:00+00'),
    (conf_id, 'poster_presenter', 100.00, 150.00, 200.00, 'USD', '2024-06-15 23:59:59+00', '2024-08-01 00:00:00+00'),
    (conf_id, 'panelist', 100.00, 150.00, 200.00, 'USD', '2024-06-15 23:59:59+00', '2024-08-01 00:00:00+00'),
    (conf_id, 'workshop_leader', 50.00, 100.00, 150.00, 'USD', '2024-06-15 23:59:59+00', '2024-08-01 00:00:00+00'),
    -- Attendees
    (conf_id, 'regular_participant', 200.00, 250.00, 300.00, 'USD', '2024-06-15 23:59:59+00', '2024-08-01 00:00:00+00'),
    (conf_id, 'observer', 150.00, 200.00, 250.00, 'USD', '2024-06-15 23:59:59+00', '2024-08-01 00:00:00+00'),
    (conf_id, 'industry_representative', 300.00, 400.00, 500.00, 'USD', '2024-06-15 23:59:59+00', '2024-08-01 00:00:00+00'),
    -- Organizers
    (conf_id, 'conference_chair', 0.00, 0.00, 0.00, 'USD', '2024-06-15 23:59:59+00', '2024-08-01 00:00:00+00'),
    (conf_id, 'scientific_committee', 0.00, 0.00, 0.00, 'USD', '2024-06-15 23:59:59+00', '2024-08-01 00:00:00+00'),
    (conf_id, 'organizing_committee', 0.00, 0.00, 0.00, 'USD', '2024-06-15 23:59:59+00', '2024-08-01 00:00:00+00'),
    (conf_id, 'session_chair', 50.00, 50.00, 50.00, 'USD', '2024-06-15 23:59:59+00', '2024-08-01 00:00:00+00'),
    -- Support Roles
    (conf_id, 'reviewer', 0.00, 0.00, 0.00, 'USD', '2024-06-15 23:59:59+00', '2024-08-01 00:00:00+00'),
    (conf_id, 'technical_support', 0.00, 0.00, 0.00, 'USD', '2024-06-15 23:59:59+00', '2024-08-01 00:00:00+00'),
    (conf_id, 'volunteer', 0.00, 0.00, 0.00, 'USD', '2024-06-15 23:59:59+00', '2024-08-01 00:00:00+00'),
    -- Special Guests
    (conf_id, 'sponsor', 0.00, 0.00, 0.00, 'USD', '2024-06-15 23:59:59+00', '2024-08-01 00:00:00+00'),
    (conf_id, 'government_representative', 100.00, 150.00, 200.00, 'USD', '2024-06-15 23:59:59+00', '2024-08-01 00:00:00+00')
    ON CONFLICT (conference_id, participant_type) DO NOTHING;
    
    -- Insert payment instructions
    INSERT INTO payment_instructions (
        conference_id,
        bank_name,
        account_name,
        account_number,
        swift_code,
        routing_number,
        accepted_methods,
        instructions,
        support_contact
    ) VALUES (
        conf_id,
        'International Academic Bank',
        'Conference Registration Account',
        '1234567890',
        'IACBXXXX',
        '021000021',
        ARRAY['bank_transfer', 'credit_card'],
        'Please include your full name and registration ID in the payment reference. Upload proof of payment after completing the transfer.',
        'anscse29@g.sut.ac.th'
    ) ON CONFLICT DO NOTHING;
    
END $$;
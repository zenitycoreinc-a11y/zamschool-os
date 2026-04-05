-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Schools Table
CREATE TABLE IF NOT EXISTS schools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL, -- School code for students to join
    address TEXT,
    logo_url TEXT,
    phone TEXT,
    email TEXT,
    emis_code TEXT,
    province TEXT,
    district TEXT,
    school_type TEXT,
    ownership_type TEXT,
    website TEXT,
    status TEXT DEFAULT 'ACTIVE', -- ACTIVE, SUSPENDED, DELETED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='schools' AND column_name='emis_code') THEN
        ALTER TABLE schools ADD COLUMN emis_code TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='schools' AND column_name='province') THEN
        ALTER TABLE schools ADD COLUMN province TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='schools' AND column_name='district') THEN
        ALTER TABLE schools ADD COLUMN district TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='schools' AND column_name='school_type') THEN
        ALTER TABLE schools ADD COLUMN school_type TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='schools' AND column_name='ownership_type') THEN
        ALTER TABLE schools ADD COLUMN ownership_type TEXT;
    END IF;
END $$;

-- Migration for existing profiles table (if it exists)
DO $$ 
BEGIN
    -- Add auth_user_id if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='auth_user_id') THEN
        ALTER TABLE profiles ADD COLUMN auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;

    -- Add expanded fields if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='admission_number') THEN
        ALTER TABLE profiles ADD COLUMN admission_number TEXT;
        ALTER TABLE profiles ADD COLUMN employee_id TEXT;
        ALTER TABLE profiles ADD COLUMN parent_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
        ALTER TABLE profiles ADD COLUMN gender TEXT;
        ALTER TABLE profiles ADD COLUMN date_of_birth DATE;
        ALTER TABLE profiles ADD COLUMN grade_id UUID REFERENCES grades(id) ON DELETE SET NULL;
        ALTER TABLE profiles ADD COLUMN class_id UUID REFERENCES classes(id) ON DELETE SET NULL;
        ALTER TABLE profiles ADD COLUMN emergency_contact TEXT;
        ALTER TABLE profiles ADD COLUMN medical_notes TEXT;
        ALTER TABLE profiles ADD COLUMN subjects TEXT[];
        ALTER TABLE profiles ADD COLUMN classes TEXT[];
    END IF;

    -- Update constraints
    -- Remove old FK if it was on the ID column and we want it on auth_user_id instead
    -- This is optional and depends on how strict we want to be
END $$;

-- 2. Profiles Table (Extends auth.users optionally)
CREATE TYPE user_role AS ENUM ('ADMIN', 'TEACHER', 'STUDENT', 'PARENT');

CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), -- Changed to default uuid for bulk import
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Optional link to auth
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    role user_role NOT NULL,
    name TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    email TEXT NOT NULL,
    phone TEXT,
    photo_url TEXT,
    status TEXT DEFAULT 'ACTIVE', -- ACTIVE, INACTIVE, SUSPENDED, TRANSFERRED, WITHDRAWN
    must_change_password BOOLEAN DEFAULT FALSE,
    temporary_password_issued_at TIMESTAMP WITH TIME ZONE,

    -- Expanded fields for students/teachers
    admission_number TEXT, -- For students
    employee_id TEXT, -- For teachers
    parent_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- Link student to parent profile
    gender TEXT, -- MALE, FEMALE, OTHER
    date_of_birth DATE,
    grade_id UUID REFERENCES grades(id) ON DELETE SET NULL,
    class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
    emergency_contact TEXT,
    medical_notes TEXT,
    subjects TEXT[], -- For teachers
    classes TEXT[], -- For teachers

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(email, school_id), -- Email must be unique within a school
    UNIQUE(admission_number, school_id), -- Admission number unique within school
    UNIQUE(employee_id, school_id) -- Employee ID unique within school
);

-- 3. Grades Table
CREATE TABLE IF NOT EXISTS grades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    level INTEGER NOT NULL, -- e.g., 1, 2, 3...
    name TEXT, -- e.g., "Grade 1", "Year 7"
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Classes Table
CREATE TABLE IF NOT EXISTS classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    grade_id UUID NOT NULL REFERENCES grades(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- e.g., "1A", "5B"
    capacity INTEGER DEFAULT 30,
    supervisor_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- Teacher
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Subjects Table
CREATE TABLE IF NOT EXISTS subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5b. Teacher subject specializations
CREATE TABLE IF NOT EXISTS teacher_subject_specializations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    teacher_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (teacher_profile_id, subject_id)
);

-- 5c. Teacher class-subject assignments
CREATE TABLE IF NOT EXISTS teacher_class_subject_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    teacher_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (teacher_profile_id, class_id, subject_id)
);

-- 6. Lessons Table (Timetable entries)
CREATE TABLE IF NOT EXISTS lessons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL, -- 1-7
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    room TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Attendance Table
CREATE TABLE IF NOT EXISTS attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL, -- PRESENT, ABSENT, LATE, EXCUSED
    remarks TEXT,
    marked_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, date, lesson_id)
);

-- 10. Announcements Table
CREATE TABLE IF NOT EXISTS announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    target_role user_role, -- If null, all roles
    target_class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES profiles(id),
    is_pinned BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. Results Table
CREATE TABLE IF NOT EXISTS results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    assessment_type TEXT NOT NULL, -- EXAM, ASSIGNMENT, TEST
    score NUMERIC NOT NULL,
    max_score NUMERIC DEFAULT 100,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    remarks TEXT,
    created_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE SET NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 13. Parents Table (extended parent information)
CREATE TABLE IF NOT EXISTS parents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    relation_type TEXT, -- Mother, Father, Guardian, etc.
    occupation TEXT,
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 14. Parent-Student Links
CREATE TABLE IF NOT EXISTS parent_students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    relationship TEXT, -- Mother, Father, Guardian
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(parent_id, student_id)
);

-- 15. Academic Years
CREATE TABLE IF NOT EXISTS academic_years (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- e.g., "2024-2025"
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 16. Terms
CREATE TABLE IF NOT EXISTS terms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- e.g., "Term 1", "First Term"
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 17. Grading Scales
CREATE TABLE IF NOT EXISTS grading_scales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- e.g., "Standard Scale", "IGCSE Scale"
    min_score NUMERIC NOT NULL,
    max_score NUMERIC NOT NULL,
    grade TEXT NOT NULL, -- e.g., "A", "B", "C"
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 18. Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    dedupe_key TEXT,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT, -- info, warning, success, error
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_school_dedupe_key
ON notifications(school_id, dedupe_key)
WHERE dedupe_key IS NOT NULL;

-- 19. Events
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    event_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    location TEXT,
    target_role user_role, -- If null, all roles
    target_class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 20. Messages
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    subject TEXT,
    body TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 21. Payments/Fees
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    currency TEXT DEFAULT 'ZMW',
    payment_type TEXT, -- tuition, exam_fee, lunch, transport, etc.
    payment_method TEXT, -- cash, bank_transfer, mobile_money
    reference_number TEXT,
    status TEXT DEFAULT 'PENDING', -- PENDING, COMPLETED, FAILED, REFUNDED
    paid_at TIMESTAMP WITH TIME ZONE,
    created_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 22. Finance Records
CREATE TABLE IF NOT EXISTS finance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    transaction_type TEXT NOT NULL, -- income, expense
    category TEXT, -- tuition, salary, utilities, supplies, etc.
    amount NUMERIC NOT NULL,
    currency TEXT DEFAULT 'ZMW',
    description TEXT,
    payment_method TEXT,
    reference_number TEXT,
    transaction_date DATE NOT NULL,
    recorded_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- SECURITY NOTE:
-- Do not expose SECURITY DEFINER SQL execution helpers from the public schema.

-- ROW LEVEL SECURITY (RLS) POLICIES --

-- Tables with RLS enabled
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE results ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE grading_scales ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_verifications ENABLE ROW LEVEL SECURITY;

-- Helper function to get the current user's school_id
CREATE OR REPLACE FUNCTION get_my_school_id()
RETURNS UUID AS $$
  SELECT school_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE;

-- Helper function to get the current user's role
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE;

-- Policy hardening now lives in migrations/010_harden_rls_policies.sql.
-- Keep schema creation separate from least-privilege policy definitions.

-- 13. Email Verifications (for OTP)
CREATE TABLE IF NOT EXISTS email_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    otp_code TEXT NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Enable RLS on email_verifications
ALTER TABLE email_verifications ENABLE ROW LEVEL SECURITY;

-- Only allow users to see their own verification records
CREATE POLICY email_verification_own ON email_verifications
    FOR ALL USING (user_id = auth.uid());

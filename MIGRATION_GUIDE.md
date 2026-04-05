# ZamSchool OS - Database Migration Guide

## 🚨 Important: Migration Order

You must run the migrations in the correct order to avoid errors!

### Step 1: Run Main Database Migration

First, run the main migration that creates all the tables:

**File**: `webapp/migrations/run_this_in_supabase_sql_editor.sql`

1. Open Supabase SQL Editor: <https://supabase.com/dashboard/project/_/sql>
2. Copy the entire contents of `run_this_in_supabase_sql_editor.sql`
3. Paste and execute the SQL

This migration creates:

- ✅ All required tables (payments, finance_records, assignments, etc.)
- ✅ Basic RLS policies
- ✅ Indexes for performance
- ✅ Helper functions

### Step 2: Add Payments Role Support

After Step 1 completes successfully, run the payments role migration:

**File**: `webapp/migrations/003_add_payments_role.sql`

1. In the same Supabase SQL Editor
2. Copy the entire contents of `003_add_payments_role.sql`
3. Paste and execute the SQL

This migration adds:

- ✅ "payments" role to the profiles table constraints
- ✅ Payment-specific indexes and functions
- ✅ Payment summary views
- ✅ Enhanced RLS policies

### Step 3: Verify Migration Success

Run this verification query to check everything worked:

```sql
-- Check if payments role is supported
SELECT 
    column_name,
    check_clause
FROM information_schema.check_constraints cc
JOIN information_schema.constraint_column_usage ccu ON cc.constraint_name = ccu.constraint_name
WHERE cc.constraint_name = 'profiles_role_check';

-- Check if payments table exists
SELECT 
    table_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = t.table_name
    ) THEN '✅ Created' ELSE '❌ Missing' END as status
FROM (
    VALUES 
        ('payments'),
        ('finance_records'),
        ('assignments'),
        ('payment_summaries')
) AS t(table_name);

-- Show current roles in the system
SELECT DISTINCT role, COUNT(*) as user_count
FROM profiles
GROUP BY role
ORDER BY role;
```

## 🔧 Troubleshooting

### Error: "relation 'payments' does not exist"

**Cause**: You're running the payments role migration before the main migration.

**Solution**:

1. Make sure you've completed Step 1 first
2. Run the main migration (`run_this_in_supabase_sql_editor.sql`) completely
3. Then run the payments role migration

### Error: "column 'school_id' does not exist"

**Cause**: The main migration wasn't completed properly.

**Solution**: Re-run the main migration from Step 1.

### Error: "constraint 'profiles_role_check' already exists"

**Cause**: The migration was partially run before.

**Solution**: The migration handles this automatically - it will drop and recreate the constraint.

## ✅ Success Indicators

After successful migration, you should see:

1. **Tables Created**: payments, finance_records, assignments, etc.
2. **Role Constraint**: profiles_role_check with all 5 roles (admin, teacher, student, parent, payments)
3. **View Created**: payment_summaries
4. **Indexes Created**: idx_payments_status, idx_finance_records_type, etc.

## 🚀 Next Steps

After migration is complete:

1. **Create Test Users**: Use the admin panel to create teacher and payments user accounts
2. **Test Login**: Verify each user type can sign in and see their appropriate dashboard
3. **Test Features**: Try creating classes, assignments, and processing payments

## 📞 Support

If you encounter any issues:

1. Check the migration order above
2. Verify each step completed successfully
3. Check the Supabase logs for detailed error messages
4. Make sure you're using the correct project URL in Supabase

---

**Remember**: The migrations must be run in order! Step 1 first, then Step 2.

## before the migration is one i must be open to configues and  we must make sure theapp doesnt not bring about problem"ipv4/must loads without problems

as we launch the production build we noticed type script

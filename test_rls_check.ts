import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function investigate() {
  console.log('=== RLS POLICY INVESTIGATION ===\n');

  // Check if we can access information_schema (bypasses RLS)
  console.log('1. Check information_schema for organizations columns:');
  try {
    const { data, error } = await supabase
      .rpc('get_organizations_columns');
    
    if (error) {
      console.log('   RPC not available:', error.message);
    } else {
      console.log('   Result:', data);
    }
  } catch (e: any) {
    console.log('   Exception:', e.message);
  }

  // Try direct information_schema query
  console.log('\n2. Direct information_schema query:');
  try {
    const { data, error } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_name', 'organizations');
    
    if (error) {
      console.log('   Error:', error.message);
    } else {
      console.log('   Organizations columns:', data);
    }
  } catch (e: any) {
    console.log('   Exception:', e.message);
  }

  // Check pg_catalog for column existence
  console.log('\n3. Check pg_catalog for crm_context:');
  try {
    const { data, error } = await supabase
      .rpc('check_column_exists', { 
        table_name: 'organizations', 
        column_name: 'crm_context' 
      });
    
    if (error) {
      console.log('   RPC not available:', error.message);
    } else {
      console.log('   Result:', data);
    }
  } catch (e: any) {
    console.log('   Exception:', e.message);
  }

  // Try to count rows (might work even with RLS)
  console.log('\n4. Count rows in organizations:');
  try {
    const { count, error } = await supabase
      .from('organizations')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.log('   Error:', error.message);
    } else {
      console.log('   Count:', count);
    }
  } catch (e: any) {
    console.log('   Exception:', e.message);
  }

  // Try to count rows in leads
  console.log('\n5. Count rows in leads:');
  try {
    const { count, error } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.log('   Error:', error.message);
    } else {
      console.log('   Count:', count);
    }
  } catch (e: any) {
    console.log('   Exception:', e.message);
  }

  // Check if we can access auth.users
  console.log('\n6. Check auth status:');
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.log('   Auth error:', error.message);
    } else {
      console.log('   Authenticated user:', user?.id || 'anonymous');
    }
  } catch (e: any) {
    console.log('   Exception:', e.message);
  }
}

investigate();

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function test() {
  const leadId = 'ed78c301-21be-4f7c-9a7f-179ce1e3291a';
  
  // Step 1: Get lead with organization
  console.log('=== STEP 1: Lead + Organization Query ===');
  const { data: leadData, error: leadError } = await supabase
    .from('leads')
    .select(`
      id,
      organization_id,
      organization:organizations(id, name, crm_context)
    `)
    .eq('id', leadId)
    .single();
  
  if (leadError) {
    console.error('Lead query error:', leadError);
  } else {
    console.log('Lead ID:', leadData.id);
    console.log('Organization ID:', leadData.organization_id);
    console.log('Organization:', leadData.organization);
  }

  // Step 2: Direct organization query
  console.log('\n=== STEP 2: Direct Organization Query ===');
  if (leadData?.organization_id) {
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, crm_context')
      .eq('id', leadData.organization_id)
      .single();
    
    if (orgError) {
      console.error('Organization query error:', orgError);
    } else {
      console.log('Organization:', orgData);
    }
  }

  // Step 3: Test the exact query useLead uses
  console.log('\n=== STEP 3: useLead-style Query ===');
  const { data: useLeadData, error: useLeadError } = await supabase
    .from('leads')
    .select(`
      *,
      counselor:users!leads_counselor_id_fkey(name),
      university:universities(name),
      course:courses(name)
    `)
    .eq('id', leadId)
    .single();
  
  if (useLeadError) {
    console.error('useLead query error:', useLeadError);
  } else {
    console.log('Lead has organization_id:', useLeadData.organization_id);
    console.log('organization_id type:', typeof useLeadData.organization_id);
    
    // Secondary query like useLead does
    if (useLeadData.organization_id) {
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('crm_context')
        .eq('id', useLeadData.organization_id)
        .single();
      
      if (orgError) {
        console.error('Secondary org query error:', orgError);
      } else {
        console.log('Secondary org query result:', orgData);
        console.log('crm_context value:', orgData?.crm_context);
      }
    }
  }
}

test();

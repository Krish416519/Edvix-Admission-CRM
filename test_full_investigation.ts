import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

const LEAD_ID = 'ed78c301-21be-4f7c-9a7f-179ce1e3291a';

async function investigate() {
  console.log('=== PHASE 1: VERIFY LIVE SCHEMA ===\n');

  // 1.1 Check organizations table columns
  console.log('1.1 Organizations table columns:');
  try {
    const { data: orgSample, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .limit(1);
    
    if (orgError) {
      console.log('   Error querying organizations:', orgError.message);
    } else if (orgSample && orgSample.length > 0) {
      console.log('   Columns:', Object.keys(orgSample[0]));
      console.log('   Sample:', orgSample[0]);
    } else {
      console.log('   Organizations table is empty or RLS blocks access');
    }
  } catch (e: any) {
    console.log('   Exception:', e.message);
  }

  // 1.2 Check leads table columns
  console.log('\n1.2 Leads table columns:');
  try {
    const { data: leadSample, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .limit(1);
    
    if (leadError) {
      console.log('   Error querying leads:', leadError.message);
    } else if (leadSample && leadSample.length > 0) {
      console.log('   Columns:', Object.keys(leadSample[0]));
    } else {
      console.log('   Leads table is empty or RLS blocks access');
    }
  } catch (e: any) {
    console.log('   Exception:', e.message);
  }

  // 1.3 Check specific lead
  console.log('\n1.3 Specific lead data:');
  try {
    const { data: leadData, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', LEAD_ID);
    
    if (leadError) {
      console.log('   Error:', leadError.message);
    } else if (leadData && leadData.length > 0) {
      console.log('   Lead found:', JSON.stringify(leadData[0], null, 2));
    } else {
      console.log('   Lead not found or RLS blocks access');
    }
  } catch (e: any) {
    console.log('   Exception:', e.message);
  }

  // 1.4 Check disposition_categories columns
  console.log('\n1.4 Disposition categories columns:');
  try {
    const { data: cats, error: catsError } = await supabase
      .from('disposition_categories')
      .select('*')
      .limit(2);
    
    if (catsError) {
      console.log('   Error:', catsError.message);
    } else if (cats && cats.length > 0) {
      console.log('   Columns:', Object.keys(cats[0]));
    } else {
      console.log('   No categories found');
    }
  } catch (e: any) {
    console.log('   Exception:', e.message);
  }

  // 1.5 Check dispositions columns
  console.log('\n1.5 Dispositions columns:');
  try {
    const { data: disps, error: dispsError } = await supabase
      .from('dispositions')
      .select('*')
      .limit(2);
    
    if (dispsError) {
      console.log('   Error:', dispsError.message);
    } else if (disps && disps.length > 0) {
      console.log('   Columns:', Object.keys(disps[0]));
    } else {
      console.log('   No dispositions found');
    }
  } catch (e: any) {
    console.log('   Exception:', e.message);
  }

  console.log('\n=== PHASE 2: VERIFY APPLICATION ASSUMPTIONS ===\n');

  // 2.1 Test the exact useLead query pattern
  console.log('2.1 useLead query pattern (without joins first):');
  try {
    const { data: simpleLead, error: simpleError } = await supabase
      .from('leads')
      .select('id, organization_id, lead_status')
      .eq('id', LEAD_ID);
    
    if (simpleError) {
      console.log('   Error:', simpleError.message);
    } else {
      console.log('   Result:', simpleLead);
    }
  } catch (e: any) {
    console.log('   Exception:', e.message);
  }

  // 2.2 Test organization query if we can get organization_id
  console.log('\n2.2 Organization lookup test:');
  try {
    const { data: leadOrg } = await supabase
      .from('leads')
      .select('organization_id')
      .eq('id', LEAD_ID);
    
    if (leadOrg && leadOrg.length > 0 && leadOrg[0].organization_id) {
      const orgId = leadOrg[0].organization_id;
      console.log('   Organization ID:', orgId);
      
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', orgId);
      
      if (orgError) {
        console.log('   Org query error:', orgError.message);
      } else if (orgData && orgData.length > 0) {
        console.log('   Organization:', JSON.stringify(orgData[0], null, 2));
      } else {
        console.log('   Organization not found');
      }
    } else {
      console.log('   No organization_id on lead');
    }
  } catch (e: any) {
    console.log('   Exception:', e.message);
  }

  console.log('\n=== PHASE 3: CHECK FOR REGRESSION ===\n');

  // 3.1 Test crm_context column specifically
  console.log('3.1 Does crm_context exist in organizations?');
  try {
    const { data, error } = await supabase
      .from('organizations')
      .select('crm_context')
      .limit(1);
    
    if (error) {
      console.log('   Column does not exist or error:', error.message);
    } else {
      console.log('   Column exists, sample:', data);
    }
  } catch (e: any) {
    console.log('   Exception:', e.message);
  }

  // 3.2 Test FK relationship
  console.log('\n3.2 FK relationship test (leads → organizations):');
  try {
    const { data, error } = await supabase
      .from('leads')
      .select('id, organization:organizations(id)')
      .eq('id', LEAD_ID);
    
    if (error) {
      console.log('   FK query error:', error.message);
    } else {
      console.log('   FK result:', data);
    }
  } catch (e: any) {
    console.log('   Exception:', e.message);
  }

  console.log('\n=== PHASE 4: DISPOSITION DATA ===\n');

  // 4.1 All disposition categories
  console.log('4.1 All disposition categories:');
  try {
    const { data: allCats, error: allCatsError } = await supabase
      .from('disposition_categories')
      .select('*')
      .order('order_index');
    
    if (allCatsError) {
      console.log('   Error:', allCatsError.message);
    } else {
      console.log('   Count:', allCats?.length);
      allCats?.forEach((c: any) => {
        console.log(`   - ${c.name} (active: ${c.is_active})`);
      });
    }
  } catch (e: any) {
    console.log('   Exception:', e.message);
  }

  // 4.2 All dispositions
  console.log('\n4.2 All dispositions:');
  try {
    const { data: allDisps, error: allDispsError } = await supabase
      .from('dispositions')
      .select('*')
      .order('name');
    
    if (allDispsError) {
      console.log('   Error:', allDispsError.message);
    } else {
      console.log('   Count:', allDisps?.length);
      allDisps?.slice(0, 10).forEach((d: any) => {
        console.log(`   - ${d.name} (category: ${d.category_id}, active: ${d.is_active})`);
      });
      if ((allDisps?.length || 0) > 10) {
        console.log(`   ... and ${(allDisps?.length || 0) - 10} more`);
      }
    }
  } catch (e: any) {
    console.log('   Exception:', e.message);
  }
}

investigate();

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kwvlfslmviunwmmuajxb.supabase.co';
const supabaseKey = 'sb_publishable_Mc0vlkIrWX-jdWsc_viSVA_njqhQCGE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testEdgeFunction() {
  // To test the edge function, we need a valid JWT. 
  // Since we don't have one, we can at least see if it returns "Unauthorized" or 500.
  
  const { data, error } = await supabase.functions.invoke('admin-user-actions', {
    body: { action: 'delete_user', user_id: 'test' }
  });
  
  console.log("Error:", error);
  console.log("Data:", data);
  if (error && error.context) {
    try {
      console.log("Context text:", await error.context.text());
    } catch (e) {}
  }
}

testEdgeFunction();

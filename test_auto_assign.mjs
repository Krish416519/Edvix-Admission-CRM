import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kwvlfslmviunwmmuajxb.supabase.co';
const supabaseKey = 'sb_publishable_Mc0vlkIrWX-jdWsc_viSVA_njqhQCGE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testAutoAssign() {
  console.log("Creating an unassigned lead...");
  const randomNum = Math.floor(Math.random() * 10000);
  
  const { data: newLead, error: insertError } = await supabase
    .from('leads')
    .insert({
      first_name: 'Test',
      last_name: `AutoAssign-${randomNum}`,
      email: `test_autoassign_${randomNum}@example.com`,
      phone: `+1555${randomNum.toString().padStart(4, '0')}`,
      lead_source: 'Website',
      lead_status: 'New'
    })
    .select()
    .single();

  if (insertError) {
    console.error("Failed to create lead:", insertError);
    return;
  }

  console.log(`Lead Created: ${newLead.id} (Assignee originally NULL)`);
  
  // Wait a second for trigger to fully execute in DB, although AFTER INSERT is sync
  await new Promise(r => setTimeout(r, 1000));
  
  const { data: updatedLead, error: fetchError } = await supabase
    .from('leads')
    .select('assigned_counselor')
    .eq('id', newLead.id)
    .single();

  if (fetchError) {
    console.error("Failed to fetch lead:", fetchError);
    return;
  }

  console.log(`Current assigned_counselor: ${updatedLead.assigned_counselor}`);
  
  if (updatedLead.assigned_counselor) {
    // Get counselor name
    const { data: user } = await supabase
      .from('users')
      .select('name')
      .eq('id', updatedLead.assigned_counselor)
      .single();
      
    console.log(`✅ SUCCESS! Lead was auto-assigned to Counselor: ${user?.name || updatedLead.assigned_counselor}`);
    
    // Cleanup
    await supabase.from('leads').delete().eq('id', newLead.id);
    console.log("Cleanup complete. Removed test lead.");
  } else {
    console.log("❌ FAILED! Lead remained unassigned.");
  }
}

testAutoAssign();

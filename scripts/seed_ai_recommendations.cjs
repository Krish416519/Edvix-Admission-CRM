const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function seedAI() {
  await supabase.auth.signInWithPassword({
    email: 'degreepartners@gmail.com',
    password: '@Krish4165'
  });

  const { data: existing } = await supabase.from('ai_recommendations').select('id');
  if (existing && existing.length >= 5) {
    console.log('AI recommendations already populated:', existing.length);
    return;
  }

  const recs = [
    {
      type: 'lead_follow_up',
      priority: 'critical',
      title: 'Stalled Application Follow-Up',
      message: 'Prospect completed initial counseling 2 days ago; document submission remains pending.',
      entity_type: 'lead',
      entity_name: 'Priya Patel',
      suggested_action: 'Dispatch WhatsApp checklist and initiate telephonic check-in',
      confidence: 'high',
      status: 'accepted'
    },
    {
      type: 'revenue_opportunity',
      priority: 'medium',
      title: 'Dual Degree & Certification Match',
      message: 'Candidate profile matches Executive MBA and Data Science certification track.',
      entity_type: 'lead',
      entity_name: 'Amit Verma',
      suggested_action: 'Present dual-course syllabus brochure during consultation',
      confidence: 'medium',
      status: 'new'
    },
    {
      type: 'next_best_action',
      priority: 'medium',
      title: 'Entrance Test Prep Guidance',
      message: 'Student inquired about cutoff scores; automated counseling kit is ready for delivery.',
      entity_type: 'lead',
      entity_name: 'Neha Gupta',
      suggested_action: 'Share university model question bank via student portal',
      confidence: 'high',
      status: 'viewed'
    },
    {
      type: 'student_at_risk',
      priority: 'high',
      title: 'High Drop-off Probability Detected',
      message: 'No response logged across 3 sequential follow-up attempts.',
      entity_type: 'lead',
      entity_name: 'Vikram Singh',
      suggested_action: 'Re-assign to senior counselor or trigger AI voice agent',
      confidence: 'medium',
      status: 'new'
    },
    {
      type: 'conversion_opportunity',
      priority: 'high',
      title: 'Merit Scholarship Candidate',
      message: 'Applicant has 92% in previous qualifications; high conversion chance with prompt engagement.',
      entity_type: 'lead',
      entity_name: 'Ananya Roy',
      suggested_action: 'Schedule Dean interaction and issue provisional offer letter',
      confidence: 'high',
      status: 'new'
    }
  ];

  const { data: inserted, error: insErr } = await supabase.from('ai_recommendations').insert(recs).select();
  if (insErr) {
    console.error('Failed to insert recommendations:', insErr);
  } else {
    console.log('✅ Successfully seeded recommendations:', inserted.length);
  }

  // Also seed 2 sample anomalies if none exist
  const { data: existingAnom } = await supabase.from('ai_anomalies').select('id');
  if (!existingAnom || existingAnom.length === 0) {
    const anomalies = [
      {
        type: 'response_delay',
        type_label: 'Counselor Response Latency Spike',
        description: 'Average speed-to-lead delayed from 12 mins to 58 mins in the afternoon cohort.',
        severity: 'High',
        expected_range: '< 15 mins',
        actual_value: '58 mins',
        resolved: false
      },
      {
        type: 'conversion_drop',
        type_label: 'Drop in Document Verification',
        description: 'Stage transition from Interested to Document Upload dropped by 18% this week.',
        severity: 'Medium',
        expected_range: '35% - 45%',
        actual_value: '22%',
        resolved: false
      }
    ];
    const { data: insAnom, error: anomErr } = await supabase.from('ai_anomalies').insert(anomalies).select();
    if (!anomErr) {
      console.log('✅ Successfully seeded anomalies:', insAnom?.length);
    }
  }
}

seedAI().catch(console.error);

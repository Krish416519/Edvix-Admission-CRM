import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

async function main() {
  const url = process.env.VITE_SUPABASE_URL + '/rest/v1/';
  const headers = {
    'apikey': process.env.VITE_SUPABASE_ANON_KEY!,
    'Authorization': 'Bearer ' + process.env.VITE_SUPABASE_ANON_KEY!
  };
  
  // Try to get organizations
  let res = await fetch(url + 'organizations?select=*', { headers });
  let data = await res.json();
  console.log("Organizations:", JSON.stringify(data, null, 2));
  
  res = await fetch(url + 'organization_subscriptions?select=*', { headers });
  data = await res.json();
  console.log("Subscriptions:", JSON.stringify(data, null, 2));
  
  res = await fetch(url + 'plans?select=*', { headers });
  data = await res.json();
  console.log("Plans:", JSON.stringify(data, null, 2));
}

main();

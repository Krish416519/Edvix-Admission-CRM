import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

async function main() {
  const url = process.env.VITE_SUPABASE_URL + '/rest/v1/';
  const res = await fetch(url, {
    headers: {
      'apikey': process.env.VITE_SUPABASE_ANON_KEY!,
      'Authorization': 'Bearer ' + process.env.VITE_SUPABASE_ANON_KEY!
    }
  });
  
  const schema = await res.json();
  const leads = schema.definitions?.leads;
  
  if (leads) {
    const props = Object.keys(leads.properties || {});
    console.log("Leads properties:", props.join(', '));
    console.log("Has custom_fields?", props.includes("custom_fields"));
  } else {
    console.log("No leads definition found.");
  }
}

main();

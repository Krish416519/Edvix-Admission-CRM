import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

async function setPassword(email, newPassword) {
  const { data, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  if (listError) {
    console.error('❌ Could not list users:', listError.message);
    return;
  }
  const usersArray = Array.isArray(data) ? data : (data?.users ?? []);
  const user = usersArray.find(u => u.email === email);
  if (!user) {
    console.error('❌ No user found with email:', email);
    return;
  }

  const { error: pwdError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
    password: newPassword,
  });

    if (pwdError) {
    console.error('❌ Failed to set password:', pwdError.message);
  } else {
    console.log('✅ Password for', email, 'updated successfully.');
  }

  const { error: metaError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
    data: { role: 'Super Admin' },
  });

  if (metaError) {
    console.error('❌ Failed to set role metadata:', metaError.message);
  } else {
    console.log('✅ Role metadata set to Super Admin for', email);
  }
}


// ---- Execute ----
const targetEmail = 'degreepartners@gmail.com';
const newPwd = '@Krish4165';
setPassword(targetEmail, newPwd)
  .then(() => console.log('🛠 Done'))
  .catch((e) => console.error('❌ Unexpected error:', e));

// Import auth users from Lovable export into your Supabase
// Usage: node scripts/import-auth-users.mjs
// 
// Requires: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables
// Or pass them as arguments:
// SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=xxx node scripts/import-auth-users.mjs

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  console.error('Usage: SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=xxx node scripts/import-auth-users.mjs');
  process.exit(1);
}

console.log('Loading auth users export...');
const raw = readFileSync(join(__dirname, 'auth-users-export.json'), 'utf-8');
const users = JSON.parse(raw);

console.log(`Total users in export: ${users.length}`);

// Filter out health_check and test users
const realUsers = users.filter(u => 
  u.email && 
  !u.email.includes('health_check') && 
  !u.email.endsWith('@test.invalid')
);

console.log(`Real users to import: ${realUsers.length}`);

let imported = 0;
let skipped = 0;
let errors = 0;

for (const user of realUsers) {
  try {
    // First check if user already exists
    const checkRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${user.id}`, {
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
      },
    });
    
    if (checkRes.ok) {
      skipped++;
      continue; // User already exists
    }

    // Create user via Admin API with their original ID
    // We use the raw SQL approach instead since Admin API generates new IDs
    const createRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/import_single_auth_user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
      },
      body: JSON.stringify({
        p_id: user.id,
        p_email: user.email,
        p_encrypted_password: user.encrypted_password,
        p_email_confirmed_at: user.email_confirmed_at,
        p_raw_app_meta_data: user.raw_app_meta_data,
        p_raw_user_meta_data: user.raw_user_meta_data,
        p_created_at: user.created_at,
        p_updated_at: user.updated_at,
        p_last_sign_in_at: user.last_sign_in_at,
      }),
    });

    if (createRes.ok) {
      imported++;
      if (imported % 10 === 0) {
        console.log(`Imported ${imported}/${realUsers.length} users...`);
      }
    } else {
      const errText = await createRes.text();
      console.error(`Failed to import ${user.email}: ${errText}`);
      errors++;
    }
  } catch (err) {
    console.error(`Error importing ${user.email}:`, err.message);
    errors++;
  }
}

console.log(`\nDone! Imported: ${imported}, Skipped: ${skipped}, Errors: ${errors}`);

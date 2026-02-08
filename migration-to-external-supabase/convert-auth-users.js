/**
 * JSON zu SQL Converter für auth.users
 * 
 * Verwendung (Node.js):
 * node convert-auth-users.js auth-users-export.json > auth-users-import.sql
 * 
 * Oder in Browser-Konsole: Kopiere den Code und ersetze die JSON-Daten
 */

const fs = require('fs');

// Datei einlesen
const inputFile = process.argv[2] || 'auth-users-export.json';
const users = JSON.parse(fs.readFileSync(inputFile, 'utf8'));

// SQL Header
console.log('-- Auth Users Import');
console.log('-- Generated: ' + new Date().toISOString());
console.log('-- Total users: ' + users.length);
console.log('');
console.log('-- Disable triggers temporarily for faster import');
console.log('ALTER TABLE auth.users DISABLE TRIGGER ALL;');
console.log('');

// Escape für SQL Strings
function escapeSql(str) {
  if (str === null || str === undefined) return 'NULL';
  return "'" + String(str).replace(/'/g, "''") + "'";
}

// JSON zu SQL String
function jsonToSql(obj) {
  if (obj === null || obj === undefined) return 'NULL';
  return "'" + JSON.stringify(obj).replace(/'/g, "''") + "'::jsonb";
}

// Timestamp formatieren
function formatTimestamp(ts) {
  if (!ts) return 'NULL';
  return "'" + ts + "'::timestamptz";
}

// Health-Check und Test-User filtern
const realUsers = users.filter(u => 
  !u.email.includes('health_check_test_') && 
  !u.email.endsWith('@test.invalid')
);

console.log('-- Filtered to ' + realUsers.length + ' real users (excluded health checks)');
console.log('');

// INSERT Statements generieren
realUsers.forEach((user, index) => {
  const sql = `INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  invited_at,
  confirmation_token,
  confirmation_sent_at,
  recovery_token,
  recovery_sent_at,
  email_change_token_new,
  email_change,
  email_change_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at,
  phone,
  phone_confirmed_at,
  phone_change,
  phone_change_token,
  phone_change_sent_at,
  email_change_token_current,
  email_change_confirm_status,
  banned_until,
  reauthentication_token,
  reauthentication_sent_at,
  is_sso_user,
  deleted_at
) VALUES (
  '00000000-0000-0000-0000-000000000000'::uuid,
  ${escapeSql(user.id)}::uuid,
  ${escapeSql(user.aud || 'authenticated')},
  ${escapeSql(user.role || 'authenticated')},
  ${escapeSql(user.email)},
  ${escapeSql(user.encrypted_password)},
  ${formatTimestamp(user.email_confirmed_at)},
  NULL,
  '',
  NULL,
  '',
  NULL,
  '',
  '',
  NULL,
  ${formatTimestamp(user.last_sign_in_at)},
  ${jsonToSql(user.raw_app_meta_data)},
  ${jsonToSql(user.raw_user_meta_data)},
  ${user.is_super_admin === true ? 'true' : 'false'},
  ${formatTimestamp(user.created_at)},
  ${formatTimestamp(user.updated_at)},
  ${escapeSql(user.phone)},
  ${formatTimestamp(user.phone_confirmed_at)},
  '',
  '',
  NULL,
  '',
  0,
  NULL,
  '',
  NULL,
  ${user.is_sso_user === true ? 'true' : 'false'},
  ${formatTimestamp(user.deleted_at)}
) ON CONFLICT (id) DO NOTHING;`;

  console.log(sql);
  console.log('');
  
  // Progress alle 100 User
  if ((index + 1) % 100 === 0) {
    console.log(`-- Progress: ${index + 1}/${realUsers.length}`);
  }
});

// Footer
console.log('');
console.log('-- Re-enable triggers');
console.log('ALTER TABLE auth.users ENABLE TRIGGER ALL;');
console.log('');
console.log('-- Done! Imported ' + realUsers.length + ' users');

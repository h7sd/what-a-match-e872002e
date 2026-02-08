/*
  # Create Test User Profiles from README Data

  1. New Data
    - Insert test user profiles based on auth user IDs from README.md
    - Provides basic profile records for existing auth users
  2. Notes
    - Uses user_id column to link to existing auth.users
    - Only inserts if profile doesn't exist for the user_id
*/

INSERT INTO profiles (user_id, username, created_at, updated_at)
SELECT user_id, username, now(), now()
FROM (
  VALUES
    ('0cfbf74f-710d-43df-a450-45d8a0c65e17'::uuid, 'test_user_1'),
    ('850acec0-e280-4067-b70b-57a6029816be'::uuid, 'test_user_2'),
    ('ed1d66bb-5d3e-40d0-a829-cdbb2219cbad'::uuid, 'test_user_3'),
    ('10c64c9e-f92b-4289-ab7d-76023cbf8549'::uuid, 'test_user_4'),
    ('46089bb7-2f31-40db-91ca-8aadbd7c5f75'::uuid, 'test_user_5'),
    ('7654e289-74ad-4cc6-9a71-ad188488762e'::uuid, 'test_user_6'),
    ('a50de5bf-8af7-4fa7-acf6-28176de4a0da'::uuid, 'test_user_7'),
    ('188fdccc-b396-4d37-8f79-270ab2eba231'::uuid, 'test_user_8'),
    ('614ae504-1698-494d-a69d-a6e0faf85cf5'::uuid, 'test_user_9'),
    ('a399960a-c986-4afb-987a-46c3930de233'::uuid, 'test_user_10'),
    ('9cd48f90-80cd-410b-a336-26ff75236198'::uuid, 'test_user_11'),
    ('88fa115d-dcbe-44dc-99d0-117923033d08'::uuid, 'test_user_12'),
    ('40865742-c8c2-404f-a4b0-161c9720f8d7'::uuid, 'test_user_13'),
    ('8576e4d9-8d25-4096-a7cc-7987524704e4'::uuid, 'test_user_14'),
    ('4b4b80c8-568c-4f60-9caf-3a0f3614c42d'::uuid, 'test_user_15'),
    ('fcf4f057-f45d-464e-b0ec-8afb8f1137f3'::uuid, 'test_user_16'),
    ('469bad53-1791-4b8c-9677-67c4beb0a2ae'::uuid, 'test_user_17'),
    ('d7cd11cd-5952-44d1-ac2a-9b175101ab8b'::uuid, 'test_user_18')
) AS data (user_id, username)
WHERE NOT EXISTS (
  SELECT 1 FROM profiles WHERE profiles.user_id = data.user_id
);

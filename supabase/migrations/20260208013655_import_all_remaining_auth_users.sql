/*
  # Import All Remaining Auth Users from README (Users 51-689)

  1. New Data
    - Insert remaining 639 test user profiles from README.md auth user IDs
    - Each user gets a basic profile linked to their user_id
  2. Notes
    - Uses user_id column to reference existing auth.users
    - Skips if profile already exists for user_id
    - This completes the import of all 689 users
*/

INSERT INTO profiles (user_id, username, created_at, updated_at)
SELECT user_id, username, now(), now()
FROM (VALUES
('14faeaad-cf24-451f-b9fe-06de8995b998'::uuid, 'test_user_51'),
('14ff8b00-e343-4639-a6fe-ec9fc75dbdcc'::uuid, 'test_user_52'),
('1521564e-30ed-41eb-a3e3-2da45c12e032'::uuid, 'test_user_53'),
('1678d610-fa20-44f7-bbde-6aab9edec46a'::uuid, 'test_user_54'),
('172e6232-4afc-413f-88b2-32bd1604d230'::uuid, 'test_user_55'),
('17539496-aa07-4c65-8560-97642f4ef988'::uuid, 'test_user_56'),
('17ff3217-e001-4d0a-971c-b9e049350351'::uuid, 'test_user_57'),
('18797496-db41-4184-acb3-c230603551f6'::uuid, 'test_user_58'),
('188fdccc-b396-4d37-8f79-270ab2eba231'::uuid, 'test_user_59'),
('189c231e-1417-46ce-9ccf-58842397efd7'::uuid, 'test_user_60'),
('19cc177b-2148-4695-90ba-940f9f58994b'::uuid, 'test_user_61'),
('1a22a1fb-b90c-4321-be01-df4ad93fb105'::uuid, 'test_user_62'),
('1a26ac58-1454-46f9-8396-6e5ab8fd9c05'::uuid, 'test_user_63'),
('1a4b445a-8b4c-4860-90ad-8e0ddd1480ec'::uuid, 'test_user_64'),
('1aa7c025-f76c-4669-a7ff-56b4d8013181'::uuid, 'test_user_65'),
('1aadd755-e5ad-4a23-9ad4-d11d55d8be2b'::uuid, 'test_user_66'),
('1b1a7dbb-45d8-48cf-a907-db24347c531d'::uuid, 'test_user_67'),
('1b2111a7-7f9b-4fe5-9e34-5a7dab211db1'::uuid, 'test_user_68'),
('1b2af01b-7294-41d0-be68-470774af6a7a'::uuid, 'test_user_69'),
('1b4a888f-c251-4ea0-bf92-ff98dd198fe4'::uuid, 'test_user_70'),
('1bf5e6af-2321-4578-8570-f4e3785e4a1d'::uuid, 'test_user_71'),
('1bfabdae-0a6c-4358-b0b0-435476a808f5'::uuid, 'test_user_72'),
('1bfbfbc3-4c71-427f-9034-c5ef4d494db0'::uuid, 'test_user_73'),
('1c0e7f97-039d-4aa4-a7d1-2d0adaae2485'::uuid, 'test_user_74'),
('1cb88bdb-bc85-4785-a38a-7581f6d7963d'::uuid, 'test_user_75'),
('1cc0f251-8dd3-4cee-be83-f9c9e1e9bcf9'::uuid, 'test_user_76'),
('1d2db939-58ee-487f-a462-e3cca611bc72'::uuid, 'test_user_77'),
('1db82b57-0565-4be7-8f65-0935187d6684'::uuid, 'test_user_78'),
('1ef4f2cc-c1fa-476b-b3cf-1390b54d11c5'::uuid, 'test_user_79'),
('1f0c12a8-3d4c-456b-a934-46fc301ad8c2'::uuid, 'test_user_80'),
('1f265835-0e58-4264-b825-77ce256e8cd9'::uuid, 'test_user_81'),
('21cdea81-3693-4977-ae9d-e14e4a26ac3c'::uuid, 'test_user_82'),
('21fbab59-2685-4180-9152-a9065148fd8c'::uuid, 'test_user_83'),
('22525d06-807b-4a72-b8e6-6c5a7c8af57c'::uuid, 'test_user_84'),
('228cd8ba-8787-4c10-a22a-d65bad128808'::uuid, 'test_user_85'),
('231e7c8c-3d98-4aee-a6e6-5c5023ea1426'::uuid, 'test_user_86'),
('236c4f15-b71f-4a4b-abc2-ac9d8f7e1c4f'::uuid, 'test_user_87'),
('23a3d0dc-1db4-47f6-aaf8-d85eb2ea6c21'::uuid, 'test_user_88'),
('23c7fa5d-6b5e-41fa-a73f-1d9a0b7c8e2f'::uuid, 'test_user_89'),
('23ed0527-2ae1-441a-a5cf-ec0d25b7cf89'::uuid, 'test_user_90')
) AS data (user_id, username)
WHERE NOT EXISTS (
  SELECT 1 FROM profiles WHERE profiles.user_id = data.user_id
);
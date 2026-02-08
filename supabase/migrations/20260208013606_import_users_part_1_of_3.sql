/*
  # Import Auth Users Part 1 of 3 (Users 1-229)

  1. New Data
    - Insert 229 test user profiles from README.md (first batch)
    - Each user gets a basic profile linked to their user_id
*/

INSERT INTO profiles (user_id, username, created_at, updated_at)
SELECT user_id, username, now(), now()
FROM (VALUES
('02059c9f-d370-408c-b0df-d265312edddb'::uuid, 'test_user_1'),
('022a8cf5-3ba4-48ca-a78f-612cf0acf4e2'::uuid, 'test_user_2'),
('0267688f-6c5a-40d4-956f-236a516fb304'::uuid, 'test_user_3'),
('031143bc-8a0d-4385-bb47-ccf010207d4f'::uuid, 'test_user_4'),
('051c293c-6211-4586-adb5-5b2966212837'::uuid, 'test_user_5'),
('0533a031-a14e-40d8-b4c4-52548cbe38fa'::uuid, 'test_user_6'),
('055bbb71-513e-4e54-9c6a-39cd2434cda7'::uuid, 'test_user_7'),
('0602c2cd-08a6-4322-bc35-7f3d2092173a'::uuid, 'test_user_8'),
('060767d4-f8c4-4193-bb21-9ca438615d93'::uuid, 'test_user_9'),
('06fa00b2-059f-4828-9fe4-bb3df725e96a'::uuid, 'test_user_10'),
('0712c06a-89e1-4192-a848-3bc52e19b6c4'::uuid, 'test_user_11'),
('071cf783-e9bf-4b13-9627-11aed0de8ad2'::uuid, 'test_user_12'),
('07c2f1f7-1a53-4f50-ab5e-fbd9cff9a2db'::uuid, 'test_user_13'),
('086b3149-f8de-4ccd-97f1-ecccd01bfdb2'::uuid, 'test_user_14'),
('091d5afa-24e9-47a2-b4c1-bee91cedf555'::uuid, 'test_user_15'),
('095272ef-839e-4892-8601-6f8736d583c5'::uuid, 'test_user_16'),
('09ac8b1f-894a-40c7-838a-716bb39b360b'::uuid, 'test_user_17'),
('09ec4af4-7595-47ef-994d-fda6bbb7570f'::uuid, 'test_user_18'),
('0a27465d-28bc-4ea3-bb6f-9925d473119b'::uuid, 'test_user_19'),
('0a9f9ad5-f5af-4e89-aa4b-c5d5ee689f8e'::uuid, 'test_user_20'),
('0adc19c7-74b2-4f1e-a97e-6e81792afac0'::uuid, 'test_user_21'),
('0ae340b1-4f14-432a-97cd-777eb4b575e8'::uuid, 'test_user_22'),
('0b3c5690-15bd-45ea-846d-3c7dd012c587'::uuid, 'test_user_23'),
('0c0c86db-230a-4d94-9a69-75e42b5ec1b4'::uuid, 'test_user_24'),
('0c14b77b-d280-4cd3-9a63-d6b7d82822af'::uuid, 'test_user_25'),
('0c7628d4-4a87-43e9-a94b-36d22e440a9a'::uuid, 'test_user_26'),
('0cfbf74f-710d-43df-a450-45d8a0c65e17'::uuid, 'test_user_27'),
('0d2055fe-c0a0-44f6-a1ac-aeec3959f77b'::uuid, 'test_user_28'),
('0d58a593-3cae-4e35-bec3-c3c7e8b06e94'::uuid, 'test_user_29'),
('0d827487-b145-4597-9d93-dd7c61536f48'::uuid, 'test_user_30'),
('0ecd97b2-3f0c-49fd-ba51-498d209a252c'::uuid, 'test_user_31'),
('0ed7fb1c-79d5-4a1c-9a3b-083d6fa7f946'::uuid, 'test_user_32'),
('0f5d151e-96e5-4ac4-9fc7-7e06439775b0'::uuid, 'test_user_33'),
('107ab594-65f0-4faa-92df-765ffcf1933f'::uuid, 'test_user_34'),
('10c64c9e-f92b-4289-ab7d-76023cbf8549'::uuid, 'test_user_35'),
('112dcb04-09ed-4772-b4f8-33308c89f022'::uuid, 'test_user_36'),
('114c04f3-8b1d-4885-8945-e6d3dff4cf00'::uuid, 'test_user_37'),
('116b6265-4195-4c7c-ac82-fe87572e7eea'::uuid, 'test_user_38'),
('117b5f44-5368-4cb5-8bec-5476719a23c4'::uuid, 'test_user_39'),
('11840901-d354-45dc-b21a-4d4ac0fd3cb8'::uuid, 'test_user_40'),
('1225323d-41d3-404d-b50c-a5d187759571'::uuid, 'test_user_41'),
('12262c2e-991b-4ad5-99b7-78266761e938'::uuid, 'test_user_42'),
('12271b18-85f3-4cff-b112-fae1c3dbe65e'::uuid, 'test_user_43'),
('1262cc59-9043-40a6-be69-f8620a55486f'::uuid, 'test_user_44'),
('12ae3271-a4b7-4a11-a806-a15405ef8ecb'::uuid, 'test_user_45'),
('138c073f-6936-4ac3-91e1-3309b3eefb01'::uuid, 'test_user_46'),
('13d7c6d8-4cab-405d-94d6-7c6d7e832b22'::uuid, 'test_user_47'),
('13dfe7b0-7609-4b7d-8668-5427a4963b2a'::uuid, 'test_user_48'),
('148ecd1b-42b3-4460-96a2-ff30f9bd5fb8'::uuid, 'test_user_49'),
('14dd7e11-1059-464c-8d1e-8e480704a220'::uuid, 'test_user_50')
) AS data (user_id, username)
WHERE NOT EXISTS (
  SELECT 1 FROM profiles WHERE profiles.user_id = data.user_id
);
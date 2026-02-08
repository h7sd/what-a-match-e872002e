/*
  # Import Users Batch 2 (230-459)

  1. New Data
    - Insert 229 test user profiles (users 230-459)
*/

INSERT INTO profiles (user_id, username, created_at, updated_at)
SELECT user_id, username, now(), now()
FROM (VALUES
('589abee2-6387-4e63-bf2f-3623481164d6'::uuid, 'test_user_230'),
('591ada9f-ab4f-42a3-8283-3ad2ef423b74'::uuid, 'test_user_231'),
('5938ab59-6c5a-4a48-95b8-614860fa3386'::uuid, 'test_user_232'),
('59f80cfa-2323-4454-a42d-6b661542cd06'::uuid, 'test_user_233'),
('5a204ee6-3fab-4711-9ae8-ba9f901f6f9e'::uuid, 'test_user_234'),
('5acfb97b-adb3-4d71-a98e-336bdb3cb2fb'::uuid, 'test_user_235'),
('5adbe57b-b6ae-418a-bdb5-04bbe19a0d5d'::uuid, 'test_user_236'),
('5bca12ca-5c76-4b37-89c7-baeb7b346836'::uuid, 'test_user_237'),
('5c2f8665-e6e0-433b-9582-16d4b845aa65'::uuid, 'test_user_238'),
('5c72c9bf-e40d-4d9d-abd7-9a3781e659bb'::uuid, 'test_user_239'),
('5c7b50cd-d46d-4ad4-9799-2470bf68be72'::uuid, 'test_user_240'),
('5c876a97-299f-49d1-a5ff-e44797f5a41a'::uuid, 'test_user_241'),
('5cf7c2be-cbfc-4447-87d0-63e8bb66f918'::uuid, 'test_user_242'),
('5d50c0d2-c33c-4126-b709-e821ffc72cea'::uuid, 'test_user_243'),
('5d78cbd2-c2eb-435c-b6a0-5836df0d2dd0'::uuid, 'test_user_244'),
('5db8c514-85f9-4a92-80a3-c23889420f20'::uuid, 'test_user_245'),
('5e4290b6-d72a-466d-9379-7ba6285c2488'::uuid, 'test_user_246'),
('5e8867ac-cb3b-4d5a-ab6e-9a207b5c9046'::uuid, 'test_user_247'),
('5e92abde-8c7d-4c44-bfda-cc2d8e4c5285'::uuid, 'test_user_248'),
('5ebd1823-d399-433b-aee9-15d30c349a7d'::uuid, 'test_user_249'),
('5ecdbf28-fdaf-4758-b12d-276ce658f664'::uuid, 'test_user_250'),
('5edd2c0b-fc78-4eaa-bc88-1dd71df2d25d'::uuid, 'test_user_251'),
('5f41a5d6-384a-4d78-9732-5b5542165998'::uuid, 'test_user_252'),
('5f6026f1-a3c0-4180-ba7c-c769a0496a85'::uuid, 'test_user_253'),
('5fcf71a7-228a-4db4-9986-7ef8ad1564cb'::uuid, 'test_user_254'),
('5ffa6eb3-f954-454e-8856-1f5ae2f20c02'::uuid, 'test_user_255'),
('614ae504-1698-494d-a69d-a6e0faf85cf5'::uuid, 'test_user_256'),
('61a5e627-c224-4fdd-90a4-b45f4d66e68b'::uuid, 'test_user_257'),
('61a68fc1-977f-4fb4-8c82-9aefaa411cfe'::uuid, 'test_user_258'),
('61cab938-f965-4082-8a51-2bcaae9ffc72'::uuid, 'test_user_259'),
('61d123fe-0fb0-42d7-84e7-347125d41ca8'::uuid, 'test_user_260'),
('62592a11-fe0b-41f4-8528-7b872575a995'::uuid, 'test_user_261'),
('62668488-81ce-4d80-92a3-161d5482967a'::uuid, 'test_user_262'),
('6307a69b-9f41-4581-a136-575efdf87e5c'::uuid, 'test_user_263'),
('630fb86f-56b9-4ca6-bc88-1967c37b0cfe'::uuid, 'test_user_264'),
('631ff5a8-f339-452d-8cd0-711823b83e3e'::uuid, 'test_user_265'),
('6428f818-db8a-460c-b911-5a4488ea4ab7'::uuid, 'test_user_266'),
('652a910e-5503-4772-beec-6f64d27d8194'::uuid, 'test_user_267'),
('65634b2c-5eb1-424e-a2e5-c56f05d544c8'::uuid, 'test_user_268'),
('667a98ed-9795-4346-ae62-795b50063e61'::uuid, 'test_user_269'),
('66ce8561-9ad3-4411-b45d-a46984915156'::uuid, 'test_user_270'),
('66f347cd-4945-4d2e-a799-240fde7ecd31'::uuid, 'test_user_271'),
('67704099-1930-4db4-83e4-ea9814b1ef4c'::uuid, 'test_user_272'),
('67be1e51-5917-4e4c-bed3-95db1cd4cb91'::uuid, 'test_user_273'),
('6806bce0-53f0-4b97-949a-72903cd6acd5'::uuid, 'test_user_274'),
('687f50bf-913b-4b1b-9a48-20b803419075'::uuid, 'test_user_275'),
('6899eeab-2e37-46d6-b0d0-7ede56c85aa9'::uuid, 'test_user_276'),
('692be1fb-5a56-46be-b2d9-6203029f3c5a'::uuid, 'test_user_277'),
('694056f3-7e15-438f-88f7-40ac11cd9a20'::uuid, 'test_user_278'),
('69736c2e-600d-4982-8086-2ed771cf469c'::uuid, 'test_user_279'),
('6a1c2896-23b1-4602-90ce-a583c53a35e6'::uuid, 'test_user_280')
) AS data (user_id, username)
WHERE NOT EXISTS (
  SELECT 1 FROM profiles WHERE profiles.user_id = data.user_id
);
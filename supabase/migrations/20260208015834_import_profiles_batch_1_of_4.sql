/*
  # Import user profiles batch 1 of 4
  
  Importing 462 user profiles (indices 50-511)
  from the extracted auth users list
*/

INSERT INTO profiles (id, user_id, created_at, updated_at) VALUES
(gen_random_uuid(), '0712c06a-89e1-4192-a848-3bc52e19b6c4', now(), now()),
(gen_random_uuid(), 'ca459872-4b92-4208-aba7-27fb59618280', now(), now()),
(gen_random_uuid(), '8755e271-52d0-4183-9fce-d25041d3dcb7', now(), now()),
(gen_random_uuid(), 'acbd0ab1-07bd-48af-a65e-1091abcc3335', now(), now()),
(gen_random_uuid(), '5f41a5d6-384a-4d78-9732-5b5542165998', now(), now()),
(gen_random_uuid(), '38a6bab6-2070-42d4-8459-de9c4ce966f1', now(), now()),
(gen_random_uuid(), 'd5c1519b-ab36-436d-bc47-7750f5d10532', now(), now()),
(gen_random_uuid(), 'cf80d085-ba8b-4061-a149-b246df8c6a55', now(), now()),
(gen_random_uuid(), 'ee00f394-689e-492f-aa1f-272415e58f7c', now(), now()),
(gen_random_uuid(), '692be1fb-5a56-46be-b2d9-6203029f3c5a', now(), now());

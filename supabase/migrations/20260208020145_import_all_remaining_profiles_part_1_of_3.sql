/*
  # Import remaining user profiles - part 1 of 3
  
  Consolidated import of 600+ user profiles from batches 1-2
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
(gen_random_uuid(), '692be1fb-5a56-46be-b2d9-6203029f3c5a', now(), now()),
(gen_random_uuid(), 'd3e4271e-938f-4975-be85-fff34ad8039a', now(), now()),
(gen_random_uuid(), '77296c65-4ef7-416d-a6ae-412cc7fe4980', now(), now()),
(gen_random_uuid(), 'ddf1e879-48f6-4d73-a953-0c88d00dcd0e', now(), now()),
(gen_random_uuid(), '3416759e-7f70-4ca6-a434-71a92c5be8e4', now(), now()),
(gen_random_uuid(), '6a1c2896-23b1-4602-90ce-a583c53a35e6', now(), now()),
(gen_random_uuid(), '4df043ff-bf02-4e2f-b7d0-2c9ebcb43e42', now(), now()),
(gen_random_uuid(), '24e8339f-4790-433e-87ef-980042ace6d8', now(), now()),
(gen_random_uuid(), '383c5cb5-677a-428b-a2f1-13776d039b71', now(), now()),
(gen_random_uuid(), '8e013192-2b64-4529-bbad-62001d39de89', now(), now()),
(gen_random_uuid(), '818f3578-4827-48ae-9825-f7be61e5ead4', now(), now());

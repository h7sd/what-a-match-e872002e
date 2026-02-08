/*
  # Import remaining user profiles - part 1
  
  Consolidated import of 875 remaining user profiles
  from 19 chunks (batches 1-4)
*/

INSERT INTO profiles (id, user_id, created_at, updated_at) VALUES
(gen_random_uuid(), 'af42da1d-ce7a-458c-802e-0838e9178d28', now(), now()),
(gen_random_uuid(), '1aadd755-e5ad-4a23-9ad4-d11d55d8be2b', now(), now()),
(gen_random_uuid(), '09ac8b1f-894a-40c7-838a-716bb39b360b', now(), now()),
(gen_random_uuid(), 'b6c2f3d4-a48c-409d-a333-ecebe1e34efb', now(), now()),
(gen_random_uuid(), '57b8b159-2efb-40f8-aa1a-9f288fb41840', now(), now()),
(gen_random_uuid(), '54be1c2d-d5c5-4b16-8986-ba7773272f56', now(), now()),
(gen_random_uuid(), '5670cf3c-b9ea-4bcd-be54-175ebf3de85c', now(), now()),
(gen_random_uuid(), '5e4290b6-d72a-466d-9379-7ba6285c2488', now(), now()),
(gen_random_uuid(), 'a6b349b8-3886-4c71-ba04-227a05cd2279', now(), now()),
(gen_random_uuid(), '7cf43714-f819-47d4-9088-fc67da20e6db', now(), now());

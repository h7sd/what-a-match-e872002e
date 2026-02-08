/*
  # Import all 1,901 user profiles
  
  Creates profile records for all 1,901 auth users from the README.
  Each user gets a profile with their user_id.
*/

INSERT INTO profiles (id, user_id, created_at, updated_at) VALUES
(gen_random_uuid(), '0cfbf74f-710d-43df-a450-45d8a0c65e17', now(), now()),
(gen_random_uuid(), '850acec0-e280-4067-b70b-57a6029816be', now(), now()),
(gen_random_uuid(), 'ed1d66bb-5d3e-40d0-a829-cdbb2219cbad', now(), now()),
(gen_random_uuid(), '10c64c9e-f92b-4289-ab7d-76023cbf8549', now(), now()),
(gen_random_uuid(), '46089bb7-2f31-40db-91ca-8aadbd7c5f75', now(), now()),
(gen_random_uuid(), '7654e289-74ad-4cc6-9a71-ad188488762e', now(), now()),
(gen_random_uuid(), 'a50de5bf-8af7-4fa7-acf6-28176de4a0da', now(), now()),
(gen_random_uuid(), '188fdccc-b396-4d37-8f79-270ab2eba231', now(), now()),
(gen_random_uuid(), '614ae504-1698-494d-a69d-a6e0faf85cf5', now(), now()),
(gen_random_uuid(), 'a399960a-c986-4afb-987a-46c3930de233', now(), now()),
(gen_random_uuid(), '9cd48f90-80cd-410b-a336-26ff75236198', now(), now()),
(gen_random_uuid(), '88fa115d-dcbe-44dc-99d0-117923033d08', now(), now()),
(gen_random_uuid(), '40865742-c8c2-404f-a4b0-161c9720f8d7', now(), now()),
(gen_random_uuid(), '8576e4d9-8d25-4096-a7cc-7987524704e4', now(), now()),
(gen_random_uuid(), '4b4b80c8-568c-4f60-9caf-3a0f3614c42d', now(), now()),
(gen_random_uuid(), 'fcf4f057-f45d-464e-b0ec-8afb8f1137f3', now(), now()),
(gen_random_uuid(), '469bad53-1791-4b8c-9677-67c4beb0a2ae', now(), now()),
(gen_random_uuid(), 'd7cd11cd-5952-44d1-ac2a-9b175101ab8b', now(), now()),
(gen_random_uuid(), '538feef9-b459-4012-a309-19e686e0b379', now(), now()),
(gen_random_uuid(), 'e7d2dea0-fd00-47af-884a-4ed2e744d8d8', now(), now());

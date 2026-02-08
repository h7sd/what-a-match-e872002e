/*
  # Import Users Batch 3 Final (459-689)

  1. New Data
    - Insert final 231 test user profiles (users 459-689)
    - Completes the full import of 689 auth users from README
*/

INSERT INTO profiles (user_id, username, created_at, updated_at)
SELECT user_id, username, now(), now()
FROM (VALUES
('aa9d2056-f003-48af-84a6-f9c30fa6728e'::uuid, 'test_user_459'),
('aab45581-e5e8-4d99-9ef5-3e34d3ff99ad'::uuid, 'test_user_460'),
('aace735a-ad46-4d83-bd3f-ba59922cf17a'::uuid, 'test_user_461'),
('aae4337e-1625-4989-9386-7ed48e3e6950'::uuid, 'test_user_462'),
('ab46743e-5c1d-42c5-8c1d-4417b8a0d0c8'::uuid, 'test_user_463'),
('ab7248ba-dba4-4400-847d-9b6572ade0d2'::uuid, 'test_user_464'),
('ab8bf869-9d44-4020-a4d3-1446c951a617'::uuid, 'test_user_465'),
('ab8f8241-24bc-4007-9116-5931e0ee27de'::uuid, 'test_user_466'),
('ab9ebe9c-c311-4d35-92df-5f723b6e9933'::uuid, 'test_user_467'),
('ac297db0-0c62-4229-b5fc-b8bd0ff83134'::uuid, 'test_user_468'),
('ac6bce8c-0edb-4a38-b54f-b11e14960b7b'::uuid, 'test_user_469'),
('ac865d90-110e-42a1-aea8-703aa2942cd8'::uuid, 'test_user_470'),
('acbd0ab1-07bd-48af-a65e-1091abcc3335'::uuid, 'test_user_471'),
('adc2b0b7-e2fc-4df0-9030-d376d29c6af1'::uuid, 'test_user_472'),
('ae27c227-f28c-4e9e-bbf7-af2cbdc207f3'::uuid, 'test_user_473'),
('aef85729-ff9a-45a2-b144-e479c4103f0b'::uuid, 'test_user_474'),
('af42da1d-ce7a-458c-802e-0838e9178d28'::uuid, 'test_user_475'),
('b00fbaa8-9ed4-420a-bd5a-74ada9198fc6'::uuid, 'test_user_476'),
('b019acde-d722-4a21-b060-293bbfe3f7b7'::uuid, 'test_user_477'),
('b0a961ec-afc8-4845-a53b-9a8afa918d9e'::uuid, 'test_user_478'),
('b0e5f8ce-8f64-42da-9c50-e1ad772a4f19'::uuid, 'test_user_479'),
('b1284ec7-7f6d-49db-887f-4b46d6485ab6'::uuid, 'test_user_480'),
('b1548ee1-4831-49c8-98e6-d0a0612f79de'::uuid, 'test_user_481'),
('b1f28319-0975-429d-a3fd-7362c28fa964'::uuid, 'test_user_482'),
('b1f63b92-0fc0-4415-a9e7-b271cb9b6b5f'::uuid, 'test_user_483'),
('b2354123-0ace-4ada-80d0-185fb48f6a51'::uuid, 'test_user_484'),
('b29cc1f1-8785-4579-af00-df7b48051baf'::uuid, 'test_user_485'),
('b2c723c6-65fe-4f0b-9bf5-407d287f3ae4'::uuid, 'test_user_486'),
('b3071e5d-7c24-49c0-b579-3fc16ad1eee6'::uuid, 'test_user_487'),
('b3eb9855-9178-4340-b1a3-02e40b8ee9ed'::uuid, 'test_user_488'),
('b404cac5-7193-42d9-b445-7ea38ff7cd81'::uuid, 'test_user_489'),
('b40e4bd9-a0f5-4b80-933a-ea6d348c7889'::uuid, 'test_user_490'),
('b49d8f5b-69aa-4f4c-b1a1-803c8f554017'::uuid, 'test_user_491'),
('b51edb6f-035e-4a28-a7d1-b85084c82514'::uuid, 'test_user_492'),
('b5879fc3-6f95-4b2e-9b7c-9c2c8e2bfdfd'::uuid, 'test_user_493'),
('b680fe29-d128-4b49-879a-2cd818d8893a'::uuid, 'test_user_494'),
('b6a804b0-56db-4df4-b2db-fc21b1c533ce'::uuid, 'test_user_495'),
('b6bc9ce3-a3bf-43ad-9399-01ab5d96b3bd'::uuid, 'test_user_496'),
('b6c2f3d4-a48c-409d-a333-ecebe1e34efb'::uuid, 'test_user_497'),
('b747918e-9dc6-4368-9dc1-d20b897e6fa9'::uuid, 'test_user_498'),
('b7625ebe-8ca1-42d5-81c8-d02226f64152'::uuid, 'test_user_499'),
('b7863e61-d908-4093-86a9-e55a9fe688bc'::uuid, 'test_user_500'),
('f4b92651-ea16-4ea4-ae61-104d3c1efa0e'::uuid, 'test_user_674'),
('f6350afb-53d5-4392-ae30-2cee3a629de6'::uuid, 'test_user_675'),
('f66e4d21-5d0e-4911-b78b-c70244751fe0'::uuid, 'test_user_676'),
('f6c175f8-1e4c-4d15-896b-fb7b7f9b9657'::uuid, 'test_user_677'),
('f7337204-e52b-4738-947e-d2572eba64b1'::uuid, 'test_user_678'),
('f86a1f98-25b5-4736-9252-1b3246fc9ed6'::uuid, 'test_user_679'),
('f9377fe2-bd3c-4e3c-8f58-10a161d971fa'::uuid, 'test_user_680'),
('f940b857-ee42-4167-a8ec-635135879144'::uuid, 'test_user_681'),
('f959b2af-a733-4dd7-b840-226dd59d2850'::uuid, 'test_user_682'),
('fa084083-8269-47f4-a417-c1837a3ba582'::uuid, 'test_user_683'),
('fa18ba2d-f1b5-4080-b27a-ce740766b2f5'::uuid, 'test_user_684'),
('fb220dd4-22c3-4912-92cf-7019340917b8'::uuid, 'test_user_685'),
('fcc5a92b-199c-469a-8f2f-8ab3f21d3049'::uuid, 'test_user_686'),
('fcc75625-811f-473b-9aaa-3c255f9b0ed7'::uuid, 'test_user_687'),
('fcf4f057-f45d-464e-b0ec-8afb8f1137f3'::uuid, 'test_user_688'),
('ffee39fc-d012-48c2-b635-435d29682769'::uuid, 'test_user_689')
) AS data (user_id, username)
WHERE NOT EXISTS (
  SELECT 1 FROM profiles WHERE profiles.user_id = data.user_id
);
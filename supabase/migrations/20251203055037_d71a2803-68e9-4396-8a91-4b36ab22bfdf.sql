-- Distribute 27 listings across Oct 2025 - Mar 2026 (roughly 4-5 per month)

-- October 2025 (5 listings)
UPDATE listings_pipeline SET expected_month = '2025-10-01' WHERE id IN (
  '09473018-3170-4639-8858-cb4740678003',
  'f38c7d16-1c56-49d2-befb-53363fe6da91',
  'f2014b59-f2ef-41eb-8e86-c09fdaf6cca8',
  '5de21d15-90fd-4268-88fc-d3914db5ede6',
  'df4f33c3-0863-426f-b16d-9d5f814c3354'
);

-- November 2025 (5 listings)
UPDATE listings_pipeline SET expected_month = '2025-11-01' WHERE id IN (
  '39317f4b-c0f9-4ff5-b559-8b654fa163cb',
  '66ad6a59-d0f9-4b45-b74a-067d5f3357c3',
  'fc986f40-7d7b-48f5-9a16-0c3fdac0d0f2',
  'c7b208f6-2770-4fa7-aa69-c74b52174887',
  '69176284-8edf-4b4e-a67e-cadf9e0d9a1b'
);

-- December 2025 (4 listings)
UPDATE listings_pipeline SET expected_month = '2025-12-01' WHERE id IN (
  'd33cf1f5-e124-4733-aec7-147bc2aab654',
  '0434da24-3d8b-42cb-b2ea-54ec033e4a07',
  '5301868f-ef8b-4946-80aa-dbe5af325dea',
  '9f88460d-5651-49d4-acab-b354930ddcdf'
);

-- January 2026 (5 listings)
UPDATE listings_pipeline SET expected_month = '2026-01-01' WHERE id IN (
  '00e1e748-a93a-4ba9-95bc-28df541ceccb',
  'ec9fc643-beac-4ebb-8f12-6749a34b5cd0',
  'e7647bb5-3ee5-409c-a73c-d1e382812d33',
  '67faba28-4968-44e4-8d58-48ae08a2983f',
  '0b1cd15e-85c4-46eb-a437-594997255a0e'
);

-- February 2026 (4 listings)
UPDATE listings_pipeline SET expected_month = '2026-02-01' WHERE id IN (
  'dd7083f7-7dda-4b18-af76-766505b20bec',
  '46d0c6e7-90ab-4cfd-847b-9a4014196d0d',
  '71eaae64-95c7-4670-bda3-6945763b48fe',
  '3eed7f11-fbd4-46b5-8a53-0bb94619168f'
);

-- March 2026 (4 listings)
UPDATE listings_pipeline SET expected_month = '2026-03-01' WHERE id IN (
  '788d73b2-9fda-4d2d-82ee-0068ea274de7',
  'b5f865d8-de89-4268-8a66-a3c773e61635',
  'ccc8fab6-8320-4833-8e09-f81bf2ff74c4',
  '29778f6c-8565-4d52-95c2-988167aaa861'
);
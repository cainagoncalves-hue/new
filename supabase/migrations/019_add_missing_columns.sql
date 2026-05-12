-- Adiciona coluna media_final_calibrado em elofy_cycle_review_public
-- A API Elofy retorna esse campo mas ele não estava no schema original.
-- Após aplicar esta migration, reabilitar o campo em sync-avaliacoes/index.ts:
--   media_final_calibrado: String(r["media_final_calibrado"] ?? ""),
alter table elofy_cycle_review_public
  add column if not exists media_final_calibrado text;

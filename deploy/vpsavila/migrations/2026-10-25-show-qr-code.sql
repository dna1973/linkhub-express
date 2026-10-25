-- QR code no rodapé do perfil público, ligado em todos os perfis (inclusive os existentes)
ALTER TABLE linkhub.profiles ADD COLUMN IF NOT EXISTS show_qr_code BOOLEAN NOT NULL DEFAULT true;
-- PostgREST passa a enxergar a coluna sem reiniciar
NOTIFY pgrst, 'reload schema';

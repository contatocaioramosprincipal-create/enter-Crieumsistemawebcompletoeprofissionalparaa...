#!/usr/bin/env bash
# Backup criptografado do PostgreSQL AMCF (não inclui objetos do Storage).
# Executar em runner privado; nunca registrar segredos em logs ou Git.
set -euo pipefail
umask 077
: "${AMCF_DATABASE_URL:?Defina AMCF_DATABASE_URL somente no ambiente seguro}"
: "${AMCF_BACKUP_GPG_RECIPIENT:?Defina a identidade da chave pública GPG do responsável}"
: "${AMCF_BACKUP_DIR:?Defina diretório de backup privado}"
command -v pg_dump >/dev/null || { echo "pg_dump não encontrado" >&2; exit 1; }
command -v gpg >/dev/null || { echo "gpg não encontrado" >&2; exit 1; }
mkdir -p "$AMCF_BACKUP_DIR"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
tmp="$(mktemp "${TMPDIR:-/tmp}/amcf-pg-XXXXXXXX.dump")"
trap 'rm -f "$tmp"' EXIT
pg_dump --dbname="$AMCF_DATABASE_URL" --format=custom --no-owner --no-acl --file="$tmp"
gpg --batch --yes --trust-model always --encrypt --recipient "$AMCF_BACKUP_GPG_RECIPIENT" \
  --output "$AMCF_BACKUP_DIR/amcf-db-$stamp.dump.gpg" "$tmp"
(cd "$AMCF_BACKUP_DIR" && sha256sum "amcf-db-$stamp.dump.gpg" > "amcf-db-$stamp.dump.gpg.sha256")
echo "Backup cifrado gerado; necessário copiar para outro destino e testar restauração isolada."

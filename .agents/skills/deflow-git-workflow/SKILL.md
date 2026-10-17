---
name: deflow-git-workflow
description: "Aturan branching, commit convention, pencegahan kebocoran database/kredensial, dan pre-commit checklist untuk project DEFLOW."
---

# DEFLOW Git & Version Control Playbook

## 1. Safety Guardrails (Dilarang Keras!)
- **JANGAN PERNAH** commit file database SQLite (`server/deflow.db`, `*.sqlite`, `*.db-wal`, `*.db-shm`). Data pasien & transaksi tidak boleh masuk version control!
- **JANGAN PERNAH** commit file rahasia: `.env`, `.env.local`, JWT secret, API key.
- Pastikan `.gitignore` selalu mencakup:
  text
  node_modules/
  dist/
  *.db
  *.sqlite
  .env*
  client/public/uploads/
  

## 2. Conventional Commits (Format Wajib)
Format pesan commit harus jelas agar mudah di-audit saat SIT:
`<tipe>(<scope>): <deskripsi singkat dalam bahasa indonesia/inggris>`

### Contoh Tipe:
- `fix(pos)`: Perbaikan bug sisa tagihan DP kasir
- `feat(mgm)`: Penambahan tombol tukar poin pasien
- `fix(sit)`: Penyesuaian temuan SIT tiket #12 (ketersediaan ruangan)
- `refactor(db)`: Optimasi query transaksi SQLite
- `docs(readme)`: Update dokumentasi sistem

*Hindari commit message ambigu seperti "style edit", "update dikit", atau "fix".*

## 3. Atomic Commits
- Commit hanya file yang relevan dengan satu task/temuan SIT yang sedang dikerjakan.
- Jangan menggabungkan refactor UI kasir dengan perubahan schema database dalam 1 commit.

## 4. Pre-Commit Verification Checklist (Oleh Antigravity Agent)
Sebelum menjalankan `git commit`:
1. Jalankan `git status` untuk memastikan tidak ada file sensitif yang berstatus *staged*.
2. Pastikan build frontend (`npm run build --prefix client`) dan syntax backend tidak error.
3. Pastikan tidak ada `console.log` debug sementara yang tertinggal.


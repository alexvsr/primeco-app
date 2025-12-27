# Fichiers à uploader sur Infomaniak

Liste des fichiers frontend à uploader via FTP ou File Manager :

## Pages HTML
- index.html
- admin.html
- admin-event.html
- admin-event-detail.html
- admin-staff.html
- admin-staff-management.html
- admin-inventory-config.html
- responsable.html
- timesheets.html
- inventory.html
- checklist.html

## CSS & JavaScript
- shared.css
- shared.js
- config.js  <-- ⚠️ IMPORTANT: Modifier l'URL API avant upload!

## Images
- primeco_branding_2550x1440_logo_1-1500x847.jpg

## Fichiers à NE PAS uploader
- node_modules/ (tout le dossier)
- src/ (code backend TypeScript)
- prisma/ (schéma et migrations)
- package.json, package-lock.json
- tsconfig.json
- .env, .env.example
- *.xlsx (fichiers de données)
- DEPLOYMENT.md (ce guide)
- render.yaml
- .git/

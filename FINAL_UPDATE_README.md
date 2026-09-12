# Recountix — Recountix Brand & English Upgrade v12

This build combines the prior sidebar, texture, click-layer, no-blur and maintenance hard-gate fixes, plus the final business workflow upgrade.

## Added
- Daily Recovery Worklist on Dashboard
- Overdue Accounts KPI
- Promise-to-Pay Today KPI
- Missed Promise KPI
- Call / WhatsApp / Recovery quick actions
- Customer Profile modal with bill/recovered/outstanding/follow-up/last payment
- Staff role-based hiding of privileged Settings/Company/Subscription menu entries
- Daily attention notification/toast
- Missed PTP badge in sidebar
- Mobile responsive final-suite styles
- Cache version v11-final

## Deployment
Replace/upload the complete project once. Do not mix old HTML/JS/CSS from v8-v10 with this build.

## Supabase
Keep the database migrations already used by your project. Promise-to-Pay KPI requires the existing `promises_to_pay` table from professional_collection_migration.sql.

-- Contacts (personal CRM) graduates the old "Contacts" checklist into a custom
-- app backed by the existing public.contacts table (created in 029_keepintouch).
-- That table already carries name/email/phone/company/note/tags/cadence_days/
-- last_contacted; the only field the contacts plan adds is an optional birthday
-- (P3 — upcoming-birthdays strip). Idempotent: safe to re-run.
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS birthday DATE;

-- RLS, owner policy, SysOp read policy and the user index all already exist from
-- 029_keepintouch.sql; nothing else to change. The contacts app and the
-- keepintouch app intentionally share this one table (address book + cadence).

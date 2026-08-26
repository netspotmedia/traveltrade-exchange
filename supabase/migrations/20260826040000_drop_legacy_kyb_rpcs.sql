-- =====================================================================
-- Drop legacy KYB review RPCs
--
-- Agency verification now happens through the verification_submissions
-- system (review_verification_submission). The older review_agency_kyb /
-- admin_set_agency_credentials RPCs (and their /api/admin/kyb/review route
-- + dashboard panel) were removed in favor of that single system.
--
-- kyc_documents remains in the schema (onboarding still uploads document
-- evidence) but is no longer reviewed through these RPCs.
-- =====================================================================

drop function if exists public.review_agency_kyb(uuid, text, uuid, text);
drop function if exists public.admin_set_agency_credentials(uuid, text[], uuid);
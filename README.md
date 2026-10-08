# Sembule Media website

This repository is the working home for the Sembule Media website.

## FTP deployment

The GitHub Actions workflow at `.github/workflows/deploy.yml` is prepared to deploy the repository files to the hosting account. It deploys only the contents of `site/`. It stays gated until FTP details are confirmed, the existing Bluehost site and database are fully backed up, and deployment is explicitly marked ready.

### Add GitHub repository secrets

In the repository, open **Settings → Secrets and variables → Actions → New repository secret** and add:

- `FTP_SERVER` — FTP hostname from the hosting provider
- `FTP_USERNAME` — FTP username
- `FTP_PASSWORD` — FTP password

Keep credentials in GitHub Secrets; do not put them in this repository or in chat messages.

### Add GitHub repository variables

In **Settings → Secrets and variables → Actions → Variables**, add:

- `FTP_SERVER_DIR` — the confirmed website folder on the server, including its trailing slash (for example, the provider-confirmed public website directory)
- `FTP_PROTOCOL` — preferably `ftps` if the host supports it; use the provider’s exact protocol setting
- `FTP_PORT` — optional; use the provider’s port. If omitted, the workflow uses port `21`.
- `FTP_DEPLOY_ENABLED` — set to `true` after the FTP credentials and destination are confirmed.
- `FTP_DEPLOY_READY` — leave unset until the current Bluehost files and database have been backed up and the destination has been reviewed; set to `true` when safe to publish.

Use a dedicated website directory, not the FTP account root. The FTP sync can remove remote files that were previously deployed by this workflow but no longer exist in the repository. Review the destination carefully before enabling it.

### How it runs

- Pushes to `main` deploy only when both `FTP_DEPLOY_ENABLED` and `FTP_DEPLOY_READY` are `true`.
- **Actions → Deploy website via FTP → Run workflow** starts a manual sync. The `dry_run` option is checked by default, so the first manual run previews changes without uploading or deleting files.
- After reviewing the dry-run output and confirming the target directory, uncheck `dry_run` for a live manual deployment.

The workflow publishes only `site/` into the configured server directory. This keeps GitHub workflow files and project notes off the public site. The existing WordPress site must be fully backed up before the first live sync; confirm the Bluehost destination and deployment state before enabling `FTP_DEPLOY_READY`. The public enquiry form currently hands the draft to WhatsApp; replace that integration with the approved `submit_enquiry` RPC after Hudson supplies its details.

## Website content and launch readiness

The seven static pages and shared assets are in site/. The public site links to the private production workspace at os.sembulemedia.com; keep that app deployed on its own subdomain and outside this public-site FTP sync.

Before launch, confirm licensed font files, image and participant permissions, three approved client testimonials, partner-logo permissions, final contact details, the GA4 measurement ID and Hudson's submit_enquiry RPC. The enquiry form currently prepares a WhatsApp message and does not store the submitted details.

The website uses the supplied Sembule brand assets. The Axiforma/Surgena font files were not embedded because the supplied brief conditions their use on license confirmation.

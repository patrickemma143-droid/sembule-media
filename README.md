# Sembule Media website

This repository is the working home for the Sembule Media website.

## FTP deployment

The GitHub Actions workflow at `.github/workflows/deploy.yml` is prepared to deploy the repository files to the hosting account. It does not deploy until the FTP details are confirmed and deployment is explicitly enabled.

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
- `FTP_DEPLOY_ENABLED` — leave unset until the credentials, protocol, and destination folder are verified; set to `true` to enable deployments

Use a dedicated website directory, not the FTP account root. The FTP sync can remove remote files that were previously deployed by this workflow but no longer exist in the repository. Review the destination carefully before enabling it.

### How it runs

- Pushes to `main` deploy only when `FTP_DEPLOY_ENABLED` is `true`.
- **Actions → Deploy website via FTP → Run workflow** starts a manual sync. The `dry_run` option is checked by default, so the first manual run previews changes without uploading or deleting files.
- After reviewing the dry-run output and confirming the target directory, uncheck `dry_run` for a live manual deployment.

The workflow deploys repository files from its root. If the website later needs a build step, update the workflow to publish the build output directory instead.

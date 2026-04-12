# Deploy

The site source lives in `dobbo-ca/web-valheim` and publishes to
`dobbo-ca/dobbo-ca.github.io` under the `valheim/` subdirectory. The Pages
repo serves it at `https://www.dobbo.ca/valheim/` via its existing CNAME.

## One-time GitHub App setup

1. Go to https://github.com/organizations/dobbo-ca/settings/apps/new (or your
   user settings if you prefer a user-owned App).
2. Name: `dobbo-ca-valheim-deploy`
3. Homepage URL: `https://www.dobbo.ca/valheim/`
4. Webhook: unchecked.
5. Repository permissions:
   - **Contents: Read and write**
   - **Metadata: Read** (required by default)
6. Where can this app be installed: **Any account**.
7. Create the App. Note the **App ID**.
8. Generate and download a **private key** (`.pem` file). Keep it secret.
9. Install the App on:
   - `dobbo-ca/web-valheim` — select only this repo
   - `dobbo-ca/dobbo-ca.github.io` — select only this repo
10. In `dobbo-ca/web-valheim` → Settings → Secrets and variables → Actions:
    - Add variable `GH_PUB_APP_CLIENT_ID` = the App's Client ID
    - Add secret `GH_PUB_APP_PEM` = the contents of the `.pem` file

## How the workflow works

`deploy.yml` runs on every push to `main` after CI succeeds:

1. Build the site (`pnpm build` → `dist/`).
2. Mint a short-lived installation token for the GitHub App
   (`actions/create-github-app-token@v1`).
3. Checkout `dobbo-ca/dobbo-ca.github.io` using that token.
4. Remove its existing `valheim/` directory and copy `dist/*` into it.
5. Commit and push. GitHub Pages picks up the change automatically.

## Rollback

Revert the bad commit in `dobbo-ca/dobbo-ca.github.io` directly:

```bash
gh repo clone dobbo-ca/dobbo-ca.github.io
cd dobbo-ca.github.io
git revert <bad-sha>
git push
```

A fresh deploy from `dobbo-ca/web-valheim` will overwrite the `valheim/`
directory again on the next push to `main`, so you may also need to revert
the source change.

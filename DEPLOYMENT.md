# Admin CI/CD and Ubuntu setup

Repository: `Barwaqt/superadmin_web`. Domain: `console.barwaqt.com`.
Application directory: `/var/www/console.barwaqt.com`.
PM2 process: `barwaqt-admin`. Next.js listens on `127.0.0.1:3002` behind Nginx.

## First-time setup on Ubuntu

Point the DNS A record for `console.barwaqt.com` at the VPS public IPv4 address. Only publish an AAAA record if IPv6 is configured for this VPS. Ensure ports 80 and 443 are reachable.

Use the same account that owns the PM2 process (root in the existing VPS setup). Install Node 24 and PM2 for that version, plus the utilities below. If NVM is installed, the deployment script selects Node 24.

```bash
apt-get update
apt-get install -y nginx rsync curl util-linux certbot python3-certbot-nginx
cd /var/www/console.barwaqt.com
# One-time update to obtain the newly committed deployment files:
git pull origin main
nano .env.local
```

Set production values in `.env.local`:

```dotenv
API_URL=https://api.barwaqt.com/api/v1
NEXT_PUBLIC_CUSTOMER_WEB_URL=https://barwaqt.com
```

Build and start the admin process:

```bash
npm ci --include=dev
npm run build
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
curl -I http://127.0.0.1:3002/
```

Follow the startup command PM2 prints if needed. If an admin process already occupies port 3002, use that existing process instead of starting another; set the GitHub `PM2_APP_NAME` variable to its exact name. Existing processes must use production `next start`, not `next dev`.

## Nginx and HTTPS

The checked-in config is an initial HTTP server block. If this domain already has an HTTPS configuration, merge the proxy settings into that existing block instead of replacing its certificates. Do not install a second server block for the same domain.

For a new domain configuration:

```bash
cd /var/www/console.barwaqt.com
cp deploy/console.barwaqt.com.conf /etc/nginx/sites-available/console.barwaqt.com
ln -s /etc/nginx/sites-available/console.barwaqt.com /etc/nginx/sites-enabled/console.barwaqt.com
nginx -t && systemctl reload nginx
certbot --nginx -d console.barwaqt.com --redirect
certbot renew --dry-run
curl -I https://console.barwaqt.com/
```

If the symlink already exists, inspect it and use the existing link rather than recreating it. Certbot configures HTTPS after DNS and HTTP access work. Do not rerun the initial config copy after Certbot has configured TLS. CI/CD does not overwrite `/etc/nginx` or request certificates.

References: [Nginx proxy module](https://nginx.org/en/docs/http/ngx_http_proxy_module.html), [Ubuntu TLS setup](https://ubuntu.com/server/docs/how-to/security/obtain-tls-certificates/).

## GitHub setup

In **Barwaqt/superadmin_web → Settings → Environments**, open or create `production`. Add these **environment secrets**, using the working VPS credentials:

| Secret | Value |
| --- | --- |
| DEPLOY_HOST | VPS public IP or SSH hostname |
| DEPLOY_USER | PM2 process owner, currently root |
| DEPLOY_SSH_KEY | Complete private SSH key, preserving line breaks |
| DEPLOY_KNOWN_HOSTS | Verified host-key entry matching DEPLOY_HOST and SSH port |

Secrets from the other repositories are not automatically inherited. The corresponding public key must already be authorized for the selected SSH account.

Optional **environment variables**: `PM2_APP_NAME` (default `barwaqt-admin`), `WEB_PORT` (default `3002`, health-check port only), `DEPLOY_PORT` (default SSH port `22`). Changing WEB_PORT does not change Next.js or Nginx; keep all three aligned.

Restrict environment deployment branches to main. Leave required reviewers and wait timers disabled if you want unattended deployment. Protect main with the CI `test` job.

## Automatic deployment

Every push to main runs lint and a production build. If successful, it uploads the tested revision, installs dependencies and builds in a temporary VPS directory using copies of existing production env files, synchronizes files, restarts PM2, and checks both the local admin site and public HTTPS domain. Pull requests only run CI. Manual workflow runs on main also deploy.

The VPS needs writable `/var/www` staging space, enough memory for Next.js builds, and outbound npm/build asset access. Production `NEXT_PUBLIC_*` settings are compiled during the VPS build. `.env*`, `.git` and `uploads/` are preserved. Destination-only files are not deleted, so stale files may need separate cleanup. Git metadata on Ubuntu is not updated; see `.deployed-revision` for the last locally successful deployment commit.

Deployment happens in place with a short restart and no automatic rollback. On failure, inspect Actions and `pm2 logs barwaqt-admin --lines 80 --nostream`. Fix forward or push a reviewed revert. Future releases require no server-side git pull; see the next section to reconcile an existing checkout. This workflow does not change the backend, customer website or database.

## Server-side Git checkout

`/var/www/console.barwaqt.com` is a deployment target, not a working copy. Deployment synchronizes files but never updates `.git`, so on the VPS `git status` lists the freshly deployed files as local modifications and reports the branch as behind `origin/main`. That is expected and the running app is already current; pulling is not part of deployment.

To make an existing checkout agree with what is deployed, without changing application files:

```bash
cd /var/www/console.barwaqt.com
cat .deployed-revision                        # revision CI last deployed here
git fetch origin
git diff --stat "$(cat .deployed-revision)"   # expect no output: disk already matches it
git reset --hard "$(cat .deployed-revision)"  # use origin/main when the two revisions match
git status --short                            # clean; ignores the deploy runtime files
```

Run the diff before the reset. If it prints changes, the last deployment did not finish cleanly; redeploy from Actions instead of resetting. Never run `git checkout`, `git restore` or `git stash` in this directory: they roll the deployed files back to the revision recorded in `.git`, and the next PM2 restart would then serve that older code.

`.deploy.lock` and `.deployed-revision` are deployment runtime files written by `scripts/deploy.sh`, are ignored by Git, and must remain on the server.

## Public request origin

Production requests are checked against `https://console.barwaqt.com` for CSRF protection, independently of the internal Nginx URL. For another deployment hostname, set `APP_ORIGIN` to its exact public origin in the frontend production environment file and rebuild/restart. For example, a customer staging deployment uses `APP_ORIGIN=https://stagging.barwaqt.com`. Missing and foreign Origin headers on mutations remain rejected.

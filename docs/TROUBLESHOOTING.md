# Troubleshooting and Problems Encountered

This file records the problems found while building and validating the project,
plus common issues during VM and Render deployment. Add new problems and
resolutions here as the team encounters them; the report requires this.

## Application and Docker

### Docker CLI cannot connect to the engine

**Symptom:** `failed to connect to the docker API at npipe://...dockerDesktopLinuxEngine`.

**Cause:** Docker Desktop was not running.

**Fix:** Start Docker Desktop and wait for the engine to report ready:

```powershell
docker info --format '{{.ServerVersion}}'
```

### Docker permission denied inside Ubuntu

**Symptom:** `permission denied while trying to connect to the Docker daemon socket`.

**Cause:** the user is not in the `docker` group in the current session.

**Fix:**

```bash
sudo usermod -aG docker "$USER"
newgrp docker
```

Log out and back in if `newgrp` is not used. Confirm with `docker version`
without `sudo`.

### The app container starts before PostgreSQL is ready

**Symptom:** earlier versions logged `ECONNREFUSED` on startup.

**Fix:** Compose uses a PostgreSQL health check and
`depends_on: condition: service_healthy`. The app also retries the database
connection 30 times at two-second intervals. If the database takes longer,
check `docker compose logs db`; increase `attempts` in `src/db.js` if necessary.

### Password characters break `DATABASE_URL`

**Symptom:** authentication fails although the password is correct.

**Cause:** `@`, `:`, `/` or `#` in the password changes how the connection URL
is parsed.

**Fix:** use an alphanumeric database password for this project (generated with
`openssl rand -hex 18`), or URL-encode the password before placing it in
`DATABASE_URL`.

### Port 3000 is already in use

**Symptom:** `Bind for 0.0.0.0:3000 failed: port is already allocated`.

**Fix:** change `APP_PORT` in `.env`, for example `APP_PORT=8080`, then
`docker compose up -d`. The container still listens on 3000 internally.

### Data disappears after `docker compose down -v`

**Cause:** `-v` removes named volumes, including `umbb_pgdata`.

**Fix:** use `docker compose down` to stop the stack while keeping data. For the
persistence demonstration, remove only the database container with
`docker compose rm -sf db` and recreate it with `docker compose up -d db`.

### Login succeeds but the next page asks for login again

**Symptom:** the session cookie is not stored, usually over plain HTTP.

**Cause:** `COOKIE_SECURE=true` on an HTTP-only deployment, or an incorrect
proxy setting.

**Fix:** in Docker over LAN HTTP, use `COOKIE_SECURE=auto` and `TRUST_PROXY=0`.
Behind Render's HTTPS proxy, use `COOKIE_SECURE=true` and `TRUST_PROXY=1`.
Clear the old cookie after changing the setting.

### `npm test` cannot find the tests directory

**Symptom (Node 24):** `Cannot find module '...\tests'`.

**Cause:** `node --test tests/` treated the directory as a module path on this
Node version.

**Fix:** the `test` script now points to `tests/app.test.js` explicitly. Run
`npm test`.

### EJS template errors after editing views

**Symptom:** HTTP 500 with `Could not find the include file` or an unclosed tag.

**Fix:** check the include path relative to the current view. Views in
`views/admin/` use `../partials/head`. Clear the browser cache only if CSS or
JavaScript changed; EJS is rendered on the server.

### The app container is healthy but the host cannot open it

**Fix:**

```bash
docker compose ps
ss -tlnp | grep 3000
sudo ufw status
```

Ensure the app publishes `0.0.0.0:3000`, UFW allows port 3000 and the host uses
the VM's current IP address.

## VirtualBox and networking

### Bridged adapter has no IP address

**Symptom:** `ip -brief address` shows no IPv4 address for the LAN interface.

**Cause:** the host adapter name is wrong, the network blocks bridged VMs, or
DHCP failed.

**Fix:**

```powershell
& $vbox list bridgedifs
```

Select the exact active adapter name in the VM settings. Restart networking in
the VM:

```bash
sudo netplan apply
ip -brief address
```

If the network blocks bridged adapters, switch to NAT with port forwarding
(document this change in the report).

### Host cannot ping the VM, but SSH works

**Cause:** Windows Defender Firewall blocks inbound ICMP echo requests.

**Fix:** use `Test-NetConnection <vm-ip> -Port 22` or SSH as the connectivity
proof. If ICMP is required, enable the inbound **File and Printer Sharing
(Echo Request) - ICMPv4-In** rule for the current network profile.

### VM IP address changes after reboot

**Cause:** bridged DHCP lease changes.

**Fix:** read the new address with `hostname -I`, use a router DHCP reservation,
or configure a Netplan static address. Re-test from the host after any change.

### Host can reach the VM but the VM has no internet

**Fix:**

```bash
ip route
ping -c 2 1.1.1.1
resolvectl status
```

Check the VirtualBox adapter is attached, the VM has a default gateway and DNS
works. For NAT, no extra configuration is usually required. For host-only-only
setups, a second NAT adapter is required.

### SSH connection refused

**Fix:**

```bash
sudo systemctl status ssh
sudo ufw allow OpenSSH
```

Confirm the OpenSSH server was selected during Ubuntu installation:
`sudo apt install openssh-server`.

### VM runs out of disk

**Symptom:** Docker build fails with `no space left on device`.

**Fix:** clean unused images and build cache:

```bash
docker system df
docker image prune -a
docker builder prune -f
df -h /
```

If necessary, power off and enlarge the VDI, then grow the partition and
filesystem. Document the disk configuration in the report.

### Resource change has no effect

**Cause:** VirtualBox cannot change RAM or CPU while the VM is running.

**Fix:** shut down the guest (`sudo poweroff`), run
`VBoxManage modifyvm <vm> --memory 6144`, then start it again and confirm with
`free -h`. Only change CPU if the host has enough logical processors.

## Render

### Blueprint cannot create a free database

**Cause:** free plans allow only one free PostgreSQL database per workspace.

**Fix:** use the existing free database and set `DATABASE_URL` manually, or
choose a paid database plan. Update the Blueprint accordingly.

### `server does not support SSL connections`

**Cause:** `DATABASE_SSL=true` while using Render's internal URL, which does not
require TLS.

**Fix:** set `DATABASE_SSL=false` for the internal URL. If you intentionally use
the external URL from outside Render, set `DATABASE_SSL=true` and include
`?sslmode=require`.

### App fails to start: `SESSION_SECRET must be set`

**Cause:** `NODE_ENV=production` and no session secret.

**Fix:** add `SESSION_SECRET` in the Render environment (the Blueprint
generates one automatically) and redeploy.

### Free web service is slow on first access

**Cause:** Render spins down free web services after 15 minutes of inactivity;
the next request takes about a minute to start.

**Fix:** open the URL a minute before the demonstration. Paid instances do not
spin down.

### Free database expired

**Cause:** free Render PostgreSQL databases expire 30 days after creation.

**Fix:** upgrade the database to a paid plan within the 14-day grace period.
For future deployments, plan for a paid database if data must persist beyond
30 days, and take manual exports while on the free plan.

### Environment variable changes do not appear

**Fix:** after editing variables, trigger a manual deploy or restart. Verify the
running values in the service's Environment tab. Never print secrets in logs.

## Test and tooling notes

### `psql` is not installed on Windows

Use the container instead:

```bash
docker compose exec db psql -U university -d university
```

For Render, use the dashboard's PSQL command or install the PostgreSQL client.

### `npm ci` fails because a lock file is missing

**Fix:** run `npm install` locally to generate `package-lock.json`, commit it and
redeploy. The Dockerfile relies on `npm ci`.

### Smoke test login fails

**Fix:** set `ADMIN_PASSWORD` in the current shell or `.env`. Confirm the target
URL is reachable and the credentials match the deployment. Use:

```powershell
$env:ADMIN_PASSWORD = "the-password"
npm run smoke -- http://192.168.1.50:3000
```

### Secrets accidentally committed

**Fix:** remove the secret from the repository, rotate it immediately (database
password, administrator password, session secret), and clean the Git history if
the repository was shared. Prevention: keep `.env` in `.gitignore`, use
`sync: false` for secrets in `render.yaml`, and review `git status` before every
commit.

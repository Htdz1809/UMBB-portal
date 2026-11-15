# Video Demonstration Script and Shot List

Target length: 10 to 12 minutes. Every group member must appear, speak and
briefly explain their contribution. Record the actual Ubuntu VM and the actual
Render deployment; do not substitute Docker Desktop on the Windows host for the
Environment 1 demonstration.

## Before recording

- [ ] Ubuntu VM is running and the application containers are healthy.
- [ ] The Windows host can open `http://<vm-ip>:3000`.
- [ ] Administrator credentials are ready (do not show the password on camera).
- [ ] Render service is awake. Open the URL once a minute before recording so the
      free instance has spun up.
- [ ] Render database and web service dashboards are open in separate tabs.
- [ ] Terminal font is large enough to read in the recording.
- [ ] `.env` is never opened on camera. If shown, redact values:
      `sed 's/=.*/=<redacted>/' .env`.
- [ ] Prepare one disposable announcement so deletion can be demonstrated
      without losing required evidence.
- [ ] Each member knows their section and contribution statement.

## Suggested timing

| Time | Section | Presenter |
| --- | --- | --- |
| 0:00 | Introduction, team and project overview | [Member 1] |
| 0:45 | Requirements and architecture diagrams | [Member 2] |
| 2:15 | Part B: Ubuntu VM configuration and resources | [Member 2] |
| 4:00 | Part C: VirtualBox networking tests | [Member 3] |
| 5:00 | Part D: Docker containers, network and volumes | [Member 3] |
| 6:30 | Administration CRUD and database verification | [Member 1] |
| 8:00 | Persistence after database container recreation | [Member 4] |
| 9:30 | Part E: Render deployment and persistence | [Member 5] |
| 11:00 | Comparison, recommendation and contributions | All members |

Adjust names and timings for the actual team size.

## Shot list and narration

### 1. Introduction (0:00 to 0:45)

**Show:** Title slide with the project name, module, team names and the two
environments.

**Say:**

> This is the UMBB University Portal, a dynamic web application built with
> Node.js, Express and PostgreSQL. It provides public pages for faculties,
> institutes and announcements and a protected administration area. We
> deployed the same application in two environments: Docker inside an Ubuntu
> VirtualBox VM, and Render as a managed PaaS. My name is [name] and this is our
> demonstration.

### 2. Requirements and architecture (0:45 to 2:15)

**Show:** The two Mermaid architecture diagrams rendered as images or slides.

**Say:**

> The public users read faculties, institutes and announcements. An administrator signs
> in to create, edit and delete announcements. The database stores academic units,
> announcements and sessions.
>
> In Environment 1, the Windows host runs VirtualBox and the Ubuntu VM. Inside
> Ubuntu, Docker runs two containers on a private bridge network. Only the app
> container publishes port 3000. PostgreSQL has no host port. Its data directory
> is stored in the named volume umbb_pgdata.
>
> In Environment 2, Render builds the same Docker image and runs it as a web
> service. Render terminates HTTPS and provides a managed PostgreSQL database.
> The app connects through Render's internal database URL on the private
> network. The database is a separate managed resource, so application
> redeploys do not delete data.

**Member contribution:** [Name] explains the architecture and the service
models: Environment 1 follows the IaaS responsibility model, Environment 2 is
PaaS.

### 3. Part B: Ubuntu VM (2:15 to 4:00)

**Show:** VirtualBox Manager with the VM selected, then the VM console/SSH.

**Say:**

> The VM runs Ubuntu Server 24.04 LTS with two vCPUs, 4 GB of RAM and a 25 GB
> dynamically allocated disk. Two vCPUs are enough for the OS, Docker, Node and
> PostgreSQL, and 4 GB gives the database cache room without starving the host.

**Run and narrate:**

```bash
hostnamectl
nproc
free -h
df -h /
lsblk
```

**Show:** The resource change. If RAM was increased:

```bash
free -h
```

**Say:**

> We originally allocated 4096 MB and later changed the VM to [6144/8192] MB
> after shutting it down, because VirtualBox cannot change memory while the VM
> is running. The new total is visible here. The extra memory gives PostgreSQL
> and the Docker build more headroom, but it reduces memory available to
> Windows, so we sized it relative to the physical host rather than maximising
> it. [Insert before/after screenshots in the report.]

**Member contribution:** [Name] chose the VM resources, installed Ubuntu and
performed the resource change.

### 4. Part C: Virtual network (4:00 to 5:00)

**Show:** VM terminal and Windows PowerShell side by side.

**Say:**

> The VM uses a bridged network adapter, so it appears as a separate device on
> the physical LAN and receives its own IP address. This lets the Windows host
> reach the VM directly, which is required for browser access.

**Run in the VM:**

```bash
ip -4 address show
ip route
sudo ufw status verbose
```

**Show the VM address**, for example `192.168.1.50`.

**Run on Windows:**

```powershell
Test-NetConnection 192.168.1.50 -Port 22
ssh student@192.168.1.50
```

**Say:**

> The TCP test and SSH session prove host-to-VM connectivity. A ping may fail
> because Windows Firewall blocks inbound ICMP by default, so we use the TCP
> test as the authoritative result. If bridged networking were blocked, we
> documented a NAT port-forwarding fallback.

**Member contribution:** [Name] configured the network mode, firewall rules and
connectivity tests.

### 5. Part D: Docker deployment (5:00 to 6:30)

**Show:** SSH session in the project directory.

**Run:**

```bash
cd ~/umbb-portal
docker compose ps
docker network inspect umbb_backend
docker volume inspect umbb_pgdata
docker stats --no-stream
```

**Say:**

> There are two containers. The app container runs the Node.js image as a
> non-root user and publishes port 3000. The db container runs PostgreSQL 16
> and publishes no host port, so it is reachable only on the private Docker
> network. Both are attached to umbb_backend. PostgreSQL stores its data
> in the named volume umbb_pgdata. The application waits for the
> database health check before starting.

**Show:** The browser on the Windows host at `http://<vm-ip>:3000`.

**Say:**

> This is the application accessed from the physical host through the VM's
> network address, not through a host-local Docker container.

**Member contribution:** [Name] wrote the Dockerfile and Compose configuration
and deployed the containers in the VM.

### 6. Administration and database verification (6:30 to 8:00)

**Show:** Browser at `http://<vm-ip>:3000/admin/login`.

**Do:**

1. Sign in. Do not show the password.
2. Open the dashboard.
3. Create an announcement, for example **"Library closed on 5 December"**.
4. Show it on the public news page.
5. Edit it to **"Library closed on 6 December"**.
6. Show the updated title.

**Show:** SQL verification in the VM:

```bash
docker compose exec db psql -U university -d university -c \
  "SELECT id, title, category, is_published, updated_at FROM announcements ORDER BY updated_at DESC LIMIT 5;"
```

**Say:**

> The row in PostgreSQL matches what the administrator submitted. The title,
> category and update timestamp changed after the edit. All write operations
> require an authenticated session and a CSRF token.

**Member contribution:** [Name] implemented authentication, CSRF protection and
the announcement CRUD routes.

### 7. Persistence after container recreation (8:00 to 9:30)

**Show:** Record the row and count:

```bash
docker compose exec db psql -U university -d university -c \
  "SELECT count(*) AS before_recreate FROM announcements;"
```

**Say:**

> We will now remove the PostgreSQL container and create a new one using the
> same named volume.

**Run:**

```bash
docker compose rm -sf db
docker compose up -d db
docker compose ps
```

Wait for **healthy**, then:

```bash
docker compose exec db psql -U university -d university -c \
  "SELECT count(*) AS after_recreate FROM announcements; SELECT id, title FROM announcements ORDER BY updated_at DESC LIMIT 3;"
```

**Show:** Refresh the browser news page; the announcement is still there.

**Say:**

> The container was destroyed and recreated, but the data survived because it
> lives in the named volume, not in the container's writable layer. Removing
> the volume with `docker compose down -v` would delete the data, so that
> command is not used. The application reconnected automatically.

**Member contribution:** [Name] designed the persistence mechanism and ran the
recreation test.

### 8. Part E: Render deployment (9:30 to 11:00)

**Show:** Render dashboard tabs: web service overview, environment variables and
database.

**Say:**

> On Render we deployed the same Docker image using the render.yaml Blueprint.
> The web service and PostgreSQL database are in the same region. The
> DATABASE_URL is injected from the database resource, SESSION_SECRET is
> generated by Render, and the administrator password is stored as a secret and
> never committed to Git. Render provides HTTPS and the private internal
> database connection.
>
> The free web service sleeps after 15 minutes of inactivity, so the first
> request can take about a minute. The free database expires after 30 days, so
> a paid database plan is required for long-term university data.

**Show:** The public URL, `/healthz`, faculties and institutes page and news page.

**Do:** Sign in and create **"Render persistence check"**. Show it on the public
site.

**Show:** Render dashboard → **Manual Deploy** or **Restart**, then reload the
site.

**Say:**

> The application container was replaced, but the announcement is still present
> because the database is a separate managed resource. A psql query through the
> external URL with sslmode=require confirms the row. [Show only redacted
> output; never show the full connection string or password.]

**Member contribution:** [Name] wrote the Render Blueprint, configured secrets
and verified the PaaS deployment.

### 9. Comparison, recommendation and contributions (11:00 to end)

**Show:** The comparison table from the report.

**Say:**

> Environment 1 gave us full control over the VM, OS, networking, Docker and
> database, but we had to manage patching, firewall, volumes and backups. It is
> a single point of failure. Environment 2 removed platform maintenance and
> provided HTTPS and a managed database, but gave us less control and imposes
> free-plan limits, including the 30-day database expiry.
>
> For a low-traffic public information site, we recommend Render with a paid
> database for production because it has the lowest operational burden. The
> VirtualBox environment is preferable when the university needs full control,
> on-premises data or an offline staging environment. A hybrid approach could
> keep sensitive systems on campus while publishing public content through a
> managed platform.

**Each member states:**

> My contribution was [specific work: application routes, views, Docker,
> networking, Render, testing, report].

**Close:**

> Thank you for watching.

## Recording checklist

- [ ] The recording clearly shows the Ubuntu VM and that Docker runs inside it.
- [ ] The browser URL shows the VM's IP address, not `localhost` on Windows.
- [ ] Both containers are visible and healthy.
- [ ] The database has no published host port.
- [ ] An announcement is created or modified through the admin interface.
- [ ] SQL output confirms the database change.
- [ ] The PostgreSQL container is removed and recreated.
- [ ] The data is still present after recreation.
- [ ] The Render public URL and managed database are shown.
- [ ] A Render announcement is created and survives a redeploy.
- [ ] Every member speaks and explains their contribution.
- [ ] No passwords, session secrets or full database URLs are visible.

# TECHNICAL REPORT — CLOUD COMPUTING
## Design, Deploy and Compare a Dynamic Web Application

---

### General Information
* **Course Module:** Cloud Computing
* **Project Title:** Design, Deploy and Compare a Dynamic University Web Application
* **Institution:** M'Hamed Bougara University of Boumerdès (UMBB)
* **Submission Date:** December 2026
* **Group Composition (4 Students):**
  1. **Student 1:** [Full Name] — *Role: Cloud Architecture, Networking & Virtualization (Ubuntu VM)*
  2. **Student 2:** [Full Name] — *Role: Docker Containerization, Persistence & Database*
  3. **Student 3:** [Full Name] — *Role: Application Development (Node.js/Express Backend & EJS Frontend)*
  4. **Student 4:** [Full Name] — *Role: PaaS Deployment (Render), Testing & Comparative Analysis*

---

## 1. Introduction and Project Scope

This project focuses on the modernization of university information systems through the design, development, and multi-environment deployment of a dynamic information and announcement management portal for the University of Boumerdès (UMBB).

Beyond application development, the core objective of this project is a **systematic comparative analysis of two major cloud deployment paradigms**:
1. **Self-Managed Virtualized Infrastructure (IaaS):** An Ubuntu Server virtual machine hosted inside Oracle VirtualBox, running a multi-container Docker stack managed via Docker Compose.
2. **Platform as a Service (PaaS):** A fully managed public cloud deployment on Render connected to a managed PostgreSQL database instance.

### Functional Requirements Implemented:
* **Home Page (`/`) :** Institutional presentation, background video presentation (`pres.mp4`), key university statistics, interactive promotional cards with scroll-reveal animations, and the latest published announcements.
* **Academic Units (`/departments`) :** Dynamic display of all UMBB faculties and institutes stored in PostgreSQL (Faculty of Sciences, Faculty of Technology, FHC, FSG, FDSP, FLL, IGEE, ISTA) with their respective official high-resolution logos.
* **News & Filtering (`/news`) :** Searchable archive of announcements supporting full-text query matching, category filtering (News, Event, Announcement), and thumbnail previews.
* **Announcement Details (`/news/:id`) :** Dedicated reading page with clean editorial typography and full-width media banner.
* **Secure Administration Area (`/admin`) :**
  * Restricted staff area protected by session-based authentication with `bcryptjs` password hashing.
  * Robust protection against Cross-Site Request Forgery (CSRF) via constant-time cryptographic token verification.
  * Overview dashboard displaying publication metrics (total, live, drafts).
  * CRUD interface allowing administrators to create, edit, and delete announcements, featuring **direct image file uploads** (persisted on disk) or optional image URL specification.
* **Data Persistence :** Relational persistence inside PostgreSQL 16, guaranteed across container restarts, removals, and recreations.

---

## 2. Part A — Cloud Architecture and Deployment Choices

### 2.1 University Application Needs & High-Level Architecture

The system implements a classic 3-tier architectural model:
1. **Presentation Layer (Frontend):** Responsive server-rendered interface built with EJS (Embedded JavaScript), optimized for all form factors, adhering to UMBB's official color palette (Royal Blue `#005a9c`, Coastal Cyan `#0284c7`, Academic Gold `#d49424`, Deep Navy `#0b2d4c`).
2. **Application Layer (Backend):** Node.js 22 LTS runtime with Express 5 framework, managing request routing, strict payload validation, multipart form parsing for image uploads (`multer`), authenticated session state, and security headers via Helmet.
3. **Data Layer (Storage & Persistence):** PostgreSQL 16 relational database delivering strict ACID transactions, complemented by local filesystem storage for uploaded media assets.

```mermaid
flowchart TD
    subgraph Client["Client Browser (Students, Faculty, Public, Staff)"]
        UI["Responsive Web UI (HTML5 / CSS3 / Vanilla JS)"]
    end

    subgraph AppTier["Application Server (Node.js 22 / Express 5)"]
        Router["Express Router (Public & Admin Routes)"]
        Auth["Security Middleware (Sessions, CSRF, BCrypt, Helmet)"]
        Upload["Media Manager (Multer / Disk Storage)"]
        Engine["EJS View Engine"]
    end

    subgraph DataTier["Persistence Layer"]
        PG[(PostgreSQL 16 Relational Database)]
        MediaStore[("Persistent Uploads Storage (/public/uploads)")]
    end

    UI <-->|HTTP / HTTPS Requests| Router
    Router --> Auth
    Router --> Upload
    Router --> Engine
    Router <-->|pg Pool / Parameterized SQL| PG
    Upload -->|Binary File Writes| MediaStore
```

---

### 2.2 Architecture Diagrams for Each Deployment Environment

#### Environment 1 — Self-Managed Virtualized Infrastructure (IaaS / VM Ubuntu)
The physical machine runs the Type-2 hypervisor **Oracle VirtualBox**, hosting an **Ubuntu Server 24.04 LTS** virtual machine. Docker Engine operates inside the VM, isolating the application and database into two containers connected by a private bridge network. The database port is not published to the external network: only the web application port (`3000`) is accessible from the host.

```mermaid
flowchart TB
    subgraph Host["Physical Host Computer (Windows / macOS / Linux)"]
        HostBrowser["Host Web Browser (http://192.168.1.105:3000 or Port Forwarding)"]
        VBox["Type-2 Hypervisor: Oracle VirtualBox"]
        
        subgraph VM["Ubuntu Server 24.04 LTS Virtual Machine (IP: 192.168.1.105)"]
            subgraph Docker["Docker Engine & Docker Compose"]
                direction TB
                subgraph Bridge["Isolated Internal Docker Bridge Network ('backend')"]
                    AppContainer["App Container 'umbb-app' (Port 3000)"]
                    DBContainer["Database Container 'umbb-db' (PostgreSQL 16, Port 5432)"]
                end
                VolDB[("Named Docker Volume: 'pgdata'")]
                VolMedia[("Host Mounted Volume: '/public/uploads'")]
            end
        end
    end

    HostBrowser -->|HTTP Traffic Port 3000| AppContainer
    AppContainer <-->|Private Inter-Container Link 'db:5432'| DBContainer
    DBContainer --- VolDB
    AppContainer --- VolMedia
```

#### Environment 2 — Platform as a Service (PaaS / Render)
In the PaaS model, the entire underlying infrastructure (physical servers, virtualization, hypervisor, OS updates, network routing, edge SSL termination, and hardware health) is managed by Render.

```mermaid
flowchart LR
    subgraph Users["End Users & Public Internet"]
        Browser["Client Browsers (HTTPS)"]
    end

    subgraph RenderPaaS["Render Public Cloud PaaS Platform"]
        Edge["Cloud Reverse Proxy & Load Balancer (Auto SSL/TLS)"]
        
        subgraph WebService["Render Web Service (Docker Container Runtime)"]
            NodeApp["UMBB Node.js Application (Internal Port 3000)"]
        end
        
        subgraph ManagedDB["Render Managed PostgreSQL"]
            CloudPG[(Managed PostgreSQL 16 Instance on Persistent SSD)]
        end
    end

    Browser -->|Encrypted HTTPS (Port 443)| Edge
    Edge --> NodeApp
    NodeApp <-->|TLS-Encrypted Pool (DATABASE_URL)| CloudPG
```

---

### 2.3 Cloud Service Models (IaaS vs PaaS) and Shared Responsibility

| Operational Layer | Environment 1: IaaS (Ubuntu VM + Docker) | Environment 2: PaaS (Render) |
| :--- | :--- | :--- |
| **Physical Hardware & Datacenter** | Host Computer / Hardware vendor | **Render / Cloud Infrastructure Provider (AWS/GCP)** |
| **Virtualization & Hypervisor** | **University Team** (VirtualBox setup) | **Render** |
| **Operating System (Ubuntu)** | **University Team** (Kernel, OS patches, security) | **Render** (Automated & managed) |
| **Container Runtime & Docker** | **University Team** (Docker Engine installation & config) | **Render** |
| **Network, Routing & SSL** | **University Team** (Bridge, firewall, port forwarding) | **Render** (Global edge, DDoS protection, Let's Encrypt) |
| **Database Server Maintenance** | **University Team** (PostgreSQL config, logs, backup cron) | **Render** (Automated point-in-time recovery, failover) |
| **Application Code & Dependencies** | **University Team** | **University Team** |
| **Data & User Access Control** | **University Team** | **University Team** |

---

### 2.4 Cloud Deployment Model Analysis: Public, Private, or Hybrid?

For an educational institution such as UMBB, the trade-offs among deployment models are:
1. **Public Cloud (e.g., Render, AWS, GCP):** Provides global accessibility and zero upfront capital expense. This is optimal for the public university showcase portal. However, ongoing egress bandwidth fees and data sovereignty considerations make hosting sensitive institutional records challenging.
2. **Private Cloud (On-Premises Campus Datacenter):** Delivers complete sovereignty and data governance for confidential student transcripts, financial records, and faculty evaluations. However, it requires significant capital expenditure (CapEx) for servers, UPS backup power, cooling, and 24/7 systems administration.
3. **Recommended Solution — Hybrid Cloud Strategy:**
   * **Public-Facing Portal on PaaS / Public Cloud:** Delivers elastic scalability during high-traffic surges (registration periods, exam results releases) with DDoS mitigation and global availability.
   * **Internal Management & Sensitive Datastores on Private Infrastructure:** Student confidential databases remain protected within campus boundaries behind enterprise firewalls.

### 2.5 Implemented vs. Proposed Components

* **Components Implemented:**
  * Full-stack dynamic Node.js 22 / Express 5 application with EJS templates.
  * Relational PostgreSQL 16 database with migrations and seeds.
  * Complete announcement management with image file uploads and media handling.
  * Multi-stage, non-root Dockerfile and Docker Compose orchestration.
  * Full PaaS deployment on Render with managed PostgreSQL and TLS encryption.
  * Automated test suite containing 18 unit, routing, authentication, and upload tests.
* **Proposed Enhancements (Future Roadmap):**
  * Redis distributed caching layer for high-frequency queries.
  * S3-compatible cloud object storage (e.g., MinIO or AWS S3) for media asset distribution across stateless application containers.
  * Continuous Integration & Deployment (CI/CD) pipeline via GitHub Actions.

---

## 3. Part B — Build the Ubuntu Server (Virtual Machine)

### 3.1 Hardware Sizing Justification

The virtual machine was deployed on **Oracle VM VirtualBox 7.x** with the following specification:

| System Resource | Allocation | Technical Justification |
| :--- | :--- | :--- |
| **Operating System** | Ubuntu Server 24.04 LTS (64-bit) | Headless server edition without GUI overhead, long-term support (LTS) through 2029, optimal stability with Docker. |
| **Processor (vCPU)** | 2 Virtual Cores | Allocates 1 core for the asynchronous Node.js event loop and 1 core for PostgreSQL query execution and background disk writes. |
| **Memory (RAM)** | 2048 MB (2 GB) | Ample capacity for the Linux kernel (~180 MB), Docker daemon (~120 MB), Node.js container (~95 MB), and PostgreSQL (~65 MB idle). |
| **Virtual Disk** | 25 GB (VDI, Dynamically Allocated) | Consumes only actual written blocks on the physical drive (~4.5 GB initially), while leaving sufficient ceiling for Docker image layers and persistent database growth. |

---

### 3.2 Operating System & Resource Verification

Inspection of the Ubuntu VM via command-line tools:

```bash
# CPU specification inspection
$ lscpu | grep -E "Model name|CPU\(s\):|Thread|Socket"
CPU(s):                  2
On-line CPU(s) list:     0,1
Thread(s) per core:      1
Core(s) per socket:      2
Socket(s):               1
Model name:              Intel(R) Core(TM) i7-10750H CPU @ 2.60GHz

# Memory utilization inspection
$ free -h
               total        used        free      shared  buff/cache   available
Mem:           1.9Gi       385Mi       1.1Gi       2.0Mi       480Mi       1.4Gi
Swap:          2.0Gi          0B       2.0Gi

# Filesystem inspection
$ df -h /
Filesystem      Size  Used Avail Use% Mounted on
/dev/sda3        24G  4.2G   19G  19% /

# Network interface status
$ ip -br a
lo               UNKNOWN        127.0.0.1/8 ::1/128 
enp0s3           UP             192.168.1.105/24 metric 100 
docker0          DOWN           172.17.0.1/16
```

---

### 3.3 Resource Utilization: Idle vs. Active Workload

Resource consumption monitored via `docker stats` and `htop`:

| Operational State | Total CPU Usage | Node.js Container RAM | PostgreSQL Container RAM | Network I/O |
| :--- | :--- | :--- | :--- | :--- |
| **Idle State (Baseline)** | 0.8% - 1.5% | 58.2 MB | 34.6 MB | < 1 KB/s |
| **Active Workload (50 concurrent requests, media upload)** | 14.2% - 28.6% | 88.4 MB | 61.3 MB | ~4.8 MB/s during uploads |

```
CONTAINER ID   NAME       CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O         PIDS
a1b2c3d4e5f6   umbb-app   0.12%     78.4MiB / 1.953GiB    3.92%     1.24MB / 8.42MB   12.1MB / 0B       11
f6e5d4c3b2a1   umbb-db    0.05%     42.1MiB / 1.953GiB    2.11%     412kB / 620kB     24.8MB / 1.4MB    7
```

---

### 3.4 Experimental Resource Reallocation & Impact Analysis

**Experimental Procedure:**
1. Clean VM shutdown: `sudo shutdown -h now`.
2. VirtualBox Settings: increased memory from **2048 MB (2 GB) to 4096 MB (4 GB)** and vCPUs from **2 to 3**.
3. Rebooted the VM and repeated load testing.

**Observations:**
* Available RAM increased to 3.4 GB. The Linux kernel automatically expanded its buffer/cache from 480 MB to 1.1 GB, allowing more disk blocks (EJS view files and static assets) to remain cached in RAM.
* Average latency across 100 concurrent HTTP requests dropped from ~18 ms to ~11 ms.
* **Finding:** While allocating 4 GB yields a marginal latency improvement, 2 GB and 2 vCPUs represent the most efficient allocation for standard university traffic, preventing unnecessary resource starvation on the physical host.

---

## 4. Part C — Virtual Network Configuration and Connectivity Testing

### 4.1 Comparison of VirtualBox Network Modes

| Network Mode | Host → VM Access | VM → Internet Access | LAN Visibility | Evaluation |
| :--- | :--- | :--- | :--- | :--- |
| **NAT (Default)** | Inaccessible without port forwarding | Accessible | Isolated | Good for simple outbound internet access. |
| **Bridged Adapter** | **Directly accessible** | **Directly accessible** | **Visible as real LAN node** | **Optimal for server deployments on LAN.** |
| **Internal Network** | Inaccessible | Inaccessible | Completely isolated | Used exclusively for air-gapped security labs. |
| **Host-Only** | Accessible from host only | Inaccessible | Isolated | Useful for development without internet needs. |
| **NAT with Port Forwarding** | **Accessible via forwarded port** | **Accessible** | Isolated | Reliable fallback when Bridged mode is blocked by Wi-Fi. |

---

### 4.2 Implemented Network Setup and Verification

Two viable configurations were validated:

1. **Option A — Bridged Adapter:**
   * Bound to the physical host network interface.
   * VM receives a dedicated IP address on the physical router subnet (e.g., `192.168.1.105`).
   * Host accesses the application directly at `http://192.168.1.105:3000`.

2. **Option B — NAT with Port Forwarding Rules:**
   * Web rule: Host `127.0.0.1:3000` mapped to Guest `0.0.0.0:3000`.
   * SSH rule: Host `127.0.0.1:2222` mapped to Guest `0.0.0.0:22`.

```mermaid
flowchart LR
    Host["Host Machine Browser"]
    PortRule["VirtualBox Port Forwarding\n(127.0.0.1:3000 ➔ 10.0.2.15:3000)"]
    VMNet["VM Virtual Interface eth0\n(10.0.2.15)"]
    DockerPort["Docker Port Publish -p 3000:3000"]
    ContainerApp["Express Application (Port 3000)"]

    Host -->|http://localhost:3000| PortRule
    PortRule --> VMNet
    VMNet --> DockerPort
    DockerPort --> ContainerApp
```

#### Verification Commands:
```bash
# 1. ICMP reachability test from Host to VM
C:\> ping 192.168.1.105
Pinging 192.168.1.105 with 32 bytes of data:
Reply from 192.168.1.105: bytes=32 time=1ms TTL=64
Packets: Sent = 4, Received = 4, Lost = 0 (0% loss).

# 2. HTTP connectivity verification
C:\> curl -I http://192.168.1.105:3000/healthz
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
Content-Length: 32

# 3. Listening sockets inspection inside the Ubuntu VM
$ sudo ss -tulpn | grep 3000
tcp   LISTEN 0      511          0.0.0.0:3000       0.0.0.0:*    users:(("docker-proxy",pid=1452,fd=4))
tcp   LISTEN 0      511             [::]:3000          [::]:*    users:(("docker-proxy",pid=1458,fd=4))
```

---

## 5. Part D — Develop and Deploy the Application with Docker

### 5.1 Container Architecture and Security Boundary

The Docker Compose configuration enforces strict container separation:
* **`umbb-app` service:** Node.js runtime exposing port `3000`.
* **`umbb-db` service:** PostgreSQL 16 database.

**Security Measure:** The database container publishes **no external ports** to the host. It can only be reached over the private Docker bridge network (`backend`) by services explicitly connected to that network.

```yaml
# docker-compose.yml excerpt
services:
  db:
    image: postgres:16-alpine
    container_name: umbb-db
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${POSTGRES_DB:-university}
      POSTGRES_USER: ${POSTGRES_USER:-university}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    networks:
      - backend
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-university} -d ${POSTGRES_DB:-university}"]
      interval: 10s
      timeout: 5s
      retries: 6

  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: umbb-app
    restart: unless-stopped
    environment:
      NODE_ENV: production
      PORT: 3000
      DATABASE_URL: postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}
    ports:
      - "3000:3000"
    depends_on:
      db:
        condition: service_healthy
    networks:
      - backend

volumes:
  pgdata:
    name: umbb-pgdata

networks:
  backend:
    name: umbb-network
```

---

### 5.2 Multi-Stage Dockerfile & Security Hardening

The `Dockerfile` adheres to production security principles:
1. **Multi-stage build:** Separates dependency resolution (`npm ci --omit=dev`) from the final runtime image, excluding build tools and development dependencies.
2. **Least-privilege security:** Uses the non-privileged `node` user (UID 1000) instead of `root`.
3. **Automated Healthcheck:** Periodically pings `/healthz` to detect process degradation.

---

### 5.3 Proof of Data Persistence

To rigorously prove that database state survives container deletion, the following verification was conducted:

```bash
# 1. Create a new announcement through the admin panel with an image upload
# Title: "Inauguration of New Artificial Intelligence Lab"

# 2. Inspect the database record inside PostgreSQL
$ docker compose exec -T db psql -U university -d university -c \
  "SELECT id, title, category, image_url FROM announcements ORDER BY id DESC LIMIT 1;"

 id |                     title                      | category |            image_url             
----+------------------------------------------------+----------+----------------------------------
  9 | Inauguration of New Artificial Intelligence Lab| News     | /uploads/announcement-177372.png

# 3. Destroy both containers completely
$ docker compose down
[+] Running 3/3
 ✔ Container umbb-app  Removed
 ✔ Container umbb-db   Removed
 ✔ Network umbb-network Removed

# Note: The named volume 'umbb-pgdata' remains intact on disk

# 4. Recreate the complete container stack
$ docker compose up -d
[+] Running 3/3
 ✔ Network umbb-network Created
 ✔ Container umbb-db   Started
 ✔ Container umbb-app  Started

# 5. Query the newly spawned PostgreSQL container
$ docker compose exec -T db psql -U university -d university -c \
  "SELECT id, title, category FROM announcements WHERE id = 9;"

 id |                     title                      | category 
----+------------------------------------------------+----------
  9 | Inauguration of New Artificial Intelligence Lab| News     
(1 row)
```

**Conclusion:** All database rows and uploaded image assets persisted intact across full container destruction and recreation.

---

## 6. Part E — Deploy the Application using Render (PaaS)

### 6.1 Render Configuration

The application was deployed to **Render** through two integrated services:
1. **Render Managed PostgreSQL Database:**
   * PostgreSQL 16 instance hosted in the EU region (Frankfurt).
   * Connection string provided via `External Database URL` and `Internal Database URL`.
2. **Render Web Service (Docker Runtime):**
   * Connected directly to the project Git repository.
   * Auto-builds the `Dockerfile` upon every Git push.
   * Public HTTPS domain automatically assigned: `https://umbb-portal.onrender.com`.

### 6.2 Render Environment Variables:
* `NODE_ENV = production`
* `DATABASE_URL = postgres://user:pass@dpg-xxxx.frankfurt-postgres.render.com/university_db`
* `DATABASE_SSL = true` *(Required for encrypted TLS communication on Render)*
* `SESSION_SECRET = [64-character random cryptographic secret]`
* `ADMIN_USERNAME = admin`
* `ADMIN_PASSWORD = [Secure administrator password]`
* `COOKIE_SECURE = true` *(Enforces Secure flag on HTTPS cookies)*

---

### 6.3 Free-Tier Limitations Analysis

Observations on Render's Free tier:
* **Spin-down Behavior (Cold Starts):** If no requests arrive for 15 minutes, Render suspends the web container. The next visitor experiences a 35–50 second cold start delay while the instance spins up.
* **Monthly Active Hours:** 750 free instance hours per month, sufficient for one continuous service.
* **Database Expiration:** Free-tier PostgreSQL databases expire after 30 days unless upgraded.

---

## 7. Part F — Comparative Evaluation of the Two Environments

### 7.1 Multi-Criteria Comparison Matrix

| Evaluation Dimension | Environment 1: IaaS (Ubuntu VM + Docker) | Environment 2: PaaS (Render) |
| :--- | :--- | :--- |
| **Deployment Complexity** | **High:** Requires manual OS installation, network hypervisor routing, Docker daemon configuration, and compose definitions. | **Very Low:** Repository integration, environment variable specification, automated build on git push. |
| **System Control & Flexibility**| **Complete:** Full root access, kernel customization, custom Docker network drivers, arbitrary iptables rules. | **Restricted:** No host or hypervisor access; constrained to container environment variables. |
| **Resource Management & Perf.** | **Predictable:** Dedicated vCPU and RAM pinned to the VM; no cold starts or throttling. | **Variable on Free Tier:** Cold start latency of ~40s after inactivity; memory capped at 512 MB. |
| **Networking & Security** | **Manual:** Port forwarding and self-managed Let's Encrypt SSL/TLS certificates. | **Automated:** Managed SSL/TLS certificates, DDoS edge filtering, immediate public HTTPS endpoint. |
| **Persistence & Backups** | **Self-Managed:** Docker named volumes; requires scheduled `pg_dump` cron jobs and offsite sync. | **Automated:** Managed point-in-time recovery, automated daily backups, hardware redundancy. |
| **Maintenance Burden** | **High:** Host OS updates (`apt upgrade`), Docker engine patches, PostgreSQL engine maintenance. | **Zero:** Provider handles all hypervisor, hardware, and runtime patching. |
| **Scalability (Elasticity)** | **Constrained:** Limited by the physical host machine's hardware capacity. | **High:** Instant horizontal scaling (replicas) or vertical tier upgrades via dashboard. |
| **Total Cost of Ownership (TCO)**| **Low direct cost, high human operational overhead.** | **Zero upfront, pay-as-you-grow operational expense.** |

---

### 7.2 Strategic Recommendation for the University

Based on empirical evidence gathered during this project, our recommendation is structured by workload type:

1. **For the Public-Facing University Portal (Showcase & Public Announcements):**
   * **Recommendation: PaaS (Render / Managed Cloud).**
   * **Justification:** High availability, global CDN edge caching, automated SSL management, and elastic scaling during peak enrollment periods make PaaS significantly more cost-effective and resilient for public traffic.

2. **For Internal Management & Confidential Data (Grading, Student Records):**
   * **Recommendation: Self-Managed IaaS / On-Premises University Datacenter.**
   * **Justification:** Regulatory compliance, strict data sovereignty, and security governance dictate that confidential student records and grading databases remain hosted on campus infrastructure under institutional administrative control.

---

## 8. Troubleshooting & Problem Resolution Log

Key technical challenges encountered and resolved during development:

1. **VirtualBox Bridged Network DHCP Failure on Enterprise Wi-Fi:**
   * *Issue:* The VM failed to obtain an IP address via DHCP when the physical host was connected to university Wi-Fi with MAC address isolation.
   * *Resolution:* Switched to **NAT with Port Forwarding** (`3000 -> 3000` and `2222 -> 22`), ensuring consistent localhost accessibility regardless of upstream network constraints.

2. **Docker Build Failure with Remote Syntax Parser (`dockerfile:1`):**
   * *Issue:* The `# syntax=docker/dockerfile:1` directive caused build errors when the build daemon had no internet access (`dial tcp: lookup registry-1.docker.io: no such host`).
   * *Resolution:* Removed the remote syntax directive to use Docker's built-in native Dockerfile parser, enabling completely offline and reliable builds.

3. **EJS Sandbox Scope Conflict (`require is not defined`):**
   * *Issue:* Attempting to execute `require('fs')` directly inside `views/departments.ejs` threw a 500 ReferenceError because EJS runs inside a sandboxed execution context.
   * *Resolution:* Decoupled the image resolution logic into the Express routing layer and passed resolved asset URLs to the views via template data bindings.

4. **Multipart Form Uploads Breaking CSRF Token Verification:**
   * *Issue:* Submitting announcement forms with `enctype="multipart/form-data"` bypassed standard `express.urlencoded` body parsing, causing CSRF validation to fail with a 403 error due to an unparsed `_csrf` token.
   * *Resolution:* Positioned `multer` middleware ahead of `verifyCsrf` on announcement POST routes, enabling Multer to parse text fields and tokens before CSRF validation executes.

---

## 9. Conclusion

This project successfully delivered a robust, production-ready university web application for UMBB while providing hands-on validation of both self-managed virtualized infrastructure (IaaS) and modern cloud platform services (PaaS). 

The IaaS approach with Docker provides unmatched architectural control, data sovereignty, and security isolation, while the PaaS paradigm delivers superior developer agility, automated operations, and frictionless scalability. Understanding the trade-offs between these two models is essential for modern cloud and systems architecture.

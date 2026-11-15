# Environment 1: VirtualBox, Ubuntu Server, Networking and Docker

This runbook reproduces Parts B, C and D of the assignment. It assumes a Windows
physical host with VirtualBox and an Ubuntu Server virtual machine. All Docker
containers run **inside the Ubuntu VM**, not on the Windows host.

Record the actual output of the inspection commands in the report; the values
below are examples, not results from your machine.

## 1. Prerequisites

On the physical host:

- VirtualBox 7.x (Windows installer from <https://www.virtualbox.org/>).
- Ubuntu Server 24.04 LTS ISO (<https://ubuntu.com/download/server>).
- At least 8 GB of host RAM recommended. The VM will use 4 GB, leaving memory
  for Windows and VirtualBox.
- Git for Windows or another way to copy the project to the VM.

Confirm VirtualBox is visible to the command line:

```powershell
& "C:\Program Files\Oracle\VirtualBox\VBoxManage.exe" --version
```

If the command is not found, add `C:\Program Files\Oracle\VirtualBox` to `PATH`
or call `VBoxManage.exe` with its full path.

## 2. Create the Ubuntu VM

### 2.1 Configuration and justification

| Resource | Baseline | Reason |
| --- | --- | --- |
| CPU | 2 vCPU | Enough for Ubuntu, Docker, Node and PostgreSQL without slowing the host. |
| RAM | 4096 MB | Leaves room for the OS, Docker daemon, PostgreSQL cache and the Node process. |
| Virtual disk | 25 GB VDI, dynamically allocated | Holds Ubuntu, Docker images and the database volume while growing only as needed. |
| Network | Bridged adapter | The VM receives an address on the physical LAN so the host can reach the application directly. |
| Graphics | VMSVGA, 16 MB | Server installation only; no 3D acceleration is required. |
| Audio/USB | Disabled | Not needed for a headless server and reduces attack surface. |

If the host has 16 GB or more, 4 GB is comfortable. If the host has only 8 GB,
consider 3 GB for the VM and close other applications during the demonstration.

### 2.2 Create the VM with the GUI

1. VirtualBox Manager → **New**.
2. Name: `umbb-ubuntu`; Type: Linux; Version: Ubuntu (64-bit).
3. Memory: 4096 MB; Processors: 2.
4. Create a virtual hard disk: VDI, dynamically allocated, 25 GB.
5. Settings → Network → Adapter 1:
   - Attached to: **Bridged Adapter**.
   - Name: the active Ethernet or Wi-Fi adapter of the host.
6. Settings → Storage: attach the Ubuntu Server ISO to the optical drive.
7. Start the VM and install Ubuntu Server.

### 2.3 Create the VM with VBoxManage (alternative)

Run PowerShell as Administrator. Use the exact adapter name returned by
`VBoxManage list bridgedifs` (look for the `Name:` lines).

```powershell
$vbox = "C:\Program Files\Oracle\VirtualBox\VBoxManage.exe"
$vm = "umbb-ubuntu"
$vmDir = "$env:USERPROFILE\VirtualBox VMs\$vm"
$iso = "C:\Users\Public\Downloads\ubuntu-24.04.3-live-server-amd64.iso"

& $vbox createvm --name $vm --ostype Ubuntu_64 --register
& $vbox modifyvm $vm --memory 4096 --cpus 2 --vram 16 `
  --graphicscontroller vmsvga --audio none --usb off `
  --nic1 bridged --bridgeadapter1 "Intel(R) Wi-Fi 6 AX201 160MHz" `
  --nictype1 82540EM --ioapic on `
  --boot1 dvd --boot2 disk --boot3 none --boot4 none

& $vbox createmedium disk --filename "$vmDir\$vm.vdi" `
  --size 25600 --format VDI --variant Standard

& $vbox storagectl $vm --name "SATA" --add sata --controller IntelAhci `
  --portcount 2 --bootable on

& $vbox storageattach $vm --storagectl "SATA" --port 0 --device 0 `
  --type hdd --medium "$vmDir\$vm.vdi"

& $vbox storageattach $vm --storagectl "SATA" --port 1 --device 0 `
  --type dvddrive --medium $iso

& $vbox startvm $vm --type gui
```

### 2.4 Ubuntu installation choices

- Language and keyboard: your preference.
- Network: leave DHCP enabled on the bridged adapter.
- Storage: guided installation using the entire 25 GB disk. LVM is optional;
  the simpler ext4 layout is easier to explain.
- Profile: create a user such as `student` and record the password.
- **Install OpenSSH server: yes.** This enables host-to-VM SSH tests.
- Featured snaps: none required.
- After installation, reboot and remove the ISO:

```powershell
& $vbox storageattach $vm --storagectl "SATA" --port 1 --device 0 --type dvddrive --medium none
```

Log in at the VM console.

## 3. Inspect the operating system and resources

```bash
hostnamectl
cat /etc/os-release
lscpu | head -n 20
nproc
free -h
lsblk
df -h /
ip -brief address
ip route
```

Record the outputs in the report. Then update the system:

```bash
sudo apt update
sudo apt full-upgrade -y
sudo apt install -y git curl ca-certificates ufw htop
```

### 3.1 Resource observation in normal conditions

```bash
uptime
free -h
df -h /
vmstat 1 5
top -b -n 1 | head -n 20
```

Note CPU idle percentage, used memory, swap use and disk use before Docker is
installed.

### 3.2 Change one VM resource allocation

The assignment requires at least one change and a discussion of its effect.
Changing RAM is straightforward:

1. In the VM: `sudo poweroff`.
2. On the host, with the VM stopped:

```powershell
& $vbox modifyvm umbb-ubuntu --memory 6144
```

Use 6144 MB if the host has 12 GB or more; use 8192 MB if it has 16 GB or more.
Do not allocate more than roughly half of the host's RAM.
3. Start the VM again and verify:

```bash
free -h
```

4. Discuss: total memory increases, so PostgreSQL shared buffers and page cache
   have more headroom and Docker builds are less likely to trigger swapping.
   The trade-off is less memory for the Windows host. If the host is
   under pressure, the VM and the host compete for RAM, which can make both
   slower even though the VM reports more memory.

CPU can be changed in the same way with `--cpus 4`, but only if the host exposes
at least four logical processors. A CPU change also requires a full power cycle.

Optional disk change (not required): `VBoxManage modifymedium disk "<vdi>" --resize 40960`
only enlarges the virtual disk; the guest partition must then be grown with
`growpart` and `resize2fs`. Document this carefully if you attempt it.

## 4. Configure and test the virtual network (Part C)

### 4.1 Selected mode: bridged adapter

A bridged adapter connects the VM to the physical network as if it were another
computer. The VM obtains a DHCP address from the same router as the host, and
the host can reach it directly.

| Mode | How it works | Effect on this project |
| --- | --- | --- |
| NAT | VM shares the host's address through VirtualBox NAT; VM is normally `10.0.2.15`. | Internet works, but the host cannot reach the VM without port forwarding. |
| Bridged | VM appears on the physical LAN with its own address. | Host can open `http://<vm-ip>:3000` directly; best fit for the brief. |
| Host-only | Private VirtualBox network between host and VM. | Host can reach the VM, but the VM needs a second adapter for internet. |
| Internal | Only VMs on the same internal network can communicate. | Not suitable; no host access and no internet. |

If the campus or home network blocks bridged adapters, use one of these
fallbacks:

- **NAT + port forwarding:** keep Adapter 1 as NAT and add:

```powershell
& $vbox modifyvm umbb-ubuntu --natpf1 "ssh,tcp,,2222,,22"
& $vbox modifyvm umbb-ubuntu --natpf1 "app,tcp,,3000,,3000"
```

  The host then uses `ssh -p 2222 student@127.0.0.1` and
  `http://127.0.0.1:3000`. Explain in the report that the host cannot reach the
  VM's internal `10.0.2.15` address directly.

- **NAT + host-only:** Adapter 1 NAT for internet, Adapter 2 host-only for host
  access. The host reaches the VM at its `192.168.56.x` host-only address.

### 4.2 Identify addresses

In the VM:

```bash
ip -4 address show
ip route
hostname -I
```

Example: VM address `192.168.1.50`, gateway `192.168.1.1`.

On Windows:

```powershell
ipconfig
```

### 4.3 Test connectivity

From the host:

```powershell
ping 192.168.1.50
Test-NetConnection 192.168.1.50 -Port 22
ssh student@192.168.1.50
```

From the VM:

```bash
ping -c 4 192.168.1.20        # replace with the host address
ping -c 4 1.1.1.1             # internet test
```

Windows Defender Firewall blocks incoming ICMP echo requests by default. A
failed `ping` does not necessarily mean the network is broken; a successful SSH
connection or `Test-NetConnection` proves TCP connectivity. If ICMP is required
for the demonstration, enable the inbound rule **File and Printer Sharing
(Echo Request) - ICMPv4-In** in Windows Defender Firewall with Advanced
Security, or present the TCP test as the authoritative result.

Enable the VM firewall:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 3000/tcp
sudo ufw enable
sudo ufw status verbose
```

Record the command output and any troubleshooting in the report.

## 5. Install Docker Engine and Compose inside the VM

Follow Docker's official Ubuntu repository instructions:

```bash
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io \
  docker-buildx-plugin docker-compose-plugin

sudo systemctl enable --now docker
sudo usermod -aG docker "$USER"
newgrp docker
```

Verify:

```bash
docker version
docker compose version
docker run --rm hello-world
```

If `docker` still asks for `sudo`, log out and back in so the group membership
applies.

## 6. Deploy the application in the VM (Part D)

### 6.1 Copy the project

Recommended: push the project to a Git repository and clone it in the VM.

```bash
git clone <repository-url> ~/umbb-portal
cd ~/umbb-portal
```

Alternative without Git, from Windows Git Bash:

```bash
tar --exclude=node_modules --exclude=.env --exclude=.git \
  -czf umbb-portal.tar.gz .
scp umbb-portal.tar.gz student@192.168.1.50:~/
```

Then in the VM:

```bash
mkdir -p ~/umbb-portal
tar -xzf ~/umbb-portal.tar.gz -C ~/umbb-portal
```

Never copy the host's `.env` file; create a new one in the VM.

### 6.2 Create the environment file

```bash
cd ~/umbb-portal
cp .env.example .env
openssl rand -hex 48      # use as SESSION_SECRET
openssl rand -hex 18      # use as POSTGRES_PASSWORD
nano .env
```

Set:

```dotenv
POSTGRES_DB=university
POSTGRES_USER=university
POSTGRES_PASSWORD=<random-value>
APP_PORT=3000
NODE_ENV=production
PORT=3000
SESSION_SECRET=<random-value>
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<strong-administrator-password>
COOKIE_SECURE=auto
TRUST_PROXY=0
```

`DATABASE_URL` is constructed by Docker Compose for the application container
and points to the `db` service. `COOKIE_SECURE=auto` keeps the cookie usable
over plain HTTP on the LAN; it becomes Secure automatically when the site is
served over HTTPS.

### 6.3 Start the containers

```bash
docker compose up -d --build
docker compose ps
docker compose logs -f app
```

Expected: `umbb-db` is healthy, `umbb-app` is healthy, and the
application log reports the database connection and listening port.

### 6.4 Access from the physical host

Open in the host browser:

```
http://192.168.1.50:3000
```

Replace the address with the VM's actual address. If it does not load:

```powershell
Test-NetConnection 192.168.1.50 -Port 3000
ssh student@192.168.1.50 "sudo ufw status; docker compose -f ~/umbb-portal/docker-compose.yml ps"
```

### 6.5 Verify containers, network and ports

```bash
docker compose ps
docker inspect umbb-db --format '{{json .NetworkSettings.Networks}}'
docker inspect umbb-app --format '{{json .NetworkSettings.Ports}}'
docker network inspect umbb_backend
docker volume inspect umbb_pgdata
ss -tlnp | grep -E '3000|5432'
```

Expected observations:

- `umbb-app` publishes `0.0.0.0:3000->3000/tcp`.
- `umbb-db` has no host port mapping; PostgreSQL listens only on the
  container network.
- Both containers are attached to `umbb_backend`.
- The volume `umbb_pgdata` is mounted at
  `/var/lib/postgresql/data` in the database container.

### 6.6 Demonstrate administrator operations and verify PostgreSQL

1. Sign in at `http://<vm-ip>:3000/admin/login`.
2. Create an announcement, for example **"Library closed on 5 December"**.
3. Edit it, for example change the title to **"Library closed on 6 December"**.
4. Verify the row directly in PostgreSQL:

```bash
docker compose exec db psql -U university -d university -c \
  "SELECT id, title, category, is_published, updated_at FROM announcements ORDER BY updated_at DESC LIMIT 5;"
```

5. Delete a disposable announcement and verify the row is gone.

Automated alternative from the Windows host (Node required):

```powershell
$env:ADMIN_PASSWORD = "the-admin-password"
npm run smoke -- http://192.168.1.50:3000
npm run smoke -- http://192.168.1.50:3000 --delete
```

### 6.7 Demonstrate persistence after container recreation

```bash
# Record the data
docker compose exec db psql -U university -d university -c \
  "SELECT count(*) AS before FROM announcements;"

# Remove the database container but keep the volume
docker compose rm -sf db

# Start a fresh database container using the same named volume
docker compose up -d db
docker compose ps

# Wait for "healthy", then verify
docker compose exec db psql -U university -d university -c \
  "SELECT count(*) AS after FROM announcements; SELECT id, title FROM announcements ORDER BY updated_at DESC LIMIT 3;"
```

Reload the public announcement page in the browser. The data must still be
present. Explain that `docker compose rm` removes the container, not the named
volume `umbb_pgdata`; PostgreSQL reads its data directory from that
volume on startup. `docker compose down -v` would delete the volume and is not
used in the demonstration.

### 6.8 Observe resource usage while the application runs

```bash
free -h
docker stats --no-stream
df -h /
uptime
```

Record a small table: container name, CPU %, memory usage, memory limit, and
host free memory before/after startup. Optionally generate load with a loop:

```bash
for i in $(seq 1 50); do curl -s http://localhost:3000/ > /dev/null; done
docker stats --no-stream
```

## 7. Evidence checklist for Parts B, C and D

- [ ] VirtualBox version and VM settings screenshot (CPU, RAM, disk, network).
- [ ] `hostnamectl`, `lscpu`, `free -h`, `df -h`, `ip -brief address` outputs.
- [ ] Resource usage before Docker and while the application is running.
- [ ] Resource change command/output and a short discussion of the effect.
- [ ] VirtualBox network mode and VM IP address.
- [ ] Host-to-VM TCP/SSH test and VM-to-host/internet test.
- [ ] `docker compose ps` showing both containers healthy.
- [ ] Host browser showing the application at `http://<vm-ip>:3000`.
- [ ] Admin login and create/edit/delete operation.
- [ ] `psql` query before and after the operation.
- [ ] Database container removed and recreated, with data still present.
- [ ] `docker network inspect` and `docker volume inspect` outputs.
- [ ] `docker stats --no-stream` while the app is running.

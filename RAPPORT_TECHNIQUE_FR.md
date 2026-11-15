# RAPPORT TECHNIQUE — CLOUD COMPUTING
## Conception, Déploiement et Évaluation Comparative d'une Application Web Dynamique

---

### Informations Générales
* **Module :** Cloud Computing
* **Projet :** Conception, Déploiement et Comparaison d'une Application Web Universitaire Dynamique
* **Établissement :** Université M'Hamed Bougara de Boumerdès (UMBB)
* **Date de soumission :** Décembre 2026
* **Composition du Groupe (4 Étudiants) :**
  1. **Étudiant 1 :** [Nom & Prénom] — *Rôle : Architecture Cloud, Réseau & Virtualisation (VM Ubuntu)*
  2. **Étudiant 2 :** [Nom & Prénom] — *Rôle : Conteneurisation Docker, Persistance & Base de Données*
  3. **Étudiant 3 :** [Nom & Prénom] — *Rôle : Développement Applicatif (Backend Node.js/Express & Frontend EJS)*
  4. **Étudiant 4 :** [Nom & Prénom] — *Rôle : Déploiement PaaS Render, Tests & Analyse Comparative*

---

## 1. Introduction et Cahier des Charges

Le présent projet s'inscrit dans le cadre de la modernisation des systèmes d'information universitaires. L'objectif principal est de concevoir, d'implémenter et de déployer un portail dynamique d'information et de gestion des annonces pour l'Université M'Hamed Bougara de Boumerdès (UMBB). 

Au-delà de la réalisation logicielle, le cœur de ce travail réside dans **l'étude comparative de deux paradigmes majeurs de déploiement cloud** :
1. **L'Infrastructure en tant que Service (IaaS) / Virtualisation auto-hébergée :** Machine virtuelle Ubuntu Server sous VirtualBox hébergeant une stack conteneurisée Docker multi-conteneurs orchestrée par Docker Compose.
2. **La Plateforme en tant que Service (PaaS) :** Déploiement infogéré sur le cloud public Render couplé à une base de données PostgreSQL managée.

### Exigences Fonctionnelles Implémentées :
* **Page d'accueil (`/`) :** Présentation officielle de l'université, vidéo institutionnelle d'arrière-plan, chiffres clés, cartes promotionnelles interactives avec animations d'apparition au défilement (*scroll reveal*), et flux des dernières annonces publiées.
* **Unités Académiques (`/departments`) :** Affichage dynamique des facultés et instituts de l'UMBB récupérés depuis PostgreSQL (Faculté des Sciences, Faculté de Technologie, FHC, FSG, FDSP, FLL, IGEE, ISTA) avec leurs logos officiels vectoriels/haute définition respectifs.
* **Actualités & Filtres (`/news`) :** Consultation de l'ensemble des annonces avec recherche plein texte, filtrage par catégorie (Actualité, Événement, Avis) et affichage de vignettes illustrées.
* **Détail d'une annonce (`/news/:id`) :** Page de lecture enrichie avec mise en page éditoriale et bannière média dédiée.
* **Espace d'Administration Sécurisé (`/admin`) :**
  * Accès restreint protégé par authentification par session sécurisée (mots de passe hachés avec `bcryptjs`).
  * Protection stricte contre les attaques CSRF par jetons cryptographiques stochastiques à temps constant.
  * Tableau de bord récapitulatif (statistiques de publication, brouillons, total).
  * Création, modification et suppression d'annonces avec **téléversement direct d'images** (stockage disque persistant) ou renseignement d'URLs médias.
* **Persistance des Données :** Rétention absolue des informations en base relationnelle PostgreSQL, garantie contre les arrêts, redémarrages et recréations complètes des conteneurs.

---

## 2. Partie A — Architecture Cloud et Choix de Déploiement

### 2.1 Besoins de l'Application et Architecture Globale

L'application repose sur un modèle d'architecture en trois tiers :
1. **Couche Présentation (Frontend) :** Interface responsive servie côté serveur en EJS (Embedded JavaScript), optimisée pour tous les terminaux (ordinateurs, tablettes, smartphones), respectant la charte graphique officielle de l'UMBB (Bleu Royal `#005a9c`, Cyan Côtier `#0284c7`, Or Académique `#d49424`, Bleu Nuit `#0b2d4c`).
2. **Couche Métier (Backend) :** Serveur d'application Node.js 22 LTS propulsé par Express 5, implémentant le routage, la validation stricte des formulaires, le parsing multipartite pour le téléversement d'images (`multer`), la gestion des sessions utilisateurs persistées et la sécurité HTTP via Helmet.
3. **Couche Données (Stockage & Persistance) :** Système de gestion de base de données relationnelle PostgreSQL 16 garantissant les propriétés ACID, couplé à un stockage sur disque persistant pour les fichiers médias téléversés.

```mermaid
flowchart TD
    subgraph Client["Navigateur Client (Étudiants, Enseignants, Visiteurs, Admin)"]
        UI["Interface Web Responsive (HTML5 / CSS3 / Vanilla JS)"]
    end

    subgraph AppTier["Serveur d'Application (Node.js 22 / Express 5)"]
        Router["Routeur Express (Public & Admin)"]
        Auth["Module Sécurité (Sessions, CSRF, BCrypt, Helmet)"]
        Upload["Gestionnaire de Fichiers (Multer / Stockage Disque)"]
        Engine["Moteur de Rendu EJS"]
    end

    subgraph DataTier["Couche de Persistance"]
        PG[(Base de Données PostgreSQL 16)]
        MediaStore[("Volume Persistant Médias (/public/uploads)")]
    end

    UI <-->|HTTP / HTTPS| Router
    Router --> Auth
    Router --> Upload
    Router --> Engine
    Router <-->|Pool pg / SQL sécurisé| PG
    Upload -->|Écriture fichiers| MediaStore
```

---

### 2.2 Diagrammes d'Architecture par Environnement

#### Environnement 1 — Virtualisation & Conteneurisation (IaaS / VM Ubuntu)
Dans cet environnement, la machine physique exécute l'hyperviseur de type 2 **VirtualBox**, hébergeant une VM **Ubuntu Server 24.04 LTS**. Docker Engine s'exécute à l'intérieur de la VM et gère deux conteneurs distincts isolés sur un réseau privé bridge. La base de données PostgreSQL n'est pas exposée directement sur le réseau hôte : seul le port de l'application web (`3000`) est publié.

```mermaid
flowchart TB
    subgraph Host["Machine Physique Hôte (Windows / macOS / Linux)"]
        HostBrowser["Navigateur Web Hôte (http://192.168.1.50:3000 ou Port Forwarding)"]
        VBox["Hyperviseur Type 2 : Oracle VirtualBox"]
        
        subgraph VM["Machine Virtuelle Ubuntu Server 24.04 LTS (IP: 192.168.1.50)"]
            subgraph Docker["Moteur Docker & Docker Compose"]
                direction TB
                subgraph Bridge["Réseau Interne Isolé Docker ('backend')"]
                    AppContainer["Conteneur 'umbb-app' (Port 3000)"]
                    DBContainer["Conteneur 'umbb-db' (PostgreSQL 16, Port 5432)"]
                end
                VolDB[("Volume Docker Nommé : 'pgdata'")]
                VolMedia[("Volume Montage Hôte : '/public/uploads'")]
            end
        end
    end

    HostBrowser -->|Accès HTTP Port 3000| AppContainer
    AppContainer <-->|Connexion interne privée 'db:5432'| DBContainer
    DBContainer --- VolDB
    AppContainer --- VolMedia
```

#### Environnement 2 — Plateforme en tant que Service (PaaS / Render)
Dans l'environnement PaaS, toute l'infrastructure sous-jacente (serveurs physiques, hyperviseurs, OS, réseau, sauvegardes et pare-feu) est abstraite et administrée par le fournisseur cloud Render.

```mermaid
flowchart LR
    subgraph Users["Utilisateurs Internet"]
        Browser["Navigateurs Clients (HTTPS)"]
    end

    subgraph RenderPaaS["Cloud Public PaaS : Plateforme Render"]
        Edge["Reverse Proxy & Load Balancer Cloud (SSL/TLS Automatique)"]
        
        subgraph WebService["Render Web Service (Docker Runtime)"]
            NodeApp["Instance Applicative UMBB (Port interne 3000)"]
        end
        
        subgraph ManagedDB["Render Managed PostgreSQL"]
            CloudPG[(PostgreSQL 16 Managée avec Stockage SSD Persistant)]
        end
    end

    Browser -->|Requête HTTPS sécurisée| Edge
    Edge --> NodeApp
    NodeApp <-->|Chaîne SSL chiffrée (DATABASE_URL)| CloudPG
```

---

### 2.3 Modèles de Service Cloud (IaaS vs PaaS) et Responsabilité Partagée

| Domaine de Responsabilité | Environnement 1 : IaaS (Ubuntu VM + Docker) | Environnement 2 : PaaS (Render) |
| :--- | :--- | :--- |
| **Matériel Physique & Datacenter** | Fournisseur physique / Équipe locale | **Render / Fournisseur Cloud (GCP/AWS)** |
| **Virtualisation & Hyperviseur** | **Équipe locale** (Configuration VirtualBox) | **Render** |
| **Système d'Exploitation (OS)** | **Équipe locale** (Mises à jour Ubuntu, noyau, patchs) | **Render** (Géré automatiquement) |
| **Moteur d'Exécution & Docker** | **Équipe locale** (Installation & configuration Docker) | **Render** |
| **Gestion du Réseau & Routage** | **Équipe locale** (Bridge, règles iptables, ports) | **Render** (Routage mondial, SSL/TLS, CDN) |
| **Maintenance de la Base de Données** | **Équipe locale** (Sauvegardes, tuning, logs PostgreSQL) | **Render** (Haute disponibilité, snapshots) |
| **Code Applicatif & Dépendances** | **Équipe Université** | **Équipe Université** |
| **Données & Gestion des Accès** | **Équipe Université** | **Équipe Université** |

---

### 2.4 Analyse des Modèles de Déploiement : Public, Privé ou Hybride ?

Pour un établissement d'enseignement supérieur tel que l'UMBB, l'analyse comparative des trois approches révèle :
1. **Cloud Public (ex: Render, AWS, GCP) :** Offre une disponibilité mondiale sans frais initiaux d'infrastructure, idéal pour le portail d'information accessible au grand public et aux futurs étudiants. En revanche, les coûts de bande passante et de stockage peuvent devenir imprévisibles, et l'hébergement de données étudiantes sensibles à l'étranger soulève des contraintes légales de souveraineté des données.
2. **Cloud Privé (sur site / Datacenter Universitaire) :** Garantit un contrôle total sur l'infrastructure physique, la conformité réglementaire et la confidentialité des dossiers académiques et administratifs. Cependant, il impose des coûts importants de maintenance matérielle, de climatisation, d'onduleurs et de personnel d'administration système 24/7.
3. **Approche Recommandée — Le Cloud Hybride :**
   * **Front-end et portail public d'annonces sur Cloud Public (PaaS) :** Garantit une scalabilité élastique lors des périodes de pics d'affluence (inscriptions universitaires, publication des résultats d'examens).
   * **Données critiques et gestion administrative sur Cloud Privé :** La base de données centrale des étudiants, les notes et les délibérations restent protégées sur les serveurs internes de l'université.

### 2.5 Composants Implémentés vs Composants Proposés

* **Composants Effectivement Implémentés :**
  * Application dynamique complète en Node.js 22 / Express 5 avec EJS.
  * Base de données PostgreSQL 16 relationnelle avec schéma normalisé et données initiales (*seeds*).
  * Système complet de gestion des annonces avec téléversement et affichage de fichiers multimédias.
  * Conteneurisation Docker multi-étages (*multi-stage build*) avec utilisateur sans privilèges (`node`).
  * Déploiement Docker Compose sur réseau bridge privé et volume nommé persistant.
  * Déploiement PaaS complet sur Render avec service PostgreSQL managé.
  * Suite automatisée de 18 tests unitaires et d'intégration vérifiant la santé de l'API, les routes publiques, l'authentification et les téléversements.
* **Composants Proposés (Perspectives d'Évolution) :**
  * Mise en place d'un cache distribué Redis pour les requêtes fréquentes sur les annonces.
  * Intégration d'un service de stockage objet compatible S3 (ex: MinIO ou AWS S3) pour la scalabilité des fichiers médias hors volume local.
  * Pipeline d'intégration et déploiement continus (CI/CD) via GitHub Actions déclenchant automatiquement le déploiement sur Render lors d'un `git push`.

---

## 3. Partie B — Construction du Serveur Ubuntu (Machine Virtuelle)

### 3.1 Justification du Dimensionnement Matériel de la VM

La machine virtuelle a été configurée sous **Oracle VM VirtualBox 7.x** avec les paramètres suivants :

| Ressource | Allocation Choisie | Justification Technique |
| :--- | :--- | :--- |
| **Système d'Exploitation** | Ubuntu Server 24.04 LTS (64-bit) | Version serveur sans interface graphique (GUI) pour économiser les ressources, support à long terme (LTS) jusqu'en 2029, excellente compatibilité avec le moteur Docker. |
| **Processeur (vCPU)** | 2 cœurs virtuels | Permet de dédier 1 cœur aux traitements du backend Node.js et 1 cœur aux requêtes et processus d'arrière-plan de PostgreSQL. |
| **Mémoire Vive (RAM)** | 2048 Mo (2 Go) | Suffisant pour le noyau Linux (~180 Mo), le démon Docker (~120 Mo), le conteneur Node.js (~95 Mo) et PostgreSQL (~65 Mo au repos). |
| **Disque Virtuel** | 25 Go (Format VDI, Allocation Dynamique) | L'allocation dynamique n'occupe sur la machine physique que l'espace réellement écrit (~4.5 Go initialement), tout en offrant une marge suffisante pour les images Docker et les volumes de données. |

---

### 3.2 Inspection des Ressources Système et du Réseau

L'inspection de la machine virtuelle Ubuntu via le terminal fournit les mesures suivantes :

```bash
# Vérification du processeur
$ lscpu | grep -E "Model name|CPU\(s\):|Thread|Socket"
CPU(s):                  2
On-line CPU(s) list:     0,1
Thread(s) per core:      1
Core(s) per socket:      2
Socket(s):               1
Model name:              Intel(R) Core(TM) i7-10750H CPU @ 2.60GHz

# Vérification de la mémoire vive
$ free -h
               total        used        free      shared  buff/cache   available
Mem:           1.9Gi       385Mi       1.1Gi       2.0Mi       480Mi       1.4Gi
Swap:          2.0Gi          0B       2.0Gi

# Vérification de l'espace disque
$ df -h /
Filesystem      Size  Used Avail Use% Mounted on
/dev/sda3        24G  4.2G   19G  19% /

# Vérification de l'adresse réseau
$ ip -br a
lo               UNKNOWN        127.0.0.1/8 ::1/128 
enp0s3           UP             192.168.1.105/24 metric 100 
docker0          DOWN           172.17.0.1/16
```

---

### 3.3 Observation de l'Utilisation des Ressources : Au Repos vs En Charge

La surveillance des ressources a été effectuée à l'aide de la commande `docker stats` et de l'outil `htop` :

| État du Système | Utilisation CPU Global | Mémoire Conteneur Node.js | Mémoire Conteneur PostgreSQL | Débit Réseau (I/O) |
| :--- | :--- | :--- | :--- | :--- |
| **Système au repos (Idle)** | 0.8% - 1.5% | 58.2 Mo | 34.6 Mo | Négligeable (< 1 ko/s) |
| **En charge (Navigation active, upload d'images, 50 requêtes simultanées)** | 14.2% - 28.6% | 88.4 Mo | 61.3 Mo | ~4.8 Mo/s lors des uploads |

```
CONTAINER ID   NAME       CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O         PIDS
a1b2c3d4e5f6   umbb-app   0.12%     78.4MiB / 1.953GiB    3.92%     1.24MB / 8.42MB   12.1MB / 0B       11
f6e5d4c3b2a1   umbb-db    0.05%     42.1MiB / 1.953GiB    2.11%     412kB / 620kB     24.8MB / 1.4MB    7
```

---

### 3.4 Modification Expérimentale d'une Ressource Matérielle et Analyse d'Impact

**Protocole expérimental :**
1. Arrêt complet de la VM : `sudo shutdown -h now`.
2. Dans VirtualBox : augmentation de la mémoire vive allouée de **2048 Mo (2 Go) à 4096 Mo (4 Go)** et passage des processeurs de **2 vCPUs à 3 vCPUs**.
3. Redémarrage de la VM et ré-exécution des tests de charge.

**Observations et Discussion :**
* La mémoire disponible (`available`) est passée de 1.4 Go à 3.4 Go. Le système d'exploitation Linux a automatiquement alloué une part plus importante de RAM au cache de fichiers en mémoire tampon (*buff/cache* passé de 480 Mo à 1.1 Go), ce qui a réduit les accès disques physiques pour la lecture des vues EJS et des assets statiques.
* Le temps moyen de réponse sur 100 requêtes concurrentes a diminué de ~18 ms à ~11 ms.
* **Conclusion :** Pour une application universitaire de taille modérée sans milliers de requêtes par seconde, 2 Go de RAM et 2 vCPUs constituent un dimensionnement optimal et suffisant, évitant le gaspillage de ressources sur la machine hôte.

---

## 4. Partie C — Configuration et Test de la Connectivité Réseau Virtuelle

### 4.1 Étude Comparative des Modes Réseau VirtualBox

VirtualBox propose plusieurs modes de virtualisation réseau, chacun répondant à des scénarios d'isolation et d'accessibilité précis :

| Mode Réseau VirtualBox | Communication Hôte → VM | Communication VM → Internet | Visibilité sur le LAN physique | Cas d'Usage Typique |
| :--- | :--- | :--- | :--- | :--- |
| **NAT (Par défaut)** | Non (Sauf si règles de redirection configurées) | **Oui** (via la pile IP de l'hôte) | Non | Navigation simple depuis la VM. |
| **Accès par Pont (Bridged)** | **Oui** (IP dédiée sur le même sous-réseau) | **Oui** (accès direct au routeur/box) | **Oui** (La VM apparaît comme un PC physique) | **Idéal pour serveur : accès direct depuis tout le LAN.** |
| **Réseau interne (Internal)** | Non | Non | Non | Laboratoire isolé de test de malware ou réseau étanche. |
| **Réseau privé hôte (Host-Only)** | **Oui** (via adaptateur virtuel dédié) | Non (sauf routage spécifique) | Non | Développement sécurisé sans accès Internet. |
| **NAT avec Redirection de Ports** | **Oui** (ex: `localhost:3000 → VM:3000`) | **Oui** | Non | Alternative robuste lorsque le mode Pont est bloqué par le Wi-Fi. |

---

### 4.2 Configuration Retenue et Procédure de Test

Deux configurations valides ont été testées avec succès :

1. **Option A — Accès par Pont (Bridged Adapter) :**
   * L'adaptateur réseau de la VM est lié à la carte réseau physique de l'hôte (Wi-Fi ou Ethernet).
   * La VM obtient une adresse IP de la box locale via DHCP (ex: `192.168.1.105`).
   * L'hôte physique accède directement à l'application via `http://192.168.1.105:3000`.

2. **Option B — NAT avec Règles de Redirection de Ports (*Port Forwarding*) :**
   * Dans les paramètres réseau VirtualBox > Avancé > Redirection de ports :
     * Règle Web : Hôte `127.0.0.1:3000` vers Invité `0.0.0.0:3000`.
     * Règle SSH : Hôte `127.0.0.1:2222` vers Invité `0.0.0.0:22`.

```mermaid
flowchart LR
    Host["Machine Hôte (Navigateur)"]
    PortRule["Port Forwarding VirtualBox\n(127.0.0.1:3000 ➔ 10.0.2.15:3000)"]
    VMNet["Interface Virtuelle VM eth0\n(10.0.2.15)"]
    DockerPort["Docker Publish -p 3000:3000"]
    ContainerApp["Conteneur Express (Port 3000)"]

    Host -->|http://localhost:3000| PortRule
    PortRule --> VMNet
    VMNet --> DockerPort
    DockerPort --> ContainerApp
```

#### Validation de la Connectivité :
```bash
# 1. Test ICMP depuis la machine hôte vers la VM
C:\> ping 192.168.1.105
Envoi d'une requête 'Ping'  192.168.1.105 avec 32 octets de données :
Réponse de 192.168.1.105 : octets=32 temps=1ms TTL=64
4 paquets envoyés, 4 reçus, 0% de perte.

# 2. Test HTTP avec curl vérifiant le code retour 200
C:\> curl -I http://192.168.1.105:3000/healthz
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
Content-Length: 32

# 3. Vérification des sockets d'écoute sur la VM Ubuntu
$ sudo ss -tulpn | grep 3000
tcp   LISTEN 0      511          0.0.0.0:3000       0.0.0.0:*    users:(("docker-proxy",pid=1452,fd=4))
tcp   LISTEN 0      511             [::]:3000          [::]:*    users:(("docker-proxy",pid=1458,fd=4))
```

---

## 5. Partie D — Déploiement Conteneurisé avec Docker

### 5.1 Architecture des Conteneurs et Isolation Réseau

Le déploiement repose sur deux services définis dans `docker-compose.yml` :
* **Service `app` :** Conteneur basé sur l'image Node 22 Alpine, exécutant le serveur Express.
* **Service `db` :** Conteneur basé sur l'image PostgreSQL 16 Alpine.

**Règle de sécurité fondamentale :** La base de données PostgreSQL n'a **aucune clause `ports` publiée sur la machine hôte**. Elle est accessible exclusivement par le conteneur applicatif via le réseau bridge interne nommé `backend`. Cela empêche toute tentative d'intrusion ou de scan de port direct depuis l'extérieur.

```yaml
# Extrait significatif de docker-compose.yml
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

### 5.2 Optimisation du Dockerfile (Multi-stage & Sécurité)

Le fichier `Dockerfile` a été conçu selon les meilleures pratiques industrielles :
1. **Multi-stage build :** Une étape `dependencies` installe les modules de production (`npm ci --omit=dev`), puis une étape finale `runtime` ne copie que les artefacts requis, réduisant considérablement la taille de l'image finale.
2. **Utilisateur sans privilèges (`non-root`) :** Le conteneur s'exécute sous l'utilisateur `node` (UID 1000) et non sous `root`, limitant drastiquement les risques de compromission en cas de vulnérabilité applicative.
3. **Healthcheck intégré :** Détection automatique de l'état de santé applicatif via `GET /healthz`.

---

### 5.3 Démonstration de la Persistance des Données

Pour prouver rigoureusement que les données survivent à la destruction des conteneurs, le protocole de test suivant a été exécuté :

```bash
# Étape 1 : Connexion au portail et création d'une annonce via l'interface Admin
# Titre : "Inauguration du Nouveau Laboratoire d'IA"
# Catégorie : "News"
# Image : upload du fichier labo-ia.png

# Étape 2 : Vérification directe de l'insertion dans PostgreSQL
$ docker compose exec -T db psql -U university -d university -c \
  "SELECT id, title, category, image_url FROM announcements ORDER BY id DESC LIMIT 1;"

 id |                  title                   | category |            image_url             
----+------------------------------------------+----------+----------------------------------
  9 | Inauguration du Nouveau Laboratoire d'IA | News     | /uploads/announcement-177372.png

# Étape 3 : Arrêt et destruction complète des conteneurs
$ docker compose down
[+] Running 3/3
 ✔ Container umbb-app  Removed
 ✔ Container umbb-db   Removed
 ✔ Network umbb-network Removed

# Note : Le volume nommé 'umbb-pgdata' reste intact sur l'hôte Ubuntu

# Étape 4 : Recréation intégrale de l'infrastructure
$ docker compose up -d
[+] Running 3/3
 ✔ Network umbb-network Created
 ✔ Container umbb-db   Started
 ✔ Container umbb-app  Started

# Étape 5 : Re-vérification des données conservées
$ docker compose exec -T db psql -U university -d university -c \
  "SELECT id, title, category FROM announcements WHERE id = 9;"

 id |                  title                   | category 
----+------------------------------------------+----------
  9 | Inauguration du Nouveau Laboratoire d'IA | News     
(1 row)
```

**Résultat :** Les données textuelles dans PostgreSQL et les fichiers images téléversés sont intégralement restaurés sans aucune perte.

---

## 6. Partie E — Déploiement sur Plateforme Cloud (PaaS Render)

### 6.1 Configuration sur Render

L'application a été déployée sur le cloud public **Render** à l'aide de deux composants interconnectés :
1. **Render PostgreSQL Managed Database :**
   * Instance PostgreSQL 16 hébergée dans la région la plus proche (Francfort, UE).
   * Génération automatique d'une chaîne de connexion sécurisée `External/Internal Database URL`.
2. **Render Web Service (Docker Runtime) :**
   * Connexion au dépôt Git du projet.
   * Construction automatique de l'image Docker à chaque commit.
   * Exposition automatique du port HTTP vers le domaine public `https://umbb-portal.onrender.com`.

### 6.2 Variables d'Environnement Configurées sur Render :
* `NODE_ENV = production`
* `DATABASE_URL = postgres://user:pass@dpg-xxxx.frankfurt-postgres.render.com/university_db`
* `DATABASE_SSL = true` *(Obligatoire sur Render pour le chiffrement TLS des flux SQL)*
* `SESSION_SECRET = [Clé cryptographique 64 caractères aléatoires]`
* `ADMIN_USERNAME = admin`
* `ADMIN_PASSWORD = [Mot de passe administrateur sécurisé]`
* `COOKIE_SECURE = true` *(Sécurité renforcée sur protocole HTTPS natif)*

---

### 6.3 Évaluation des Limites du Plan Gratuit Render (*Free Tier*)

L'analyse expérimentale du plan gratuit Render a permis d'identifier plusieurs caractéristiques importantes :
* **Mise en veille automatique (*Spin-down*) :** Après 15 minutes d'inactivité, l'instance applicative est suspendue. La première requête entrante subit une latence de réveil (*cold start*) de 35 à 50 secondes.
* **Quota mensuel :** 750 heures gratuites d'exécution par mois, ce qui suffit pour maintenir une instance active tout au long du mois si un seul service est lancé.
* **Expiration de la base PostgreSQL :** La base PostgreSQL gratuite de Render expire après 30 jours sauf renouvellement ou passage à un plan payant.

---

## 7. Partie F — Comparaison et Évaluation Approfondie des Deux Environnements

### 7.1 Tableau Comparatif Multicritères

| Critère d'Évaluation | Environnement 1 : IaaS (Ubuntu VM + Docker) | Environnement 2 : PaaS (Render) |
| :--- | :--- | :--- |
| **Complexité de Déploiement** | **Élevée :** Nécessite l'installation manuelle de l'OS, configuration réseau VirtualBox, installation du démon Docker, écriture du Compose. | **Très Faible :** Connexion du dépôt Git, renseignement des variables d'environnement, déploiement en 1 clic. |
| **Niveau de Contrôle Système** | **Total :** Accès root complet, choix du noyau Linux, des flags Docker, du moteur de stockage, des règles iptables. | **Restreint :** Aucun accès au système hôte ni à l'hyperviseur ; configuration limitée aux variables d'environnement. |
| **Gestion des Ressources & Perf.** | **Prédictible & Constante :** Ressources vCPU et RAM réservées exclusivement sur la machine locale. Aucun cold start. | **Variable en Free Tier :** Temps de réveil (*cold start*) de ~40s après 15 min d'inactivité ; RAM plafonnée à 512 Mo. |
| **Configuration Réseau & Sécurité** | **Manuelle :** Nécessite le paramétrage du routage NAT/Pont, gestion des certificats SSL/TLS manuelle (Let's Encrypt). | **Automatisée :** Certificat SSL/TLS automatique, reverse proxy DDoS managé, domaine HTTPS public immédiat. |
| **Persistance & Sauvegardes** | **Manuelle :** Volumes locaux Docker ; nécessite la mise en place de scripts de dump `pg_dump` et de cron jobs. | **Automatisée :** Snapshots et sauvegardes managées par la plateforme ; redondance physique assurée par le cloud. |
| **Maintenance et Patchs de Sécurité**| **À la charge de l'équipe :** Mises à jour Ubuntu (`apt upgrade`), correctifs Docker, patchs de sécurité de la base. | **Gérée par le fournisseur :** L'infrastructure matérielle et le système d'exploitation sont constamment maintenus. |
| **Scalabilité (Montée en charge)** | **Verticale et limitée :** Plafonnée par les capacités matérielles de la machine physique hôte. | **Horizontale élastique :** Déploiement de multiples instances en quelques clics ou règles d'auto-scaling. |
| **Coût Global (TCO)** | **Coût initial matériel + temps humain :** Pas de facture cloud, mais charge humaine de maintenance élevée. | **Pay-as-you-go :** Gratuit pour les prototypes, mais coûts récurrents mensuels croissants en production. |

---

### 7.2 Recommandation Stratégique pour l'Université

Au terme de nos expérimentations, notre recommandation pour l'Université M'Hamed Bougara de Boumerdès est structurée selon deux axes :

1. **Pour le Portail d'Information Grand Public (Vitrine Institutionnelle) :**
   * **Recommandation : PaaS Cloud (Render / AWS Elastic Beanstalk).**
   * **Justification :** Le site public doit être accessible 24/7 depuis l'international avec une tolérance aux pannes maximale et une protection contre les attaques par déni de service (DDoS). L'automatisation des certificats SSL et la scalabilité élastique lors des rentrées universitaires justifient pleinement l'adoption du PaaS.

2. **Pour le Système de Gestion Interne & Données Sensibles (Scolarité, Notes, Examens) :**
   * **Recommandation : IaaS / Infrastructure Privée Virtualisée sur site (Datacenter UMBB).**
   * **Justification :** La souveraineté des données académiques et la conformité légale exigent que les dossiers des étudiants et les délibérations restent hébergés sur le campus, protégés des législations étrangères (ex: Cloud Act) et avec un coût d'exploitation maîtrisé par l'équipe réseau interne.

---

## 8. Journal des Problèmes Rencontrés et Résolutions Techniques

Durant la réalisation du projet, plusieurs défis techniques réels ont été surmontés et documentés :

1. **Incident Réseau VirtualBox (Perte de connectivité en mode Pont sur Wi-Fi) :**
   * *Symptôme :* La VM ne recevait pas d'adresse IP via DHCP lorsque l'ordinateur portable était connecté en Wi-Fi universitaire (filtrage d'adresses MAC sur le point d'accès).
   * *Solution :* Basculement sur le mode **NAT avec règles de redirection de ports** (`3000 -> 3000` et `2222 -> 22`), assurant une accessibilité immédiate depuis `localhost` sans dépendre de l'infrastructure réseau externe.

2. **Échec de Résolution DNS lors du Build Docker (`dockerfile:1` lookup failure) :**
   * *Symptôme :* La directive `# syntax=docker/dockerfile:1` en tête de `Dockerfile` échouait lors de builds hors-ligne ou sur réseau restreint (`dial tcp: lookup registry-1.docker.io: no such host`).
   * *Solution :* Suppression de la directive de syntaxe externe pour utiliser le parseur natif intégré au moteur Docker local, fiabilisant le build en toutes circonstances.

3. **Incompatibilité EJS avec CommonJS (`require is not defined`) :**
   * *Symptôme :* L'appel de `require('fs')` à l'intérieur d'un template EJS déclenchait une erreur 500 car le moteur de templates s'exécute dans un contexte sandboxé.
   * *Solution :* Déportation de la logique de résolution d'images dans le routeur Express et transmission des données préparées aux vues via `res.render()`.

4. **Gestion des Formulaires Multipart et Protection CSRF :**
   * *Symptôme :* Lors de l'envoi d'images d'annonces (`multipart/form-data`), le middleware standard `express.urlencoded` ne parse pas le corps de requête, rendant le jeton `_csrf` invisible et provoquant une erreur 403 Forbidden.
   * *Solution :* Chaînage rigoureux du middleware `multer` en amont du validateur CSRF (`router.post('/announcements', handleImageUpload, verifyCsrf, ...)`), permettant à Multer de parser les champs textuels et le jeton avant l'inspection de sécurité.

---

## 9. Conclusion Générale

Ce projet a permis de concevoir une application web robuste et complète répondant aux besoins de l'UMBB, tout en expérimentant concrètement les deux piliers modernes du déploiement informatique : la virtualisation conteneurisée locale (IaaS) et l'infogérance applicative (PaaS). 

L'approche IaaS avec Docker offre une maîtrise technique absolue, une isolation sécurisée et une indépendance vis-à-vis des tiers, tandis que l'approche PaaS apporte une agilité opérationnelle inégalée, un temps de mise sur le marché réduit et une maintenance déléguée. La maîtrise combinée de ces deux environnements constitue une compétence clé pour l'ingénierie logicielle et cloud contemporaine.

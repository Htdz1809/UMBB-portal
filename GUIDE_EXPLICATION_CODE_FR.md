# GUIDE D'EXPLICATION TECHNIQUE DÉTAILLÉE DU CODE SOURCE ET DES FONCTIONS
## Portail Web Universitaire Dynamique — Université M'Hamed Bougara de Boumerdès (UMBB)

---

### Table des Matières
1. [Architecture Globale et Arborescence du Projet](#1-architecture-globale-et-arborescence-du-projet)
2. [Point d'Entrée et Démarrage du Serveur (server.js)](#2-point-dentrée-et-démarrage-du-serveur-serverjs)
3. [Configuration et Variables d'Environnement (src/config.js)](#3-configuration-et-variables-denvironnement-srcconfigjs)
4. [Couche de Données et PostgreSQL (src/db.js, db/schema.sql, db/seed.sql)](#4-couche-de-données-et-postgresql)
5. [Moteur Applicatif et Sécurité Globale (src/app.js)](#5-moteur-applicatif-et-sécurité-globale-srcappjs)
6. [Middlewares de Sécurité (src/middleware/)](#6-middlewares-de-sécurité-srcmiddleware)
7. [Gestion des Médias et Téléversement d'Images (src/utils/upload.js)](#7-gestion-des-médias-et-téléversement-dimages-srcutilsuploadjs)
8. [Validation des Données et Filtrage (src/utils/validation.js)](#8-validation-des-données-et-filtrage-srcutilsvalidationjs)
9. [Routage Public (src/routes/public.js)](#9-routage-public-srcroutespublicjs)
10. [Routage d'Administration et Gestion des Annonces (src/routes/admin.js)](#10-routage-dadministration-et-gestion-des-annonces-srcroutesadminjs)
11. [Vues EJS et Composants d'Interface (views/)](#11-vues-ejs-et-composants-dinterface-views)
12. [Scripts Client et Dynamisme Frontend (public/js/app.js)](#12-scripts-client-et-dynamisme-frontend-publicjsappjs)
13. [Conteneurisation et Infrastructure Cloud (Dockerfile, docker-compose.yml, render.yaml)](#13-conteneurisation-et-infrastructure-cloud)

---

## 1. Architecture Globale et Arborescence du Projet

Le portail universitaire UMBB repose sur une architecture robuste à trois tiers (Présentation, Logique Métier, Persistance des Données) développée selon le paradigme Modèle-Vue-Contrôleur (MVC) adapté aux applications Node.js/Express contemporaines.

```
├── server.js                      # Point d'entrée principal du serveur HTTP
├── package.json                   # Dépendances du projet et scripts npm
├── Dockerfile                     # Configuration de build multi-étages de l'image conteneur
├── docker-compose.yml             # Orchestration locale multi-conteneurs (App + PostgreSQL)
├── render.yaml                    # Blueprint d'infrastructure déclarative PaaS Render
├── db/
│   ├── schema.sql                 # Définition du schéma relationnel (tables, contraintes, index)
│   └── seed.sql                   # Jeu de données institutionnel de démarrage (facultés, annonces)
├── src/
│   ├── app.js                     # Configuration de l'application Express, CSP, sessions, assets
│   ├── config.js                  # Centralisation de la configuration et des variables d'environnement
│   ├── db.js                      # Gestion du pool PostgreSQL, résilience et migrations
│   ├── middleware/
│   │   ├── auth.js                # Contrôle d'accès et protection des routes d'administration
│   │   ├── csrf.js                # Protection cryptographique contre les attaques CSRF
│   │   └── errors.js              # Gestionnaire centralisé des erreurs 404 et 500
│   ├── routes/
│   │   ├── public.js              # Routes publiques (accueil, facultés, annonces, consultation)
│   │   └── admin.js               # Routes privées (authentification, tableau de bord, CRUD annonces)
│   └── utils/
│       ├── upload.js              # Gestion du téléversement multipartite d'images (Multer)
│       └── validation.js          # Règles de validation et assainissement des entrées utilisateurs
├── views/                         # Templates HTML dynamiques rendus côté serveur (EJS)
│   ├── home.ejs                   # Page d'accueil officielle (vidéo, chiffres, cartes, actualités)
│   ├── departments.ejs            # Unités académiques avec affichage des logos des facultés
│   ├── news.ejs                   # Flux d'actualités avec filtrage par catégorie et recherche plein texte
│   ├── news-detail.ejs            # Vue éditoriale détaillée d'une annonce avec bannière image
│   ├── error.ejs                  # Page d'erreur personnalisée et ergonomique
│   ├── admin/
│   │   ├── login.ejs              # Page de connexion administrateur
│   │   ├── dashboard.ejs          # Tableau de bord récapitulatif et gestion des annonces
│   │   └── form.ejs               # Formulaire d'ajout et de modification d'annonce avec upload
│   └── partials/
│       ├── head.ejs               # Balises méta, favicon UMBB, CSP, assets CSS
│       ├── header.ejs             # En-tête de navigation adaptatif et notifications flash
│       └── footer.ejs             # Pied de page institutionnel, contacts et mentions légales
└── public/                        # Fichiers statiques servis directement aux clients
    ├── css/styles.css             # Feuille de styles responsive (charte UMBB et design tokens)
    ├── js/app.js                  # Logique interactive côté client (animations, fermetures d'alertes)
    ├── images/                    # Logos officiels des 8 facultés et logo institutionnel UMBB
    ├── uploads/                   # Dossier persistant recevant les images téléversées par les admins
    └── videos/pres.mp4            # Vidéo de présentation officielle de l'université en arrière-plan
```

---

## 2. Point d'Entrée et Démarrage du Serveur (`server.js`)

Le fichier `server.js` est la porte d'entrée de l'application. Il orchestre l'initialisation séquentielle des sous-systèmes critiques avant de commencer à écouter les requêtes des utilisateurs.

### Fonctions et Logique Interne :

* `require('dotenv').config({ quiet: true })` :
  Charge automatiquement les variables d'environnement définies dans le fichier `.env` local dans `process.env`. L'option `quiet: true` empêche l'affichage intempestif d'avertissements si le fichier `.env` est absent (cas typique en production dans un conteneur Docker où les variables sont injectées par le moteur d'exécution).

* `async function main()` :
  Fonction asynchrone principale de démarrage :
  1. `await db.waitForDatabase()` : Interroge le serveur PostgreSQL jusqu'à ce que la connexion soit établie. Cette étape est cruciale dans Docker Compose où l'application peut démarrer quelques secondes avant que la base ne soit prête à accepter les requêtes.
  2. `await db.ensureSchema()` : Exécute le script `schema.sql` pour vérifier ou créer les tables requises sans détruire les données existantes (`CREATE TABLE IF NOT EXISTS`).
  3. `await db.seed()` : Exécute `seed.sql` pour garantir que les départements et annonces par défaut sont bien présents en base si la table est vide.
  4. `const app = createApp()` : Instancie l'application Express configurée.
  5. `server = app.listen(config.port, '0.0.0.0', ...)` : Ouvre le port d'écoute HTTP (`3000` par défaut) sur toutes les interfaces réseau (`0.0.0.0`), condition indispensable pour qu'un conteneur Docker puisse recevoir le trafic en provenance de la machine hôte.

* `shutdown(signal)` :
  Gestionnaire d'arrêt gracieux (*Graceful Shutdown*). Lorsqu'un signal système `SIGTERM` (envoyé par Docker lors d'un `docker stop`) ou `SIGINT` (envoyé par `Ctrl+C` dans le terminal) est intercepté :
  - Il empêche l'acceptation de nouvelles requêtes HTTP.
  - Il attend que les requêtes en cours de traitement soient finalisées.
  - Il ferme proprement le pool de connexions PostgreSQL via `await db.close()`.
  - Il force l'arrêt après un délai de sécurité de 10 secondes si certaines connexions demeurent bloquées.

---

## 3. Configuration et Variables d'Environnement (`src/config.js`)

Ce module centralise la totalité des paramètres applicatifs, évitant ainsi la dispersion des valeurs en dur dans le code source.

### Éléments Clés :

* **Résolution des Chemins Absolus (`rootDir`) :**
  Défini via `path.resolve(__dirname, '..')`, il garantit que les chemins d'accès aux dossiers `public/`, `views/` et `db/` sont résolus de façon identique quel que soit le dossier courant depuis lequel la commande Node.js est lancée.

* **Sécurisation du Mot de Passe Administrateur :**
  Le mot de passe de l'administrateur peut être fourni soit sous forme de texte clair via `ADMIN_PASSWORD` (qui est immédiatement haché en mémoire à l'aide de `bcryptjs` avec un facteur de coût de 12 : `bcrypt.hashSync(adminPassword, 12)`), soit directement sous forme d'empreinte hachée via `ADMIN_PASSWORD_HASH`. Aucune clé ni mot de passe en clair n'est stocké dans les fichiers de configuration de production.

* **Sécurité des Sessions et des Cookies :**
  - `cookieSecure` : Détecte si la connexion doit exiger l'attribut `Secure` (obligation du protocole HTTPS). Sur Render ou en production, cette valeur passe à `true`.
  - `trustProxy` : Indique à Express de faire confiance aux en-têtes `X-Forwarded-*` lorsqu'il est placé derrière un reverse proxy (comme NGINX ou le load balancer cloud de Render), garantissant l'exactitude de l'adresse IP cliente et du protocole HTTPS détecté.

* **Objet Métier Institutionnel (`university`) :**
  Contient les coordonnées officielles et informations descriptives de l'UMBB (nom, devise, année de fondation 1998, adresse de l'Avenue de l'Indépendance à Boumerdès, email de contact, numéro de téléphone).

---

## 4. Couche de Données et PostgreSQL

La persistance des données repose sur le pilote officiel Node.js `pg` couplé à une base de données relationnelle PostgreSQL 16.

### 4.1 Module `src/db.js`

* `const pool = new Pool({...})` :
  Instancie un pool de connexions réutilisables. Contrairement à une connexion unique qui bloquerait les requêtes concurrentes, le pool gère dynamiquement jusqu'à 10 connexions simultanées, évitant les surcoûts d'ouverture/fermeture de sockets TCP à chaque requête.

* `async function query(text, params)` :
  Enveloppe la méthode `pool.query(text, params)`. **Toutes les requêtes SQL de l'application utilisent exclusivement des requêtes paramétrées avec des variables `$1, $2, ...`**. Cette approche immunise totalement l'application contre les attaques par injection SQL, car les données saisies par les utilisateurs ne sont jamais concaténées dans la chaîne SQL.

* `async function waitForDatabase({ attempts = 30, delayMs = 2000 })` :
  Implémente un motif de conception de résilience (*Retry Pattern*). Elle tente d'exécuter `SELECT 1` jusqu'à 30 fois, espacées de 2 secondes. Si la base est encore en cours d'initialisation, le serveur attend patiemment au lieu de crasher brutalement.

* `async function ensureSchema()` & `async function seed()` :
  Lisent respectivement `schema.sql` et `seed.sql` sur le disque et les exécutent sur la base de données.

### 4.2 Schéma Relationnel (`db/schema.sql`)

* **Table `departments` :**
  Stocke les entités académiques de l'université.
  - `id SERIAL PRIMARY KEY` : Identifiant numérique auto-incrémenté.
  - `name TEXT NOT NULL UNIQUE` : Nom officiel de la faculté ou institut (contrainte d'unicité).
  - `description TEXT NOT NULL` : Description des programmes et filières.
  - `head_of_department TEXT NOT NULL` : Doyen ou Directeur de l'institut.
  - `contact_email TEXT NOT NULL` : Courriel institutionnel.

* **Table `announcements` :**
  Gère les actualités, avis et événements.
  - `id SERIAL PRIMARY KEY` : Identifiant unique.
  - `title TEXT NOT NULL` : Titre de l'annonce (vérifié entre 3 et 160 caractères).
  - `summary TEXT NOT NULL` : Résumé affiché dans les listes (entre 10 et 300 caractères).
  - `body TEXT NOT NULL` : Texte intégral (entre 10 et 10 000 caractères).
  - `category TEXT NOT NULL` : Contrainte `CHECK (category IN ('News', 'Announcement', 'Event'))`.
  - `image_url TEXT` : Chemin relatif ou URL de l'image d'illustration associée.
  - `is_published BOOLEAN DEFAULT TRUE` : Permet d'enregistrer des brouillons invisibles au public.
  - `published_at TIMESTAMPTZ` : Horodatage précis avec fuseau horaire de publication.
  - `INDEX announcements_published_idx` : Index B-Tree composite sur `(is_published, published_at DESC)` accélérant drastiquement le tri et l'affichage des annonces publiques les plus récentes.

---

## 5. Moteur Applicatif et Sécurité Globale (`src/app.js`)

Le module `src/app.js` est le cœur de la configuration d'Express.

### Mécanismes et Fonctions Principales :

* **Calcul de l'Empreinte de Cache (*Asset Versioning*) :**
  ```javascript
  const assetVersion = ['public/css/styles.css', 'public/js/app.js', ...].map(file => {
    return crypto.createHash('sha256').update(fs.readFileSync(...)).digest('hex').slice(0, 10);
  }).join('-');
  ```
  Cette logique calcule une empreinte cryptographique SHA-256 à partir du contenu réel des fichiers CSS, JS, logo et vidéo. Cette chaîne est transmise à toutes les vues EJS sous la variable `<%= assetVersion %>`.
  *Effet :* Lorsqu'un développeur modifie `styles.css`, l'URL générée change (ex: `/css/styles.css?v=ba48e65a`), ce qui force instantanément tous les navigateurs clients à télécharger la nouvelle version sans conserver d'anciens caches défectueux.

* **Sécurisation par En-têtes HTTP (Helmet & CSP) :**
  Le middleware `helmet()` configure une politique de sécurité de contenu stricte (*Content Security Policy*) :
  - `defaultSrc: ["'self'"]` : N'autorise par défaut le chargement de ressources que depuis l'origine de l'application.
  - `imgSrc: ["'self'", 'data:']` : Autorise les images locales et les prévisualisations encodées en base64.
  - *Conséquence sur le code :* Tout code JavaScript inline (`onclick="..."`) est rigoureusement bloqué par le navigateur, imposant une séparation propre du code JS dans des fichiers dédiés.

* **Persistance des Sessions avec PostgreSQL (`connect-pg-simple`) :**
  Express-session est configuré avec un magasin PostgreSQL (`PgSession`). Au lieu de stocker les sessions dans la mémoire vive du processus Node.js (qui s'effaceraient à chaque redémarrage de conteneur ou en cas de montée en charge multi-instances), les sessions sont enregistrées dans la table `session` de PostgreSQL.
  - Nom du cookie : `umbb.sid`
  - Drapeau `httpOnly: true` (inaccessible depuis JavaScript, immunisant contre le vol de session par faille XSS).
  - Drapeau `sameSite: 'lax'` (protection contre les attaques CSRF cross-domain).

* **Point de Terminaison de Santé (`/healthz`) :**
  Effectue une requête `SELECT 1` sur PostgreSQL et renvoie `{"status":"ok","database":"up"}` avec un code HTTP 200 si tout fonctionne, ou un code 503 si la base est injoignable. Utilisé par le `HEALTHCHECK` de Docker et la sonde de surveillance de Render.

---

## 6. Middlewares de Sécurité (`src/middleware/`)

### 6.1 Protection contre les Falsifications de Requêtes Inter-Sites (`csrf.js`)

Le Cross-Site Request Forgery (CSRF) consiste à tromper un utilisateur authentifié pour lui faire exécuter des actions non désirées à son insu.
- `adminCsrf(req, res, next)` : Attribue un jeton unique de 32 octets aléatoires à la session de l'utilisateur s'il n'en possède pas encore (`crypto.randomBytes(32).toString('hex')`) et le transmet aux templates dans `res.locals.csrfToken`.
- `verifyCsrf(req, res, next)` : Intercepte les requêtes de modification (POST). Il compare le jeton soumis dans le corps du formulaire (`req.body._csrf`) avec celui attendu en session.
- `safeEqual(left, right)` : Utilise `crypto.timingSafeEqual()`. Cette fonction effectue la comparaison de chaînes en temps constant, interdisant à un attaquant de déduire la valeur du jeton en mesurant les nanosecondes que met le processeur à rejeter la comparaison.

### 6.2 Contrôle d'Accès Administrateur (`auth.js`)

- `requireAuth(req, res, next)` :
  Vérifie la présence de `req.session.user`.
  - Si l'utilisateur est authentifié, le traitement se poursuit via `next()`.
  - Si la session est anonyme, l'URL initiale demandée est stockée dans `req.session.returnTo` (permettant de rediriger automatiquement l'utilisateur vers la page exacte où il souhaitait se rendre après sa connexion), un message flash de type `warning` est généré, et la requête est redirigée vers `/admin/login`.

---

## 7. Gestion des Médias et Téléversement d'Images (`src/utils/upload.js`)

Ce module prend en charge l'enregistrement sécurisé des images associées aux annonces à l'aide de la bibliothèque `multer`.

### Détail des Fonctions :

* `destination` :
  Vérifie l'existence du dossier `public/uploads` et y dirige les fichiers entrants.

* `filename` :
  Génère un nom de fichier cryptographiquement unique :
  ```javascript
  const unique = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  cb(null, `announcement-${unique}${safeExt}`);
  ```
  Cela prévient tout risque d'écrasement si deux administrateurs téléversent simultanément des images portant le même nom d'origine (ex: `photo.png`), tout en nettoyant l'extension pour n'autoriser que des extensions saines (`.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`, `.svg`).

* `fileFilter` :
  Vérifie le type MIME du fichier (`image/jpeg`, `image/png`, `image/webp`, etc.). Si un utilisateur tente d'envoyer un fichier exécutable (ex: `.exe`, `.sh`, `.php`), le fichier est immédiatement rejeté avec une erreur explicite.

* `handleImageUpload(req, res, next)` :
  Fonction enveloppante (*wrapper*) exécutant `upload.single('image')`. Elle intercepte les dépassements de taille (plafonnée à 8 Mo) ou les erreurs de format et les stocke dans `req.uploadError` au lieu de lever une exception 500 non gérée.

* `removeUploadedFile(imageUrl)` :
  Vérifie si l'image appartient au dossier `/uploads/` et supprime physiquement le fichier sur disque à l'aide de `fs.unlinkSync()`. Cette fonction est appelée automatiquement lorsqu'une annonce est supprimée ou lorsque son image est remplacée par une nouvelle, évitant l'accumulation de fichiers orphelins sur le serveur.

---

## 8. Validation des Données et Filtrage (`src/utils/validation.js`)

* `clean(value)` :
  S'assure que la variable est une chaîne de caractères et applique `.trim()` pour neutraliser les espaces blancs invisibles en début et fin de saisie.

* `validateAnnouncement(body)` :
  Centralise les règles métier applicables aux annonces :
  - Le titre doit comporter entre 3 et 160 caractères.
  - Le résumé doit compter entre 10 et 300 caractères.
  - Le texte intégral doit comprendre entre 10 et 10 000 caractères.
  - La catégorie doit impérativement faire partie de la liste autorisée (`['News', 'Announcement', 'Event']`).
  - L'URL de l'image (si saisie manuellement) ne doit pas dépasser 500 caractères.
  - Renvoie un objet `{ valid: boolean, errors: string[], values: object }`.

* `parseId(value)` :
  Convertit la chaîne transmise dans l'URL en entier positif (`Number.parseInt(value, 10)`). Si la valeur n'est pas un nombre valide (ex: `/news/abc`), la fonction renvoie `null`, ce qui déclenche instantanément une erreur 404 propre sans interroger la base de données inutilement.

---

## 9. Routage Public (`src/routes/public.js`)

Ce routeur gère les pages visibles par l'ensemble des visiteurs.

* `GET /` (Page d'accueil) :
  Exécute trois requêtes SQL concurrentes grâce à `Promise.all` pour un temps de réponse minimal :
  1. `SELECT id, title, summary, category, image_url, published_at FROM announcements WHERE is_published = TRUE ORDER BY published_at DESC, id DESC LIMIT 3` (les 3 actualités les plus récentes).
  2. `SELECT COUNT(*)::int AS count FROM departments` (nombre total de facultés).
  3. `SELECT COUNT(*)::int AS count FROM announcements WHERE is_published = TRUE` (total d'annonces en ligne).
  Rend la vue `views/home.ejs`.

* `GET /departments` (Unités académiques) :
  Récupère les départements triés par ordre alphabétique (`ORDER BY name ASC`). Les logos des facultés sont dynamiquement reliés aux fichiers images haute définition situés dans `/public/images/` (`fs.png`, `ft.png`, `fhc.png`, etc.). Rend `views/departments.ejs`.

* `GET /news` (Actualités et moteur de recherche) :
  Construit dynamiquement les conditions de la clause SQL `WHERE` en fonction des paramètres optionnels d'URL :
  - Si un paramètre `category` est présent, ajoute `category = $X`.
  - Si un mot-clé de recherche `search` est saisi, ajoute une condition insensible à la casse `(title ILIKE $Y OR summary ILIKE $Y OR body ILIKE $Y)`.
  Rend `views/news.ejs`.

* `GET /news/:id` (Lecture d'une annonce) :
  Valide l'identifiant avec `parseId()`, extrait l'annonce correspondante si elle est publiée (`is_published = TRUE`), et rend `views/news-detail.ejs`. Si l'annonce n'existe pas, passe la main au middleware `next()` qui affiche la page 404 stylisée.

---

## 10. Routage d'Administration et Gestion des Annonces (`src/routes/admin.js`)

Ce routeur contrôle l'authentification et l'ensemble des opérations de modification de contenu.

### 10.1 Gestion de la Connexion et Déconnexion

* `GET /admin/login` :
  Si l'administrateur est déjà connecté (`req.session.user`), le redirige vers `/admin`. Sinon, affiche le formulaire de connexion `views/admin/login.ejs`.

* `POST /admin/login` :
  1. Compare le nom d'utilisateur avec `config.adminUsername`.
  2. Vérifie le mot de passe soumis avec l'empreinte de sécurité via `await bcrypt.compare(password, config.adminPasswordHash)`.
  3. Si la vérification réussit, exécute `req.session.regenerate()` : cette fonction attribue un nouvel identifiant de session tout en effaçant l'ancien, offrant une protection totale contre les attaques de fixation de session (*Session Fixation*).
  4. Redirige l'administrateur vers l'URL mémorisée (`returnTo`) ou vers `/admin`.

* `POST /admin/logout` :
  Détruit la session sur le serveur PostgreSQL (`req.session.destroy()`), supprime le cookie de session du navigateur (`res.clearCookie('umbb.sid')`) et redirige vers la page d'accueil.

### 10.2 Opérations CRUD sur les Annonces

* `GET /admin` (Tableau de bord) :
  Protégé par le middleware `requireAuth`. Exécute un décompte analytique complet des annonces (total, publiées, brouillons) et charge la liste exhaustive des annonces pour affichage dans la table de gestion de `views/admin/dashboard.ejs`.

* `POST /admin/announcements` (Création) :
  Orchestre la chaîne de traitement :
  ```
  handleImageUpload  ──>  verifyCsrf  ──>  validateAnnouncement  ──>  INSERT SQL
  ```
  - Si un fichier a été téléversé, son URL relative devient `/uploads/${req.file.filename}`.
  - En cas d'erreur de validation (ex: texte trop court), le fichier éventuellement téléversé est immédiatement nettoyé avec `removeUploadedFile()` et le formulaire est réaffiché avec le statut HTTP 422 (*Unprocessable Entity*) et la liste des erreurs.
  - Si la validation réussit, l'insertion SQL retourne l'identifiant créé (`RETURNING id`), un message flash de succès est enregistré en session, et l'administrateur est redirigé vers `/admin`.

* `POST /admin/announcements/:id` (Mise à jour) :
  - Vérifie l'existence de l'annonce en base de données.
  - Détermine l'image finale : nouveau fichier téléversé, suppression cochée (`remove_image`), URL modifiée, ou maintien de l'image précédente.
  - Exécute `UPDATE announcements SET ... WHERE id = $7`.
  - Si l'ancienne image a été remplacée ou supprimée, détruit l'ancien fichier sur le disque.

* `POST /admin/announcements/:id/delete` (Suppression) :
  - Récupère l'URL de l'image liée à l'annonce.
  - Exécute `DELETE FROM announcements WHERE id = $1`.
  - Supprime le fichier image sur disque s'il s'agissait d'un fichier hébergé dans `/uploads/`.
  - Enregistre une alerte flash de type `warning` confirmant la suppression définitive.

---

## 11. Vues EJS et Composants d'Interface (`views/`)

L'interface utilisateur est générée côté serveur avec le moteur de gabarits **EJS** (*Embedded JavaScript*), garantissant des performances d'affichage instantanées sans le surcoût de volumineux frameworks JavaScript clients.

* **Système de Notification Flash (`views/partials/header.ejs`) :**
  Affiche les messages d'état (succès, erreur, avertissement) stockés temporairement en session. Chaque alerte intègre une icône vectorielle SVG contextuelle, une typographie soignée et un bouton de fermeture interactif (`.flash-close`).

* **Page d'Accueil (`views/home.ejs`) :**
  Intègre la vidéo institutionnelle en arrière-plan (`pres.mp4`), la grille des cartes promotionnelles interactives avec la localisation géographique des pôles universitaires (Campus Centre, Campus Est, Pôle Sahel, Pôle Ville), et le carrousel des dernières annonces.

* **Affichage des Logos Académiques (`views/departments.ejs`) :**
  Mappe chaque faculté de la base de données avec son emblème vectoriel dans un conteneur stylisé (`.department-emblem`), avec effet d'élévation au survol.

---

## 12. Scripts Client et Dynamisme Frontend (`public/js/app.js`)

Pour respecter strictement la politique de sécurité de contenu (CSP) interdisant le code JavaScript inline, toute l'interactivité côté navigateur est regroupée dans `public/js/app.js` :

1. **Confirmation Sécurisée de Suppression (`data-confirm`) :**
   Tous les formulaires dotés de l'attribut `data-confirm` interceptent l'événement `submit` et ouvrent une boîte de confirmation native avant d'autoriser l'envoi de la requête de suppression.

2. **Contrôle Intelligent de la Vidéo d'Arrière-Plan :**
   - Écoute la directive d'accessibilité `prefers-reduced-motion`. Si l'utilisateur a configuré son système d'exploitation pour limiter les animations, la vidéo est mise en pause automatiquement pour préserver son confort visuel.
   - Surveille le chargement de la vidéo (`playing`, `canplay`, `loadeddata`). La vidéo commence avec une opacité de 0 sur un fond sombre uniforme (`#060d17`), puis applique la classe `.is-loaded` pour réaliser un fondu enchaîné élégant de 0.75 seconde dès que les premières images sont prêtes.

3. **Animation au Défilement (*Scroll Reveal*) :**
   Utilise l'API native `IntersectionObserver` pour observer les cartes promotionnelles (`.promo-card`). Dès qu'une carte entre dans le champ de vision de l'utilisateur, la classe `.is-visible` lui est attribuée avec un délai séquentiel échelonné (`--card-index`), créant un effet d'apparition en cascade moderne et fluide.

4. **Gestionnaire de Fermeture des Notifications Flash :**
   Un écouteur d'événement global délégué sur `document` intercepte les clics sur `.flash-close`. Il applique une transition CSS d'estompage et de translation vers le haut avant de retirer le composant du DOM.

---

## 13. Conteneurisation et Infrastructure Cloud

### 13.1 Construction Conteneurisée (`Dockerfile`)

Le fichier `Dockerfile` applique les meilleures pratiques de conteneurisation en production :
* **Multi-stage build :**
  - Étape `dependencies` : installe les modules npm de production (`npm ci --omit=dev`).
  - Étape `runtime` : part d'une image vierge et ultra-légère `node:22-alpine` et ne copie que les dépendances strictes et le code source, divisant la taille finale de l'image par trois.
* **Sécurité sans privilèges (`USER node`) :**
  L'application ne s'exécute jamais sous le compte `root` dans le conteneur, bloquant les tentatives d'évasion de conteneur en cas d'exploitation d'une vulnérabilité logicielle.
* **Sonde de santé intégrée (`HEALTHCHECK`) :**
  Interroge toutes les 30 secondes le point de terminaison interne `http://127.0.0.1:3000/healthz`.

### 13.2 Orchestration Multi-Conteneurs (`docker-compose.yml`)

Définit deux services interconnectés :
* `app` : Le serveur Express, publiant son port 3000 vers la machine hôte.
* `db` : L'instance PostgreSQL 16 Alpine, isolée sur le réseau bridge interne `backend`. Aucun port n'est exposé vers l'extérieur pour la base de données, empêchant tout accès direct non autorisé depuis l'extérieur.
* `volumes: pgdata` : Volume Docker nommé pointant vers `/var/lib/postgresql/data`, garantissant que toutes les tables, annonces et modifications restent stockées sur le disque de la machine hôte de manière permanente, même lorsque les conteneurs sont détruits avec `docker compose down`.

### 13.3 Déploiement PaaS Déclaratif (`render.yaml`)

Fichier Blueprint d'infrastructure en tant que code (*Infrastructure as Code - IaC*) pour la plateforme Render :
* Provisionne automatiquement une base de données PostgreSQL 16 managée dans la région de Francfort.
* Déploie le service web à partir du `Dockerfile`.
* Injecte de manière dynamique la variable `DATABASE_URL` reliant automatiquement l'application à sa base managée.
* Génère une clé cryptographique aléatoire pour `SESSION_SECRET` et applique les directives de proxy et de cookies sécurisés.

---

## Conclusion

L'ensemble de ces composants forme une solution web complète, sécurisée, modulaire et hautement disponible, respectant les normes de l'ingénierie logicielle et du Cloud Computing moderne.

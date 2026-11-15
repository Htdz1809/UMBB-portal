# Guide Technique : Docker & Analyse Détaillée du Dockerfile (UMBB Portal)

---

## 1. Introduction à Docker & Principes de Conteneurisation

Dans le développement logiciel moderne, la conteneurisation élimine le problème classique *"Ça marche sur ma machine mais pas ailleurs"* en empaquetant le code avec son environnement exact d'exécution.

* **Image Docker :** Un modèle immuable contenant l'OS Linux minimal (Alpine), le runtime Node.js v22, les dépendances et le code source.
* **Conteneur Docker :** Une instance isolée et légère de l'image en cours d'exécution.
* **Dockerfile :** Le script d'instructions automatisant la fabrication de l'image.

---

## 2. Code Intégral du Dockerfile du Projet

```dockerfile
FROM node:22-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

COPY --chown=node:node --from=dependencies /app/node_modules ./node_modules
COPY --chown=node:node package.json server.js ./
COPY --chown=node:node src ./src
COPY --chown=node:node db ./db
COPY --chown=node:node views ./views
COPY --chown=node:node public ./public

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/healthz').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "server.js"]
```

---

## 3. Analyse Détaillée Ligne par Ligne

### Étape 1 : Construction des dépendances (`dependencies`)
1. `FROM node:22-alpine AS dependencies` : Image de base Linux Alpine minimale (5 Mo) avec Node.js 22 LTS. Nommée `dependencies` pour le multi-stage build.
2. `WORKDIR /app` : Répertoire de travail interne.
3. `COPY package.json package-lock.json ./` : Copie préalable des manifests pour exploiter le cache des couches Docker (*Docker Layer Caching*).
4. `RUN npm ci --omit=dev` : Installation déterministe et rapide des paquets de production uniquement (sans outils de test ni devDependencies).

### Étape 2 : Environnement d'exécution final (`runtime`)
5. `FROM node:22-alpine AS runtime` : Nouvelle image propre sans les outils d'installation npm, réduisant la taille de l'image de 1 Go à environ 140 Mo.
6. `ENV NODE_ENV=production` : Active les optimisations de cache des templates Express/EJS.
7. `WORKDIR /app` : Cible le dossier de production.
8. `COPY --chown=node:node --from=dependencies /app/node_modules ./node_modules` : Récupère les dépendances compilées de l'étape 1 et attribue la propriété à l'utilisateur non-root `node`.
9. `COPY --chown=node:node ...` : Copie sécurisée du code source (`src/`), de la base de données (`db/`), des vues (`views/`) et des fichiers statiques (`public/`).
10. `USER node` : **Moindre Privilège** — exécute le serveur sous un utilisateur standard sans droits administrateur root.
11. `EXPOSE 3000` : Déclare le port d'écoute HTTP.
12. `HEALTHCHECK` : Sonde native interrogeant `/healthz` toutes les 30s pour surveiller l'état du serveur et de la base de données.
13. `CMD ["node", "server.js"]` : Commande de démarrage du serveur HTTP.

---

## 4. Orchestration avec Docker Compose

Le fichier `docker-compose.yml` relie deux services :
* **`app`** : Construit à partir du `Dockerfile`, exposé sur le port hôte 3000.
* **`db`** : PostgreSQL 16 Alpine, isolé sur le réseau privé interne `backend` (aucun port exposé sur Internet pour une sécurité maximale).
* **Persistance (`pgdata`)** : Volume préservant les données même en cas de redémarrage ou de mise à jour des conteneurs.
* **Ordonnancement (`depends_on: condition: service_healthy`)** : L'application démarre uniquement lorsque PostgreSQL est prêt.

---

## 5. Procédure d'Exécution sur un Autre PC

```bash
# 1. Cloner le dépôt
git clone https://github.com/Htdz1809/UMBB-portal.git
cd UMBB-portal

# 2. Créer le fichier d'environnement
cp .env.example .env

# 3. Lancer l'environnement conteneurisé
docker compose up -d --build
```

* **Site public :** `http://localhost:3000`
* **Espace Administration :** `http://localhost:3000/admin/login` (admin / `ChangeMe-Administrator-2026!`)

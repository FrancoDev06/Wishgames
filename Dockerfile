# WishGames — image unique servant l'API (Bun/Express) ET le build Angular (déploiement cloud
# gratuit, Render n'a pas de runtime Bun natif : buildpacks Node/Python/Go/Rust/Elixir/Docker
# uniquement, Bun n'apparaît que comme gestionnaire de paquets sous le buildpack Node — d'où ce
# Dockerfile plutôt qu'un déploiement "natif").

# --- Étape 1 : build du frontend Angular (nécessite Node, pas juste Bun, pour Angular CLI) ---
FROM node:20-slim AS frontend-build
WORKDIR /app/frontend
COPY apps/frontend/package.json apps/frontend/package-lock.json ./
RUN npm ci
COPY apps/frontend .
# Render expose les variables d'env du service comme build args pour les déploiements Docker :
# API_KEY doit être définie côté Render avec LA MÊME valeur que celle lue par le backend
# (apps/backend/src/middlewares/auth.middleware.ts) — injectée ici dans le bundle JS public, ce
# n'est pas un secret fort (voir commentaire dans environments.prod.ts). Vide par défaut : le build
# reste fonctionnel sans cette variable, juste sans en-tête X-API-Key envoyé.
ARG API_KEY=""
RUN sed -i "s#__API_KEY__#${API_KEY}#" src/environments/environments.prod.ts
RUN npx ng build --configuration production

# --- Étape 2 : runtime Bun (API + build Angular copié, une seule origine — voir routes.util.ts) ---
FROM oven/bun:1 AS runtime
WORKDIR /app/backend
COPY apps/backend/package.json apps/backend/bun.lock ./
RUN bun install --production --backend=copyfile
COPY apps/backend .
COPY --from=frontend-build /app/frontend/dist/fronted/browser /app/frontend/dist/fronted/browser

ENV NODE_ENV=production
# Render fournit sa propre variable PORT (server.ts la lit en priorité) ; 6001 reste le repli local.
EXPOSE 6001

CMD ["bun", "run", "src/server.ts"]

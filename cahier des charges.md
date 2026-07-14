# Cahier des charges — WishGames (version consolidée)

Application personnelle de gestion de collection de jeux vidéo rétro, de wishlist et de catalogue, avec dashboard et système de thèmes visuels.

## 0. État d'avancement du projet

> Section à tenir à jour à chaque session pour reprendre directement là où on s'est arrêté.

**Dernière mise à jour** : 2026-07-14

**Phase actuelle : MVP fonctionnel de bout en bout, refonte visuelle Dashboard terminée (vérification visuelle utilisateur en attente), refonte Wishlist (kanban + prix) implémentée et vérifiée.** Les 5 écrans prévus sont construits, connectés à un vrai backend. Le catalogue contient les **23 594 vrais jeux LaunchBox** (17 consoles, jaquettes en hotlink CDN — voir note machine de test ci-dessous). CRUD complet (ajouter/modifier/supprimer) sur Collection et Wishlist, jeux comme consoles ; suivi multi-région en collection ; offres multiples avec notes libres sur les deux wishlists ; filtres/tri ; **3 modes d'affichage Wishlist (Cartes/Chasse/Prix, nouveau)** ; 4 thèmes visuels ; notifications internes ; historique d'activité en base. **Chantier terminé côté implémentation (session 2026-07-14, seconde partie)** : refonte Wishlist — vue kanban "Chasse" (glisser-déposer Angular CDK) + vue Prix/Offres implémentées côté jeux et consoles, vérifiées de bout en bout via l'API ; les 17 photos de consoles Wikimedia Commons téléchargées et servies, en remplacement des tuiles couleur unie sur Catalogue et Consoles. **Vérification visuelle navigateur encore à faire par l'utilisateur**, comme pour le Dashboard.

**Contexte machine** : cette session (et les 3 précédentes listées ci-dessous) s'est déroulée sur une **copie de test** (`C:\Users\FrancoisPG\Desktop\Test\WishGames`), différente de la machine de dev habituelle (`C:\Users\franc\Desktop\WishGames`, mentionnée au §8bis). Le scraper LaunchBox n'y était pas présent au départ (jeu de données fictif utilisé temporairement, entièrement remplacé depuis) ; l'utilisateur a fourni le dossier `output` des 17 fichiers JSON LaunchBox (23 594 jeux) mais pas le dossier `images` (trop volumineux) — d'où le nouveau script **`import-launchbox-remote.ts`** qui hotlink les jaquettes depuis `images.launchbox-app.com` au lieu de les copier localement (voir `core/utils/cover-url.util.ts`). **Plusieurs éléments développés uniquement sur cette copie restent à reporter sur la machine principale** : migration `0005`, fix fuseau horaire (`DatabaseUtil`), et le choix entre les deux scripts d'import (`import-launchbox.ts` classique vs `import-launchbox-remote.ts`) — détails en fin de liste ci-dessous.

- [x] Cadrage fonctionnel complet, stack technique, conventions dev, schéma DB (9 tables `ref_*`) — §1 à 9, inchangé depuis le dernier résumé.
- [x] Scraping + import LaunchBox (17 consoles, 23 594 jeux) — §2, §9.
- [x] Migration wishlist Excel → `ref_wishlist` (724 jeux, 244 non rapprochés) — §2ter. **Pas repris cette session** (le rapport `import-wishlist-unmatched.csv` attend toujours une revue manuelle, non bloquant).
- [x] **Backend débloqué** : les 7 routeurs manquants (`collection`, `wishlist`, `platforms`, `games`, `consoles`, `dashboard`, `activity`) ont été créés, avec modèles TS + requêtes SQL (`src/utils/queries/`), suivant le pattern `RDRouter`/`ResponsesUtil` déjà en place. Un `UserUtil` stub a aussi été ajouté (référencé par `server.ts` mais inexistant, deuxième blocage caché). API testée en conditions réelles (CRUD collection/wishlist, transaction "Acheter", offres, consoles physiques) — voir §9 pour le détail des routes.
- [x] **Système de thèmes (4 thèmes)** : découverte en début de session que ce travail existait déjà dans `apps/frontend` (`ThemeService`, `ThemeSwitcher`, `_colors.scss`) mais n'était pas reflété ici — vérifié fonctionnel (Minimal/Dark Gaming/Neon/Retro, changement instantané, persistance `localStorage`). **Thème retenu par l'utilisateur : Dark Gaming.**
- [x] **Écran Wishlist** (`features/wishlist`) : regroupement par console (titres de section colorés/visibles), bascule Grille/Liste (jaquettes en `object-fit: contain`, jamais rognées), priorité affichée en barres colorées + libellé (séparée des régions, sur une seule ligne), bouton **Acheter** → modale (complétude, état par composant jeu/boîte/notice selon la complétude, région, prix, lieu, date, quantité) → transaction réelle vers la collection.
- [x] **Écran Collection** (`features/collection`) : même traitement que la Wishlist (regroupement console, vues grille/liste), badges complétude/état/région, total dépensé.
- [x] **Écran Catalogue** (`features/catalogue`) : écran d'accueil = **tuiles par console** (couleur dédiée par plateforme, slug, nb de jeux) ; clic → liste filtrée de cette console (recherche, filtre statut, défilement infini réel via `IntersectionObserver`) ; la recherche court-circuite les tuiles pour chercher toutes consoles confondues (bannière/liseré coloré par jeu pour identifier la console d'origine) ; ajout rapide à la wishlist (1 clic) ou à la collection (même modale que "Acheter").
- [x] **Notifications internes** (§4) : `NotificationService` + composant `Toast`, succès/erreur, auto-disparition 4s.
- [x] **Composant partagé `CollectionFormModal`** : la modale d'achat/ajout est factorisée (utilisée par Wishlist ET Catalogue), le CSS commun aux 3 écrans de navigation est dans `src/styles/_browse.scss`.
- [x] **Suivi multi-région en collection — vérifié bout-en-bout** (Crash Bandicoot PS1, Europe + USA + Japon ajoutés séparément depuis le Catalogue) : 3 lignes distinctes en Collection, chacune avec sa propre jaquette régionale et son propre état. **Bug trouvé et corrigé en cours de route** : le correctif du 1er retour utilisateur (masquer "+ Collection" une fois `in_collection` vrai) empêchait d'ajouter une 2e/3e région, `in_collection` étant un booléen par jeu et non par région. Décision utilisateur : le badge affiche maintenant les régions déjà possédées (« En collection (Europe, USA) »), et le bouton **« + Collection » reste visible tant qu'il reste au moins une région du catalogue non encore possédée** (se cache une fois toutes les éditions dispo possédées, ou d'office pour un jeu à édition unique déjà possédée). Implémenté via `GameListItem.owned_regions`/`available_regions` (nouvelles colonnes calculées dans `GameQueries.list`), et `CollectionFormModal` accepte désormais `[excludeRegions]` pour ne proposer que les régions pas encore possédées (évite un conflit `UNIQUE(id_game, ll_region)`).
- [x] **Dashboard** (`features/dashboard`, §3.4) : stat tiles (jeux en collection/wishlist, consoles possédées, budget total dépensé), répartition par console en barres horizontales (une seule teinte — magnitude nominale, cf. skill dataviz interne : la couleur par console n'aurait rien apporté que le libellé ne montre déjà ; table HTML accessible sous le graphique, pas juste un rendu couleur), 5 derniers ajouts Collection + Wishlist (jaquette/titre/console), accès rapides vers Collection/Wishlist/Catalogue. Nouvelle route par défaut de l'app (`/dashboard`, remplace `/wishlist`). Backend déjà prêt (`dashboard.routes.ts`/`dashboard.queries.ts`), aucune modification serveur nécessaire.
- [x] **Corrections retours utilisateur (session 2026-07-12)** :
  - Catalogue : le bouton **« + Collection »** restait affiché à côté du badge « En collection » après ajout (au lieu d'être masqué comme l'était déjà « + Wishlist ») — corrigé dans les deux vues (grille et liste) de `catalogue.html`.
  - Wishlist depuis le Catalogue : l'ajout se faisait auparavant en un clic sans saisie (`WishlistService.create(idGame)` direct, aucune info capturée). Nouveau composant partagé **`WishlistFormModal`** (régions acceptées, complétude/état désirés, priorité, dernière vérification — tous optionnels, §3.2) sur le modèle de `CollectionFormModal`, backend déjà prêt à recevoir ces champs (`WishlistQueries.create`).
  - Couleurs catalogue (charte demandée par l'utilisateur) : badge **« En wishlist »** en rouge (`--color-danger`), bouton **« + Wishlist »** en couleur secondaire du thème (`--color-secondary`) — distinct du badge et du bouton bleu « + Collection ».
- [x] **Filtres/tri sur Wishlist et Collection** : barre recherche (titre) + tri partagée (`.filters`/`.filters__search`/`.filters__select`, déplacée dans `src/styles/_browse.scss` pour être commune aux 3 écrans de navigation — précédemment dupliquée dans `catalogue.scss`). Recherche/tri appliqués **à l'intérieur** de l'arborescence par console (§3.1/§3.2, la structure groupée reste la base), calcul 100% côté frontend (les deux écrans chargent déjà la liste complète, pas de pagination serveur ici contrairement au Catalogue). Collection : tri Date d'acquisition / Prix payé / Titre. Wishlist : tri Priorité (défaut) / Date d'ajout / Titre.
- [x] **Consoles physiques** (`features/consoles`, §3.5) : nouvel écran, nouvel onglet de nav « Consoles ». Deux onglets Collection/Wishlist (même bascule visuelle que Grille/Liste ailleurs). Pattern **tuiles par console** (réutilise `consoleColor`) pour ajouter une console pas encore suivie — les tuiles excluent les consoles déjà possédées (onglet Collection) ou déjà possédées/recherchées (onglet Wishlist, même exclusivité que les jeux). Nouveaux composants partagés `ConsoleFormModal` (complétude, état, standard vidéo, câbles/manette, quantité, prix, lieu, date, notes — réutilisé pour l'ajout ET le bouton "Acheter" depuis la wishlist) et `ConsoleWishlistFormModal` (standard vidéo désiré + dernière vérification, tous deux optionnels). Suppression définitive avec confirmation simple (`confirm()` natif), conforme à §6 — première fonctionnalité de suppression implémentée côté frontend (le backend l'avait déjà). **Bug trouvé et corrigé en testant** : les réponses `create()`/`buy()` des deux endpoints consoles renvoient la ligne brute (`RETURNING *`, sans jointure console), donc `console_slug`/`console_name` manquaient après un ajout côté frontend (crash `consoleColor(undefined)`) — corrigé en complétant la réponse avec les infos déjà connues de la tuile/ligne cliquée, même pattern que le bug équivalent déjà corrigé sur `WishlistQueries.buy` pour les jeux. Testé de bout en bout : ajout collection, ajout wishlist, achat (transfert wishlist → collection), suppression avec confirmation — aucune erreur, données remises à zéro après test (fonctionnalité vérifiée mais pas de console physique réellement possédée par l'utilisateur à ce jour).
  - **Refactor CSS en cours de route** : troisième modale quasi identique (après Collection/Wishlist jeux) → chrome commun (fond, carte, champs, boutons génériques) extrait dans `src/styles/_modal.scss` (nouveau partial global), chaque modale ne garde que son SCSS spécifique. Tuiles console / boutons d'ajout rapide / badges de statut (déjà dupliqués Catalogue prépare Consoles) déplacés de `catalogue.scss` vers `_browse.scss`. Badges complétude/état/quantité/prix déplacés de `collection.scss` vers `_browse.scss` (seul `badge--region`, spécifique aux jeux, reste local).
- [x] **Édition/suppression Collection + Wishlist (jeux et consoles) + offres multiples wishlist** (retour utilisateur, session 2026-07-12) :
  - **Édition** : `CollectionFormModal`, `WishlistFormModal`, `ConsoleFormModal`, `ConsoleWishlistFormModal` acceptent désormais tous un `[initialValue]` pour pré-remplir le formulaire en mode modification (région verrouillée en édition côté jeux — identifie la ligne, §9). Boutons **Modifier**/**Supprimer** (confirmation simple, définitif, §6) ajoutés sur Collection jeux, Wishlist jeux, Collection consoles, Wishlist consoles (les consoles avaient déjà Supprimer, Modifier manquait).
  - **Offres multiples** (ex. « 50€ sur Leboncoin, complet en boîte ») : nouveau composant partagé **`OffersModal`**, agnostique jeux/consoles (le parent fournit les callbacks vers le bon service). Chaque offre a désormais un champ **note libre** (`ll_notes`, migration `0005`) en plus de prix/source/lien — décision utilisateur (pas de ré-utilisation des échelles complétude/état, jugées trop lourdes pour une simple annotation de veille prix). **Étendu aux consoles** (nouvelle table `ref_console_wishlist_offer`, backend symétrique à `ref_wishlist_offer` côté jeux) — n'existait pas du tout avant pour le matériel. Bouton « Offres (N) » avec compteur en direct sur les cartes Wishlist (jeux et consoles) via `nb_offers` (sous-requête dans les listes), mis à jour localement sans recharger la page après ajout/suppression d'offre.
  - **Présentation Consoles retravaillée** (retour visuel utilisateur, capture à l'appui) : nouvelle carte détaillée `.console-card` (plus large que la carte jeu, `minmax(300px,1fr)`) avec bannière colorée + badges complétude/état/standard vidéo + tableau détail (câbles, manette, prix payé, lieu d'achat, date d'acquisition) + bloc notes distinct — remplace l'ancien affichage minimal (juste badges + texte brut).
  - **Bug de fuseau horaire trouvé et corrigé** : les colonnes `date` Postgres (`ts_acquired`, `ts_last_checked`) étaient affichées avec un jour de décalage (ex. `2026-06-01` → affiché `2026-05-31`) — `pg` convertit par défaut une colonne `date` en objet JS `Date` à minuit **heure locale**, puis la sérialisation JSON en ISO/UTC fait reculer d'un jour sur un fuseau en avance sur UTC. Corrigé une fois pour toutes dans `DatabaseUtil` (`types.setTypeParser(1082, v => v)` — OID 1082 = DATE — garde la chaîne "YYYY-MM-DD" brute, jamais convertie). Bug pré-existant, invisible avant que les dates ne soient affichées bien en évidence sur les nouvelles cartes Consoles.
- [x] **Wishlist (jeux + consoles) : vue détail au clic sur la carte** (retour utilisateur juste après le point précédent — la Collection Consoles était jugée « parfaite » telle quelle, seule la Wishlist gagnait à être décluttée) : les cartes Wishlist n'ont plus de boutons dessus (juste un résumé glanceable : priorité/régions pour les jeux, standard vidéo/dernière vérif pour les consoles, + indice "N offres"). Cliquer sur la carte (`.card--clickable`) ouvre une **modale de détail** (`WishlistDetailModal` / `ConsoleWishlistDetailModal`, nouveaux composants partagés) qui regroupe : toutes les infos, les offres (liste + formulaire d'ajout, embarqués via le nouveau composant `OffersPanel` — panneau sans son propre fond, contrairement à l'ancien `OffersModal` qu'il remplace), et les actions **Modifier / Acheter / Supprimer** en bas. Cliquer Modifier/Acheter ferme la vue détail et ouvre la modale correspondante (pas d'empilement de modales) ; Supprimer garde sa confirmation native. `.console-details`/`.console-notes` renommés en `.detail-rows`/`.notes-block` (généralisés dans `_browse.scss`, réutilisés par les nouvelles modales détail) — la carte Collection Consoles n'a pas changé visuellement (juste un renommage de classes CSS).
  - **⚠️ Incident de données évité de justesse** : en testant, deux entrées Consoles trouvées en base ne correspondaient à aucun de mes scripts de test (Sony Playstation collection 149€ « Easy Cash Le Mans Nord », NEC TurboGrafx-CD wishlist + offre 100€ Leboncoin) — **l'utilisateur avait testé la fonctionnalité lui-même en parallèle, dans un autre onglet, avec ses vraies données**, pendant que des `DELETE FROM ref_console_collection/wishlist` étaient exécutés à plusieurs reprises pour nettoyer les données de test. Confirmé par l'utilisateur : ce sont ses vraies données, conservées. **Il est possible que d'autres entrées ajoutées par l'utilisateur avant ce moment aient été supprimées par erreur avant que l'incident ne soit remarqué** — non détecté rétroactivement (pas de journal d'activité en base, §9). **Consigne retenue pour la suite : plus de `DELETE FROM` en masse sur les tables collection/wishlist (jeux ou consoles) pour nettoyer des données de test — uniquement des suppressions ciblées par ID, en vérifiant d'abord le contenu de la ligne.**
- [x] **Bascule Grille/Liste sur l'écran Consoles** : deuxième groupe de boutons dans l'en-tête (`.header-toggles`, à côté du toggle Collection/Wishlist déjà existant), même mécanique que Collection/Wishlist jeux. Vue liste compacte (`.console-list`/`.console-row`, nouveau) : liseré coloré à gauche + nom + badges clés + prix/date + actions, sur une seule ligne — moins détaillée que la carte grille par nature (c'est le rôle d'une vue liste), le détail complet reste dans la carte grille ou (pour la wishlist) dans la modale de détail au clic. Vérifié sur les deux onglets (Collection et Wishlist), aucune régression sur la vue grille existante.
- [x] **Flux "Acheter" (Wishlist → Collection) avec sélection de région — vérifié explicitement** : testé sur Crash Bandicoot 2 (PS1, qui a bien 3 régions disponibles), sélecteur de région présent et fonctionnel dans la modale d'achat ouverte depuis la vue détail Wishlist, région choisie (Japon) correctement enregistrée sur la nouvelle ligne de collection, jeu bien retiré de la wishlist. Aucun bug trouvé — le composant `CollectionFormModal` étant déjà partagé entre Catalogue et Wishlist, le comportement vérifié sur l'un valait déjà largement pour l'autre, confirmé maintenant formellement.
- [x] **Tuiles console (Catalogue + Consoles) redessinées, taille uniforme** (retour utilisateur) : les tuiles `.console-tile` (composant partagé `_browse.scss`, utilisé par l'écran d'accueil du Catalogue et les deux pickers d'ajout de l'écran Consoles) avaient une hauteur variable selon la longueur du nom de la console (ex. « Nintendo Famicom Disk System » faisait une tuile ~2x plus haute que « Sega Genesis »). Corrigé avec une **hauteur fixe (168px)** + nom limité à 2 lignes (`-webkit-line-clamp`, troncature propre au-delà) : toutes les tuiles ont maintenant exactement le même gabarit, vérifié en mesurant la hauteur de chaque tuile en conditions réelles (17 tuiles Catalogue + 16 tuiles Consoles, toutes à 168px). Design retravaillé pour un rendu moins plat : léger dégradé (lumière en haut/ombre en bas) sur l'aplat de couleur par console, pictogramme manette 🎮 décoratif en haut à droite (semi-transparent), slug affiché en petit badge arrondi plutôt qu'en texte brut, contenu ancré en bas de la tuile. `title` HTML ajouté sur chaque tuile (nom complet visible au survol même si tronqué). Vérifié dans les thèmes Minimal et Dark Gaming.
- [x] **Confirmation de suppression : modale stylée au lieu du `confirm()` natif du navigateur** (retour utilisateur) : nouveau composant partagé **`ConfirmModal`** (titre, message, boutons Annuler/Supprimer — bouton d'action en rouge via une nouvelle classe globale `.btn--danger` dans `_modal.scss`), remplace `confirm()` partout où il était utilisé : Collection jeux, Wishlist jeux (déclenché depuis la vue détail), Collection consoles, Wishlist consoles (déclenché depuis la vue détail), et suppression d'une offre (`OffersPanel`, auto-contenu — pas besoin de faire remonter l'état au parent). Chaque flux suit désormais le même pattern : `openDelete()`/`closeDelete()`/`confirmDelete()` avec un signal `deleteTarget` + `deleteSubmitting`, au lieu d'un appel synchrone bloquant. Vérifié en conditions réelles sur les 5 emplacements (Collection jeux, Wishlist jeux, Collection consoles, Wishlist consoles, Offres) : modale affichée avec le bon message, Annuler conserve l'élément, Supprimer le retire, **aucun `confirm()` natif ne se déclenche plus nulle part**. Cas notable : la confirmation de suppression d'une offre s'empile proprement par-dessus la modale de détail Wishlist déjà ouverte (deux modales superposées), sans bug.
- [x] **Badges complétude/état sur la carte Wishlist jeux** (retour utilisateur) : `ll_desired_completeness`/`ll_desired_condition` existaient déjà en base, dans le formulaire d'édition et dans la modale de détail, mais n'étaient visibles nulle part sur la face de la carte elle-même (contrairement à la Collection, qui affiche déjà ces badges directement). Ajouté en réutilisant les classes globales `.badge`/`.badge--completeness`/`.badge--condition` de `_browse.scss` (déjà validées côté Collection/Consoles) dans les deux vues de `wishlist.html` (grille et liste), affichage conditionnel (rien si les deux champs sont vides, ce qui est le cas pour la majorité des jeux actuellement en wishlist). Vérifié en conditions réelles (Playwright) : positionné/renseigné temporairement via le formulaire de la modale de détail sur le seul jeu actuellement en wishlist (Super Mario 64, N64) pour confirmer le rendu visuel des badges dans les deux vues, puis remis à « Peu importe » (valeur d'origine) pour ne pas altérer les vraies données utilisateur.
- [x] **Complétude/état constatés par offre, jeux et consoles** (retour utilisateur, ex. vu sur Vinted : « 50€ complet boîte et jeu bon état et notice très bon état ») : chaque offre de la wishlist peut désormais préciser sa propre complétude/état constatés, distincts des critères de recherche globaux du jeu/console — comme un vendeur ne propose pas forcément l'état exact recherché. Migration `0006_offer_completeness_condition.sql` (colonnes `ll_completeness`/`ll_condition_media`/`ll_condition_box`/`ll_condition_manual` sur `ref_wishlist_offer`, `ll_completeness`/`ll_condition_overall` sur `ref_console_wishlist_offer`, toutes optionnelles comme le reste d'une offre). Composant partagé `OffersPanel` étendu avec un nouvel `[itemKind]` (`'game'` | `'console'`) qui détermine l'affichage : jeu/boîte/notice détaillés séparément pour les jeux (même logique conditionnelle que `CollectionFormModal`, factorisée dans `game-state.constants.ts` — `showBoxCondition`/`showManualCondition`, partagée par les deux composants), état général unique pour les consoles (même logique que `ConsoleFormModal`). Résumé compact affiché sur chaque ligne d'offre en lecture (ex. « CIB · Jeu : Good · Boîte : Good · Notice : Excellent »). **Bug trouvé en testant** : le serveur backend tournait depuis avant l'ajout des nouvelles colonnes aux requêtes SQL (`WishlistOfferQueries`/`ConsoleWishlistOfferQueries`, pas de rechargement à chaud) — une offre de test créée juste après la migration a silencieusement perdu ses champs complétude/état (aucune erreur, l'ancien code ignorait juste les nouveaux champs du payload). Corrigé en redémarrant le processus backend ; offre de test corrompue supprimée en base, comportement revérifié après redémarrage (persistance confirmée en base + résumé affiché correctement). Vérifié aussi côté consoles (édition de l'offre réelle NEC TurboGrafx-CD, formulaire ouvert puis annulé sans sauvegarder, pour confirmer visuellement le bon jeu de champs sans toucher à la donnée réelle).
- [x] **Dashboard redesigné** (retour utilisateur : présentation des stats et de l'activité plus stylée) :
  - **Stat tiles** : icône + liseré coloré distinct par métrique (📀 collection, ⭐ wishlist, 🎮 consoles possédées, 🔍 consoles recherchées — nouvelle 5ᵉ tuile, `nb_wishlist_consoles` était déjà renvoyé par l'API mais pas affiché, 💰 budget dépensé), fond d'icône teinté (`color-mix`), légère élévation au survol. Ce ne sont pas des séries d'un même graphique (skill dataviz) mais des cartes indépendantes : l'accent coloré par carte n'a donc pas à respecter la règle « une seule teinte ».
  - **Répartition par console** : petit liseré coloré devant chaque nom de console, reprenant la couleur déjà utilisée ailleurs dans l'app (tuiles, bannières, `consoleColor()`) — identité visuelle cohérente, sans transformer la barre elle-même en encodage rainbow (elle reste à une seule teinte, la magnitude reste nominale). Les consoles à 0 jeu possédé sont désormais filtrées (avant : les 17 consoles s'affichaient même vides) ; état vide dédié avec lien direct vers le Catalogue si la collection est vide.
  - **Activité récente** (ex-« Derniers ajouts » en deux colonnes séparées Collection/Wishlist) : fusionnée en un seul flux chronologique unique, trié par date de création la plus récente, jusqu'à 8 entrées. Chaque ligne garde un tag distinguant son origine (« Collection » teinte primaire, « Wishlist » teinte secondaire), affiche le prix payé si connu, et une date relative (« il y a 3 j », nouvelle fonction `timeAgo()` dans `date.util.ts`). Reconstruit côté frontend à partir des deux listes déjà renvoyées par l'API dashboard (pas de journal d'activité en base, §9 — aucune modification backend nécessaire).
  - Vérifié en conditions réelles (Playwright, thèmes Minimal et Dark Gaming) : jeu ajouté temporairement au catalogue (NEC TurboGrafx-16, 1943 Kai) pour confirmer le rendu de la barre de répartition et du flux d'activité avec des données réelles, puis retiré via le bouton Supprimer de la Collection (flux normal de l'app, pas de suppression SQL directe) — 0 jeu restant en collection confirmé après nettoyage.
- [x] **PWA installable façon Discord (icône Bureau, fenêtre dédiée)** — retour utilisateur, fidèle à l'objectif d'origine du §7. **Terminé (session 2026-07-13)** :
  - Manifest (`public/manifest.webmanifest`), service worker (`ngsw-config.json`, enregistré via `provideServiceWorker` dans `app.config.ts`, actif seulement hors dev mode) et icônes maison (`public/icons/icon-*.png`) en place depuis la session précédente — vérifiés fonctionnels.
  - **Bug trouvé et corrigé en vérifiant** : le `http-server` de test (port 5050) servait un dossier vide/mauvais dossier car le `cd` avant lancement en arrière-plan perdait son `cwd` — `index.html` et `ngsw-worker.js` renvoyaient 404 en silence (racine du timeout Playwright constaté la session précédente). Corrigé en passant le dossier en argument explicite à `http-server` plutôt qu'en comptant sur le `cd`.
  - **Décision finale sur l'apparence** : un navigateur Chromium (Edge/Chrome) ne peut pas reproduire à l'identique une appli Electron comme Discord (fenêtre entièrement custom) — une PWA installée garde toujours une mini-barre Chromium minimale. Plafond accepté par l'utilisateur, pas de passage à Electron/Tauri (aurait remis en cause le choix de stack du §7).
  - **Lancement quotidien résolu** : au lieu de compter sur l'installation PWA du navigateur (qui ne crée pas d'icône Bureau automatiquement et nécessite Docker/backend/serveur frontend déjà démarrés), création d'un **script de lancement unique** `scripts/start-wishgames.ps1` + raccourci Bureau `WishGames.lnk` (icône `favicon.ico`). Au double-clic : démarre Docker Desktop si besoin (attend le daemon), démarre le conteneur `collect_play_postgres`, démarre le backend (`bun run start`, si port 6001 pas déjà occupé), sert le build prod du frontend (`npx http-server dist/fronted/browser -p 5050 -s`, si port 5050 pas déjà occupé), puis ouvre `msedge.exe --app=http://localhost:5050` (fenêtre Edge sans barre d'adresse ni onglets). Testé de bout en bout (services déjà actifs → détection correcte, fenêtre app ouverte) — validé par l'utilisateur.
  - **Rappel** : le build prod servi (`dist/fronted/browser`) doit être régénéré manuellement (`ng build --configuration production` dans `apps/frontend`) après toute modification frontend — le raccourci ne rebuild pas automatiquement, il sert le dernier build présent.
- [x] **Revue manuelle des 244 jeux wishlist non rapprochés terminée (session 2026-07-13)** : outil existant `suggest-wishlist-matches.ts` (suggestions par similarité texte, score 0-1) utilisé pour classer les 244 titres en 3 bandes de confiance (≥0.85 quasi certain, 0.70-0.85 à examiner, <0.70 probablement absent). Revue faite via une page de revue interactive dédiée (artifact HTML autonome, non versionné dans le repo) plutôt que ligne par ligne dans le CSV : bandes repliables, suggestions avec barre de score, décision par bouton (accepter suggestion 1/2/3 ou marquer absent), actions de lot par bande, export JSON copié-collé en retour pour application. **177 titres tranchés par l'utilisateur** (130 quasi certains + 47 à examiner, toutes bandes couvertes) : 174 ajoutés à `ref_wishlist` (regions + priorité relue depuis le fichier Excel d'origine, qui ne survivait pas dans le rapport CSV non-rapprochés), 3 marqués absents (Cyber Cross, Super Megaforce, Rayman 2). **Bug ponctuel trouvé et corrigé** : le titre catalogue *Ranma ½* utilise le caractère unique U+00BD, alors que la normalisation NFKC du script de suggestion le décompose en `1⁄2` (trois caractères) pour l'affichage — la recherche exacte sur ce titre échouait ; corrigé par insertion manuelle ciblée, pas de changement de code (cas isolé, un seul titre concerné sur tout le catalogue). **Reste 67 titres restants (score <0.70, `apps/backend/scripts/wishlist-not-in-catalog.csv`)** : très probablement absents du catalogue LaunchBox (variantes/éditions obscures) — fichier de référence généré, pas d'action DB, à revoir seulement si besoin. `ref_wishlist` compte désormais 176 jeux.
- [x] **Wishlist vidée intégralement (jeux + consoles), à la demande explicite de l'utilisateur (session 2026-07-14)** : point de départ propre avant la refonte visuelle Dashboard + Wishlist. `DELETE FROM ref_wishlist` (175 entrées) et `DELETE FROM ref_console_wishlist` (1 entrée — NEC TurboGrafx-CD, celle explicitement marquée « vraie donnée, ne pas supprimer » à la ligne ci-dessus) exécutés après confirmation explicite à deux reprises (portée du vidage, puis confirmation malgré la consigne « plus de `DELETE FROM` en masse » posée après l'incident du 2026-07-12). **Ce n'est pas une répétition de l'incident** : suppression demandée sciemment par l'utilisateur, pas un nettoyage de données de test qui aurait débordé sur de vraies données. Offres liées supprimées en cascade (migration `0007`). Compteurs vérifiés à 0 après coup. Wishlist jeux et consoles reparties de zéro.
- [x] **Dashboard redesigné (donut, animations par thème, activité enrichie) — implémenté et vérifié côté backend, vérification visuelle restant à faire (session 2026-07-14)** :
  - **Historique d'activité en base** (n'existait pas avant, §9 le mentionnait comme limitation) : nouvelle table `ref_activity_log` (migration `0008_activity_log.sql`), champs dénormalisés (titre/console/jaquette/prix) pour survivre à la suppression de la ligne source. Alimentée à chaque ajout/modification/achat/suppression sur les 4 combinaisons jeux/consoles × collection/wishlist (`CollectionQueries`, `WishlistQueries` — y compris le flux "Acheter" en transaction —, `ConsoleCollectionQueries`, `ConsoleWishlistQueries`). Nouvel endpoint `GET /dashboard/activity` (pagination `limit`/`offset`, filtre `kind`). **Testé de bout en bout via curl** : ajout, achat (transfert wishlist→collection), suppression — chaque action produit la bonne ligne de log, avec le bon titre même après suppression de la ligne source ; filtre par type et pagination vérifiés.
  - **Donut "Répartition du catalogue"** (Collection / Wishlist / reste du catalogue) : nouveau composant partagé `DonutChart` (SVG fait main, pas de librairie de graphique), nouvelle donnée `total_games` côté `DashboardQueries.getStats()`. **Ne remplace pas** la barre par console existante (17 tranches y serait illisible, cf. skill dataviz) — un donut séparé, sur une répartition à 3 catégories qui s'y prête.
  - **Animations** : nouveau partial `src/styles/_animations.scss` (aucune `@keyframes` n'existait avant dans le repo) — entrée en fondu sobre sur tous les thèmes, remplissage progressif barre/donut sans JS (`@starting-style`), effet glow pulsé sur les stat tiles en thème Neon, effet "pixel-snap" sur les lignes d'activité en thème Retro, `prefers-reduced-motion` respecté partout. Count-up des stat tiles en JS (`animate-count.util.ts`, seule partie non faisable en CSS pur).
  - **Activité récente retravaillée** : icône par type d'action (➕✏️🛒🗑️), regroupement par jour (Aujourd'hui/Hier/Cette semaine/Plus ancien, nouvelle fonction `dayBucket()`), chips de filtre par type, pagination "Voir plus", ligne cliquable → redirige vers Collection/Wishlist filtrée sur la console de l'entrée (y compris pour une entrée supprimée, puisque l'ID de la ligne source n'est pas conservé).
  - **⚠️ Non vérifié** : rendu visuel réel dans le navigateur (donut, animations par thème, mise en page de l'activité) — aucun outil de navigateur headless disponible dans cet environnement pour capture d'écran. Backend et compilation Angular (AOT) vérifiés sans erreur, mais **l'utilisateur doit encore valider visuellement** `http://localhost:4300/dashboard` dans les 4 thèmes avant de considérer ce chantier terminé.
- [x] **Refonte Wishlist — 3 modes d'affichage + photos consoles (implémenté et vérifié, session 2026-07-14, seconde partie)** : plan d'implémentation écrit avant codage (comme le Dashboard), voir historique de session pour le détail complet.
  - **Migration `0009_wishlist_status.sql`** : nouveau domaine `wishlist_status_t` (`SEARCHING`/`SPOTTED`/`NEGOTIATING`/`BOUGHT`, tokens anglais majuscules — cohérent avec le vocabulaire contrôlé existant `LOOSE`/`MINT`/`NTSC`), colonne `ll_status` sur `ref_wishlist` ET `ref_console_wishlist`, défaut `SEARCHING`. Appliquée et vérifiée (`\d`).
  - **Mode Chasse (kanban)** : nouveau composant partagé `WishlistKanban` (`shared/components/wishlist-kanban`), agnostique jeux/consoles (interface `KanbanCardData`), glisser-déposer via **Angular CDK** (nouvelle dépendance `@angular/cdk` ajoutée). 4 colonnes (Recherché/Repéré/Négociation/Acheté). **Décision clé** : déposer une carte sur "Acheté" n'écrit jamais `ll_status='BOUGHT'` — ça ouvre directement la modale d'achat existante (le flux "Acheter" transactionnel supprime déjà la ligne wishlist et l'insère en collection ; persister un statut aurait laissé l'item bloqué en wishlist). Mise à jour optimiste + rollback sur échec pour les 3 vraies transitions de statut, même pattern que `submitEdit`. Réutilisé tel quel sur l'onglet Consoles → Wishlist.
  - **Mode Prix/Offres** (jeux uniquement, pas côté consoles — trop peu d'items pour que ce soit utile) : nouveau composant partagé `WishlistPriceView`, tri prix croissant (nulls-last)/console/priorité. Nouvelle colonne calculée `min_offer_price` dans `WishlistQueries.SELECT_WITH_GAME` (même style que `nb_offers` déjà présent) pour éviter un appel N+1 par item.
  - **Toggle 3 voies** sur Wishlist jeux (Cartes/Chasse/Prix), toggle 2 voies sur Consoles → Wishlist (Cartes/Chasse). Classe `.header-toggles` déplacée de `consoles.scss` vers `_browse.scss` (partagée par les deux écrans désormais, même principe que les autres mutualisations déjà faites dans le repo).
  - **Vérifié de bout en bout via l'API** (équivalent aux actions UI, pas d'outil navigateur dans cet environnement) : création wishlist (défaut `SEARCHING` confirmé), `PUT ll_status` (persistance confirmée par relecture), ajout d'offre (`min_offer_price` reflété), achat en transaction (wishlist vidée, collection alimentée), suppression via les endpoints DELETE existants (jamais de SQL brut) — données de test entièrement nettoyées après coup, jeux/consoles/collection/wishlist revenus à 0 comme avant les tests.
  - **Photos consoles Wikimedia Commons** (remplacement des tuiles `.console-tile` couleur unie sur Catalogue et Consoles) : 17 photos curées manuellement (licences vérifiées une à une — 16 Domaine public, 1 CC BY-SA 3.0 pour Dreamcast), script `apps/backend/scripts/download-console-photos.ts` (`bun run download:console-photos`, idempotent — ignore les fichiers déjà présents), nouveau montage statique `/console-photos` (`routes.util.ts`, même pattern que `/covers`), `consolePhotoUrl()` (`core/utils/console-photo.util.ts`) + repli CSS sur `consoleColor()` (`background-color` sous `background-image`, silencieux si l'image est absente/404 — pas d'image cassée). **17/17 téléchargées** (`apps/backend/public/consoles/*.jpg`, servies via `/console-photos/`, vérifié `200 image/jpeg` sur plusieurs slugs dont le seul PNG source `nec-turbografx-cd`) — le rate-limiting anti-bot du CDN Wikimedia (`upload.wikimedia.org`, réponses 429 « robot policy ») a nécessité plusieurs relances espacées du script (idempotent, ignore les fichiers déjà présents) pour venir à bout des 5 dernières (Saturn, Dreamcast, Sega CD, TurboGrafx-16, TurboGrafx-CD), sans autre action que patienter entre les tentatives.
  - **Bug pré-existant corrigé en cours de route** : `apps/backend/package.json` avait `"@types/bun": "latest"` — fait planter (`Invalid Version`) tout `npm install` lancé depuis le workspace (même pour une dépendance frontend sans rapport), à cause d'un bug connu de l'arborist npm sur les versions non-semver en dédoublonnage. Épinglé à `^1.3.14` (version qui était de toute façon déjà résolue). **À reporter sur la machine principale.**
- [ ] Migration du stockage des jaquettes vers le cloud (reporté après le MVP) — **nuance** : sur cette copie de test, les jaquettes sont déjà distantes (hotlink LaunchBox CDN, voir ci-dessus) plutôt que locales ; à réconcilier avec la machine principale qui a ses jaquettes copiées localement (`import:launchbox` classique).

**Décision (session précédente) — suivi multi-région** : l'utilisateur a demandé à pouvoir posséder plusieurs éditions régionales du même jeu séparément (ex. Crash Bandicoot PAL + USA + Japon), chacune avec son propre état/prix/notes. Vérification faite dans les données sources : **LaunchBox n'a qu'une seule fiche par jeu et par console**, avec les jaquettes de plusieurs régions groupées dans la même fiche (pas de fiches séparées par région) — donc le catalogue reste une fiche par jeu, mais peut désormais porter plusieurs jaquettes par type (une par région). Détail technique complet en §9 (migration `0004`).

**État des données en base sur cette copie** (relevé le 2026-07-14, en reprise de session — collection jeux également vidée volontairement entre-temps par l'utilisateur, en plus du vidage wishlist déjà documenté) :
- Collection jeux : **0 entrée** (l'unique jeu à 1120€ précédemment documenté a été retiré volontairement par l'utilisateur ; confirmé explicitement, pas un incident de données).
- Collection consoles : vide (0 ligne, inchangé).
- Wishlist jeux : **0 entrée** (vidée intentionnellement, les 176 entrées précédentes — dont les 174 de la revue de rapprochement — ont été supprimées à la demande de l'utilisateur pour repartir de zéro avant la refonte).
- Wishlist consoles : **0 entrée** (NEC TurboGrafx-CD retiré volontairement lui aussi, offre Leboncoin supprimée en cascade — ce n'était plus une donnée à préserver une fois le vidage confirmé explicitement par l'utilisateur).
- `ref_activity_log` : **0 ligne** (vide dès cette reprise de session — cohérent avec une base repartie de zéro sur collection/wishlist).

**Fichier `data/Wishlist Import (version 1).xlsb.xlsx` (apporté par l'utilisateur en cours de session)** : nouveau modèle sur une seule feuille (colonnes `Titre/Plateforme/Region/Type/Priorite/Statut/Etat/Cartouche/Boite/Notice/Prix_Cible/Prix_Vu/Prix_Ref/Genre/Notes`), 969 lignes — vérifié qu'il ne s'agit **pas** d'une version corrigée des titres (comparaison faite : seulement 2 titres corrigés, 4 nouvellement typo, 230 identiques à l'ancien fichier sur les non-rapprochés). Semble plutôt être un nouveau modèle de suivi personnel (prix cible/vu/référence, état, genre, notes) — pas encore exploité par l'application, à clarifier avec l'utilisateur si un usage est prévu.

**Nouveau : lancement quotidien** — raccourci Bureau `WishGames.lnk` → `scripts/start-wishgames.ps1` (voir liste ci-dessus, entrée PWA). Démarre Docker/backend/serveur frontend si besoin puis ouvre la fenêtre app. Ne rebuild pas le frontend automatiquement.

**Pour reprendre la prochaine fois** :
1. **Priorité immédiate** : l'utilisateur vérifie visuellement `http://localhost:4300/dashboard` **et** les 3 modes Wishlist (`/wishlist`, toggle Cartes/Chasse/Prix) dans les 4 thèmes (backend/frontend déjà démarrés en session) et remonte les retours — tout a été vérifié côté backend/API/compilation, jamais à l'écran (aucun outil navigateur dans cet environnement).
2. Toujours en attente, sans lien avec la refonte : revue du CSV wishlist non rapproché (67 titres restants, score <0.70 — non prioritaire, la wishlist vient d'être vidée de toute façon).
3. Sur la machine principale : réconcilier le fait que cette copie de test a maintenant des jaquettes en hotlink CDN (`import-launchbox-remote.ts`) plutôt qu'en copie locale (`import-launchbox.ts` classique) — les deux scripts coexistent, choisir/documenter lequel fait foi si les deux machines doivent un jour converger. **Rejouer aussi les migrations `0005_offer_notes_and_console_offers.sql`, `0006_offer_completeness_condition.sql`, `0008_activity_log.sql` et `0009_wishlist_status.sql`**, le fix fuseau horaire (`DatabaseUtil`, OID 1082) et le fix `@types/bun` (`apps/backend/package.json`, `"latest"` → `"^1.3.14"`, sinon `npm install` casse) sur la machine principale — développés uniquement sur cette copie de test. Reproduire aussi le raccourci `WishGames.lnk`/`start-wishgames.ps1` (chemins codés en dur pour `C:\Users\FrancoisPG\Desktop\Test\WishGames` — à adapter pour `C:\Users\franc\Desktop\WishGames`).

## 1. Type d'application et plateforme

- **Type** : Progressive Web App (PWA) — installable via icône sur le bureau du PC et sur l'écran d'accueil du smartphone, sans passer par les stores.
- **Utilisation** : PC (Windows) et smartphone (Android en priorité).
- **Utilisateur** : application personnelle, mono-utilisateur, sans gestion de comptes multiples.
- **Mode hors-ligne** : cache en lecture seule — les dernières données consultées restent visibles sans connexion, mais les ajouts/modifications nécessitent une connexion.
- **Hébergement** : cloud managé, à bas coût (type Railway / Render), avec base de données centrale accessible depuis PC et mobile (synchronisation automatique, pas de synchro manuelle entre appareils).

## 2. Données et sources

- **Historique (abandonné)** : un premier scraper MobyGames avait été exploité, données dans `data/data/*.json` + `data/covers/`. **Détecté le 2026-07-06** : chaque fichier JSON était plafonné à 1050 jeux (limite de pagination du scraper), tronquant 9 des 16 consoles (PS3, PS2, PlayStation, Wii, NES, Wii U, SNES, Saturn, Genesis) — environ 11 600 jeux manquants sur ~23 560 déclarés. Plutôt que de corriger ce scraper, **décision de le remplacer entièrement**.
- **Source actuelle des jeux (2026-07-08)** : nouveau scraper basé sur **LaunchBox Games DB**, projet séparé `c:\Users\franc\Desktop\scrapper_launchbox`. Données au format JSON dans `scrapper_launchbox/output/<console>.json` (un fichier par console, objet avec `platform`/`total_games`/`games[]`) + jaquettes déjà téléchargées dans `scrapper_launchbox/images/<console>/<id-jeu>/<type-media>/`.
  - **Scraping vérifié complet** (logs `scrapper_launchbox/logs/scraper.log` : chaque console se termine par "N/N fiches détaillées traitées"; pas de plafond constaté). Images : `logs/download_images.log` confirme 270 153 images téléchargées, 0 échec, pour un total de 271 958 images référencées.
  - **17 consoles couvertes, ~24 400 jeux au total** :
    | Console | Jeux | Dossiers images | Fichiers images |
    |---|---:|---:|---:|
    | Sony PlayStation | 4438 | 4437 | 57744 |
    | Sony PlayStation 2 | 4571 | 4562 | 47295 |
    | Sony PlayStation 3 | 2150 | 2146 | 19087 |
    | Sony PlayStation 4 | 3884 | 3864 | 17494 |
    | SNES | 1779 | 1779 | 30548 |
    | NES | 1409 | 1408 | 19248 |
    | Sega Saturn | 1149 | 1148 | 16579 |
    | Sega Genesis | 997 | 997 | 17809 |
    | Nintendo GameCube | 684 | 683 | 9103 |
    | Sega Dreamcast | 650 | 650 | 8113 |
    | Sega Master System | 333 | 333 | 5745 |
    | NEC TurboGrafx-CD | 411 | 411 | 3622 |
    | NEC TurboGrafx-16 | 300 | 300 | 3858 |
    | Sega CD | 211 | 211 | 5838 |
    | Nintendo Famicom Disk System | 203 | 203 | 2206 |
    | Nintendo 64 | 391 | 391 | 6917 |
    | Sega 32X | 34 | 34 | 752 |
  - **⚠️ Changement de périmètre par rapport au cadrage initial** : **Wii et Wii U ne sont pas couvertes** par ce nouveau scraper (à rescraper/rajouter plus tard, non bloquant). En contrepartie, ce scraping couvre en plus **PlayStation 4, TurboGrafx-CD et Famicom Disk System**, absentes du périmètre initial.
  - **Champs disponibles par jeu (structure LaunchBox, différente de MobyGames)** : `id`, `slug`, `title`, `url`, `release_date`, `game_type`, `max_players`, `cooperative`, `esrb`, `platform`, `overview` (description), `developers[]`, `publishers[]`, `genres[]`, `alternate_names[]` (équivalent `aka`), `wikipedia`, `video`, `community_rating`, `total_votes`, `media` (objet groupé par type — ex. `"Box - Front"`, `"Box - Back"`, `"Cart - Front"` — chaque entrée avec `url`/`filename`/`region`/`width`/`height`/`local_path`).
  - **Pas d'équivalent direct** : `moby_score` (remplacé par `community_rating`/`total_votes` LaunchBox), `gameplay`/`perspective`/`visual`/`setting` (LaunchBox n'a qu'un seul champ `genres`, pas de sous-catégorisation), `groups`/`credits_count` (n'existent pas côté LaunchBox — non-sujet).
  - **Jaquettes** : structure plus simple qu'avec MobyGames — `media` est déjà groupé par type et par région dans le même fichier JSON (pas de mélange multi-plateformes à filtrer comme avec l'ancien scraper, puisque le fichier est déjà par console). Le principe de sélection **une seule région (PAL/Europe → USA → Japon)** reste valable.
- **Script d'import — exécuté** (`apps/backend/scripts/import-launchbox.ts`, `bun run import:launchbox`) : lit `scrapper_launchbox/output/*.json`, upsert `ref_console`/`ref_game`, copie les images choisies vers `apps/backend/public/covers/<console-slug>/<id-jeu>/<type>.<ext>` (servies via `express.static` sur `/covers`), insère `ref_cover`.
  - **Mapping type de jaquette → media LaunchBox retenu** (avec repli si le type principal est absent) :
    | Type `ref_cover` | Media LaunchBox (ordre de repli) |
    |---|---|
    | FRONT | `Box - Front` → `Box - Front - Reconstructed` |
    | BACK | `Box - Back` → `Box - Back - Reconstructed` |
    | SPINE | `Box - Spine` |
    | MEDIA | `Disc` → `Cart - Front` (photo du support physique) |
    | MANUAL_FRONT / MANUAL_BACK | **aucun équivalent LaunchBox — jamais importés** |
  - **⚠️ Limitation de la source** : LaunchBox ne propose aucune catégorie "Manuel" dans son media (vérifié sur les 17 fichiers scrapés : aucune occurrence de type `Manual*`). Les valeurs `MANUAL_FRONT`/`MANUAL_BACK` restent dans le `CHECK` de `ref_cover.ll_cover_type` (pour compatibilité future avec une autre source) mais aucune ligne n'est ni ne sera insérée pour ces deux types tant que la source reste LaunchBox.
  - **Sélection de région** : parmi les images du type retenu, priorité `Europe` → `North America` (équivalent USA) → `Japan`, repli sur la première image disponible si aucune des trois régions n'est présente (mêmes principes que §2bis, adaptés aux libellés de région LaunchBox).
  - **Résultat de l'import (2026-07-08)** : 17 consoles, 23 594 jeux, 66 140 jaquettes (FRONT 21864, BACK 18040, MEDIA 15654, SPINE 10582), 0 fichier image manquant — comptes vérifiés en base, cohérents à l'unité près avec les `total_games` des JSON source.
- **Wishlist existante** : actuellement dans Google Sheets → **migration totale** vers la base de données de l'application (abandon de Google Sheets une fois la migration faite, pas de synchro continue à maintenir).
- **Volume** : catalogue de grande taille → pagination / chargement au scroll nécessaire sur les vues catalogue.

## 2bis. Tri des données scrapées (à garder / à exclure)

Décisions prises lors de la revue détaillée du JSON scrapé (structure observée dans `data/data/*.json`, ex. `snes.json`, `genesis.json`).

### Métadonnées texte par jeu

- **Niveau retenu : complet.** On garde : titre, titres alternatifs (`aka`), description, année de sortie, genres/gameplay/perspective/visuel/ambiance (`genres`, `gameplay`, `perspective`, `visual`, `setting`), score MobyGames (`moby_score`), développeur(s), éditeur(s), lien vers la fiche MobyGames (`url`).
- **Exclus** : `credits_count` (pas d'intérêt pour l'usage prévu), `groups` (tags MobyGames trop bruts/internes, non nécessaires).

### Portages / rééditions multi-plateformes

- Un jeu MobyGames (un `moby_id`) peut avoir été porté sur de nombreuses plateformes (ex : *Altered Beast* est sorti sur Genesis, Master System, Arcade, Atari ST, Commodore 64, ZX Spectrum, DOS, iPhone, Xbox 360, Windows...).
- **Décision : on ignore les portages.** Le jeu est rattaché uniquement à la console d'origine correspondant au fichier JSON scrapé (ex : traité comme un jeu Genesis dans `genesis.json`), sans lister ses autres portages. Le champ `platforms` du JSON n'est pas importé.

### Dates de sortie

- Le champ `releases` liste parfois 5 à 10 dates différentes (une par région/édition/plateforme).
- **Décision : on ne garde que `release_year`** (une seule année de référence). Le détail `releases` n'est pas importé.

### Jaquettes (`covers`) — point le plus complexe

- **Types d'images à garder par jeu** : Front Cover, Back Cover, Manual Front, Manual Back, Media, Spine/Sides (types dispo dans le champ `"type"` de chaque cover, avec parfois des variantes de libellé à normaliser, ex. `"Manual\n      Front"`).
- **⚠️ Piège découvert** : le dossier local `covers/<console>/<moby_id>/` est nommé d'après le fichier source scrapé (ex. `genesis.json`) + l'ID du jeu, **mais le tableau `covers` à l'intérieur du JSON contient les jaquettes de TOUTES les plateformes** sur lesquelles le jeu existe (pas seulement la console du fichier). Exemple concret vérifié sur *Altered Beast* (`covers/genesis/2019/`) : le dossier contient pêle-mêle des images `"platform": "Genesis"`, `"platform": "SEGA Master System"`, `"platform": "Commodore 64"`, `"platform": "ZX Spectrum"`, `"platform": "iPhone"`, etc.
  - Chaque cover a un champ `"group_id"` qui identifie une édition/région précise (ex : `group_id: "238"` = édition US Genesis cartouche ; `group_id: "15115"` = édition Japon Genesis ; `group_id: "27555"` = édition US Master System — bien distincte malgré le même dossier).
- **Solution retenue pour le script d'import** :
  1. Filtrer le tableau `covers` pour ne garder que les entrées dont `cover.platform` correspond bien à la console du fichier source (avec une table de correspondance des noms, ex. `"SEGA Master System"` vs le nom de fichier `sega-master-system.json`, `"Genesis"` vs `genesis.json`, etc., car les libellés ne sont pas toujours identiques).
  2. Parmi les covers restantes (une seule console), choisir **un seul `group_id`** (une seule édition/région cohérente) pour ne pas mélanger les visuels entre régions différentes.
  3. Extraire depuis ce `group_id` les types d'image voulus (front/back/manuel front+back/media/spine) disponibles.
- **Décision — critère de choix de l'édition/région : PAL/Europe → USA → Japon.** On parcourt les `group_id` disponibles dans cet ordre de priorité et on retient le premier qui existe pour la console du fichier. Si aucune des trois régions n'est présente, repli sur le premier `group_id` disponible. Rappel : la jaquette affichée reste générique (issue du scraper, §3.1) et n'a pas besoin de correspondre à l'édition réellement possédée.
- **Décision — gestion des images manquantes : on garde ce qui existe.** Si l'édition/région retenue n'a pas tous les types d'image voulus, les types manquants restent vides/placeholder ; pas de complément en piochant dans une autre édition/région (pour éviter de mélanger visuellement les régions sur une même fiche).

## 2ter. Migration de la wishlist Excel

- **Source** : `data/Wish List Retro(1).xlsx`, 14 onglets (un par console). **8 onglets exploitables** : Pc Engine (124 jeux distincts), Nintendo/NES (165), Super Nintendo (233), Mega Drive (177), Saturn (68), Dreamcast (41), Playstation 1 (161) — soit **969 jeux distincts** avant rapprochement. **6 onglets vides**, ignorés : Nintendo 64 (colonnes Titre/Région/Note vides malgré des priorités pré-remplies), Wii, Playstation 2, Playstation 3, Wii U, Playstation 4, Switch.
- **Constat structurel** : chaque ligne du fichier = un couple (jeu, région), donc environ la moitié des lignes sont des doublons du même jeu pour une région différente (ex. *Bionic Commando* en USA/EU/JAPON sur 3 lignes).
- **Décision (confirmée avec l'utilisateur)** : une seule entrée `ref_wishlist` par jeu, pas une par région — objectif : pouvoir comparer plusieurs offres entre régions (via `ref_wishlist_offer`, déjà existant) et retenir la moins chère. Migration `0003_wishlist_regions_priority.sql` : ajout de `ref_wishlist.ll_desired_regions text[]` (régions acceptées, ex. `{USA,EU,JAPON}`) et `ref_wishlist.nb_priority integer` (1-5, repris de la colonne `Pririoty` du fichier, présente sur quasiment toutes les lignes).
- **Colonnes du fichier ignorées** : `Note` (vide sur tous les onglets), `Prix Vinted Complet/Loose` et `Prix Ebay (priceCharting) Complet/Loose` (onglet Nintendo, entièrement vides — jamais renseignées), `Colonne 1` de l'onglet Mega Drive (contient parfois `"snes"`, semble être une note de travail sans rapport avec le modèle de données — non importée), colonne `Id` du fichier (`NES-015`, `SNES-001`...) — identifiants internes à l'ancien classeur, sans correspondance avec le catalogue LaunchBox, non importés.
- **Script d'import** : `apps/backend/scripts/import-wishlist-excel.ts` (`bun run import:wishlist`). Regroupe les lignes par jeu (titre normalisé), mappe chaque onglet vers le(s) slug(s) console du catalogue (Pc Engine → `nec-turbografx-16` **et** `nec-turbografx-cd`, Nintendo → NES, Mega Drive → `sega-genesis`, etc.), puis rapproche par **titre exact normalisé** (trim, espaces, casse — **pas de matching flou/tolérant**, décision explicite de l'utilisateur) contre `ref_game.ll_title` ou `ref_game.ll_aka_titles`, sur la ou les consoles mappées.
- **Résultat (2026-07-08)** : **724 jeux importés** dans `ref_wishlist` (regroupés depuis 969 jeux distincts du fichier, dont 725 rapprochés — 1 collision de titre entre deux lignes sur le même jeu du catalogue). **244 jeux non rapprochés**, listés dans `apps/backend/scripts/import-wishlist-unmatched.csv` (rien n'est inséré en base pour ceux-ci). Répartition par onglet : Super Nintendo 57, Playstation 1 45, Nintendo 42, Mega Drive 39, Pc Engine 27, Saturn 25, Dreamcast 9.
  - **Cause principale identifiée par sondage** : en grande partie des **typos dans le fichier Excel source** (ex. `"Graduis"` au lieu de `"Gradius"`, `"Mike Tyson' Punch-Out!!"` sans le `'s`, `"Jacky Chan"` au lieu de `"Jackie Chan"`), des **différences de ponctuation/espacement** (ex. `"Castlevania II : Simon's Quest"` avec espace avant `:` contre `"Castlevania II: Simon's Quest"` dans le catalogue), et quelques cas d'**ambiguïté d'édition** (ex. `"Punch-Out"` seul quand le catalogue distingue `"Punch-Out!! (1987)"` / `"(1990)"`). Une partie peut aussi être des jeux réellement absents du catalogue LaunchBox. **Revue manuelle du CSV à faire** avant de décider d'un ré-import corrigé.

## 3. Fonctionnalités principales

### 3.1 Collection

- Une entrée par jeu (pas de doublon d'entrée) + un champ **quantité** pour indiquer si tu possèdes plusieurs exemplaires.
- Organisation par console (arborescence console → jeux), avec logos placeholders (icône générique + nom texte) en attendant de vrais logos.
- Informations par jeu : titre, console, complétude, état de conservation, date d'acquisition, prix payé, lieu d'achat, notes personnelles.
- **État du jeu, sur deux axes distincts (standard retrogaming/collectionneur)** :
  - **Complétude** (composition de l'exemplaire) : Loose (jeu seul) / Loose + Manual (jeu + notice) / Boxed (avec boîte, pas forcément complet) / CIB - Complete In Box (jeu + boîte + notice + idéalement inserts d'origine) / Sealed (neuf sous blister) / NOS - New Old Stock (ancien stock neuf jamais vendu/utilisé).
  - **État de conservation** (usure) : Mint (M) / Near Mint (NM) / Excellent (EX) / Very Good (VG) / Good (G) / Fair (F) / Poor (P).
- Pas de photo personnelle de la boîte/cartouche au MVP (visuel générique du scraper utilisé).
- Vues : par console (arborescence), liste triable/filtrable, grille avec images.
- Valeur de la collection affichée = somme des prix payés (pas d'estimation de valeur de marché).

### 3.2 Wishlist

- Même organisation que la collection (par console, avec logo).
- Informations : titre, console, date de dernière vérification, complétude/état de conservation recherchés (mêmes échelles qu'en §3.1, optionnelles — critère de recherche, pas toujours strict).
- **Offres multiples par jeu** (ajouté §9) : un même jeu recherché peut avoir plusieurs offres suivies en parallèle (prix constaté/cible + lien source texte/URL par offre), utile pour comparer plusieurs vendeurs/sources pour le même jeu.
- Distinction visuelle entre jeux déjà possédés et jeux recherchés.
- Statut binaire (pas d'état intermédiaire "trouvé mais pas acheté") : un jeu est soit en wishlist, soit en collection.
- Bouton **"Acheter"** : saisie prix réel / lieu / date / complétude / état de conservation → suppression de la wishlist + création de l'entrée dans la collection.
- Pas d'alerte de prix automatique au MVP (suivi manuel par toi).

### 3.3 Catalogue global

- Vue globale de tous les jeux connus (issus du scraper), toutes consoles confondues (les 16 consoles scrapées, pas de filtrage en amont).
- Filtres : déjà en collection / en wishlist / ni l'un ni l'autre.
- Vue par défaut : **grille avec jaquettes**, chargement au scroll (vu le volume ~23 500 jeux). Bascule possible vers vue liste.
- Depuis une fiche du catalogue : ajout en un clic à la wishlist ou à la collection, avec pré-remplissage automatique des infos (titre, jaquette, année...) ; seules les infos personnelles (prix, état, date) restent à saisir.

### 3.4 Dashboard

- Statistiques : nombre de jeux en collection, nombre en wishlist, répartition par console (graphique barres/camembert).
- Derniers jeux ajoutés/modifiés (collection et wishlist).
- Budget total dépensé (chiffre instantané, pas de suivi temporel au MVP).
- Accès rapides vers collection, wishlist, catalogue.

### 3.5 Consoles physiques (collection et wishlist matériel)

> Ajouté lors de la réconciliation avec le schéma de base pré-existant (§9) — pas dans le cadrage fonctionnel initial, mais retenu comme fonctionnalité à part entière.

- En plus des jeux, suivi des **consoles elles-mêmes** que tu possèdes ou recherches.
- **Collection de consoles** : complétude et état de conservation (mêmes échelles qu'un jeu, §3.1), standard vidéo (NTSC/PAL/SECAM), présence câbles/manette, quantité, date d'acquisition, prix payé, lieu d'achat, notes.
- **Wishlist de consoles** : standard vidéo recherché, date de dernière vérification.
- Mêmes principes que pour les jeux : pas de doublon d'entrée (une ligne par console, avec quantité), suppression définitive sans corbeille.

## 4. Notifications

- **MVP** : notifications internes à l'application (toast / bandeau) pour les succès (ajout réussi, wishlist mise à jour, synchro terminée) et les erreurs (échec d'ajout, problème de synchro/import).
- Pas de push système (OS) au MVP — envisageable en v2.
- Historique des notifications conservé **30 jours glissants**.

## 5. Design et thèmes

- Système de thèmes avec **4 thèmes prédéfinis** : Minimal, Dark Gaming, Neon, Retro — première proposition en interprétation libre, à affiner ensuite ensemble.
- Changement de thème **instantané** (sans rechargement de page), appliqué à toute l'application, conservé entre les sessions.
- Écrans à soigner particulièrement : catalogue/détail jeu, collection, wishlist, dashboard.
- Vues multiples (liste / grille / arborescence par console) avec tri et filtres sur collection, wishlist et catalogue.

## 6. Actions (ajouter / modifier / supprimer)

- Ajout manuel : recherche dans le catalogue existant + pré-remplissage automatique, seules les infos perso (prix, état, date) sont saisies à la main.
- Suppression : confirmation simple avant suppression définitive (pas de corbeille).
- Feedback clair après chaque action (succès/échec) via le système de notifications internes.

## 7. Stack technique retenue

- **Frontend** : Angular, en PWA (`@angular/pwa` pour le manifest + service worker), thèmes gérés par variables CSS/SCSS switchables à la volée.
- **Backend** : Express (Node.js), API REST.
- **Base de données** : PostgreSQL, accès en **SQL brut** via `pg` (pas d'ORM) — cohérent avec le boilerplate backend habituel (pattern `src/utils/queries` + `src/utils/interfaces/models`, migrations versionnées dans `apps/backend/db/migrations/`, voir §9).
- **Stockage images** : stockage objet compatible S3 (ex. Cloudflare R2) pour les ~244 000 jaquettes, à migrer plus tard (voir §8) — en local/serveur pour démarrer.
- **Hébergement** : Railway ou Render (API + Postgres managé), garantissant une base centrale unique pour PC et mobile.
- **Pas de deadline fixée** — développement itératif, en priorisant collection + wishlist + catalogue basique avant le reste.

## 8. Conventions de développement

- **Organisation du code** : monorepo avec Bun workspaces — `/apps/frontend` (Angular), `/apps/backend` (Express), `/packages/shared-types` (types TypeScript partagés entre front et back, ex: modèles Jeu/Collection/Wishlist).
- **Package manager / runtime** : Bun.
- **Angular** : composants standalone (pas de NgModules), gestion d'état via Signals + services injectables (pas de NgRx).
- **Styling** : SCSS pur + Angular CDK pour les briques comportementales (overlay, drag&drop), pas de librairie de composants imposée — nécessaire pour supporter 4 thèmes visuels très différents (Minimal/Dark Gaming/Neon/Retro).
- **TypeScript** : mode strict activé partout (front et back).
- **Qualité de code** : ESLint + Prettier.
- **Tests** : pas de tests automatisés pour le MVP — à réévaluer si le projet grandit.
- **Git** : commits directs sur `main`, pas de branches par fonctionnalité (projet perso solo).
- **Configuration / secrets** : fichiers `.env` (non commités) en local, variables d'environnement configurées directement sur Railway/Render en production.
- **Déploiement** : manuel pour le MVP (pas de CI/CD dans un premier temps).
- **Images de jaquettes** : servies en local/serveur pour démarrer ; migration vers un stockage cloud (ex. Cloudflare R2) à planifier ensemble dans une étape dédiée une fois le MVP fonctionnel.

## 8bis. Tutoriel — remettre l'environnement en place

> À utiliser après une suppression de `node_modules` et/ou de `apps/backend/public/covers` (ex. nettoyage disque). La base de données Postgres (conteneur Docker `collect_play_postgres`) n'est **pas concernée** par ces suppressions : tant que le conteneur/volume Docker existe, aucune donnée (jeux, wishlist, collection) n'est perdue — seuls les fichiers de dépendances et les fichiers image sont à régénérer.

**1. Vérifier/démarrer Docker et la base**

```
docker start collect_play_postgres
```

Si la commande échoue avec « No such container », c'est que le conteneur lui-même a été supprimé (pas juste arrêté) — dans ce cas, contacter avant de continuer : il faudra recréer le conteneur avec les identifiants ci-dessous et **rejouer les migrations** (`apps/backend/db/migrations/0001_init.sql` à `0004_collection_multi_region.sql`, dans l'ordre), ce qui reperd les données. Identifiants (dans `apps/backend/.env`, non commité) : `DB_NAME=collect_play_db`, `DB_USER=roydev`, `DB_PASSWORD=roydev_secret`, port `5432`.

Vérifier que les données sont bien là :
```
docker exec collect_play_postgres psql -U roydev -d collect_play_db -c "SELECT COUNT(*) FROM ref_game;"
```
→ doit renvoyer environ 23 594. Si le conteneur est neuf/vide, voir le paragraphe ci-dessus.

**2. Réinstaller les dépendances**

Le repo est un monorepo à deux gestionnaires de paquets : **Bun** pour la racine + le backend (`bun.lock` à la racine), **npm** pour le frontend (son propre `package-lock.json`, `apps/frontend/package.json` déclare `"packageManager": "npm@11.8.0"`). Les deux commandes sont nécessaires :

```
cd "C:\Users\franc\Desktop\WishGames"
bun install

cd apps\frontend
npm install
```

**3. Régénérer les jaquettes (`apps/backend/public/covers`)**

Le dossier `covers` n'est pas versionné (fichiers images, trop volumineux) — il est reconstruit à partir du scraper LaunchBox (`C:\Users\franc\Desktop\scrapper_launchbox`, doit toujours exister sur la machine). Le script d'import est **idempotent** : il réinsère/actualise les lignes `ref_game`/`ref_cover` sans dupliquer et recopie les fichiers manquants, donc sans risque de le relancer même si la base est déjà peuplée.

```
cd apps\backend
bun run import:launchbox
```

Ça prend 1 à 2 minutes. Doit se terminer par `Termine. jeux=23594 jaquettes=90649 fichiers-manquants=0`. Si `fichiers-manquants` n'est pas à 0, vérifier que `C:\Users\franc\Desktop\scrapper_launchbox\output\*.json` et les images source associées sont bien présents.

**4. Démarrer l'application**

Deux terminaux séparés (voir aussi les instructions détaillées données en session, mêmes commandes) :
```
cd apps\backend
bun run start
```
```
cd apps\frontend
npm run start
```
Puis ouvrir `http://localhost:4300`. Le backend doit afficher `API ready to receive requests on port 6001.` avant que le frontend n'affiche des données.

**Ce qui n'a PAS besoin d'être refait** : la wishlist (724 jeux importés, `ref_wishlist`), le schéma de base et ses migrations, la collection existante — tout ça vit dans le volume Docker Postgres, pas dans les fichiers supprimés.

## 9. Schéma de base de données (SQL brut) — appliqué

> **Historique** : une première proposition avait été rédigée en Prisma (camelCase, cuid). En ouvrant `apps/backend`, on a découvert qu'une base `collect_play_db` existait déjà (boilerplate perso réutilisé, conteneur Docker `collect_play_postgres`), avec un schéma bien plus riche (`ref_`/`lov_`/`assoc_`, UUID, préfixes `ll_`/`nb_`/`ts_`/`flag_`) : gestion multi-plateforme par jeu, multi-utilisateur, condition détaillée par composant, consoles physiques, sessions de jeu, journal d'activité, genres/gameplay normalisés en tables. Toutes les tables étaient vides (0 ligne) — le schéma a été **réconcilié fonctionnalité par fonctionnalité** avec l'utilisateur, puis appliqué (ancien schéma supprimé, nouveau créé via `apps/backend/db/migrations/0001_init.sql`). Prisma a été retiré : le backend reste en SQL brut + `pg`, cohérent avec le boilerplate habituel (pattern `src/utils/queries` + `src/utils/interfaces/models`).

**Décisions de réconciliation** :
- **Portages/multi-plateforme : ignorés** (confirmé). Un jeu = une ligne par (console, `moby_id`) uniquement, pas de table d'association jeu↔plateforme. Justifié par l'utilisateur avec des exemples concrets (Aladdin sur SNES ≠ Aladdin sur Genesis en contenu réel, Gradius sorti sur Famicom/PS1/PS2/NEC avec des versions différentes) : regrouper ces jeux sous une seule fiche donnerait l'impression trompeuse que c'est le même contenu.
- **Consoles physiques : ajoutées** (nouvelle fonctionnalité, §3.5) — collection et wishlist du matériel lui-même, pas seulement des jeux.
- **Mono-utilisateur strict** (conforme à §1) — pas de `ref_user`/`ref_api_keys`, pas de colonne `id_user`.
- **État détaillé par composant** (repris du schéma existant, remplace le modèle à 2 champs de la première proposition) : `completeness` (composition globale) + une condition par composant (boîte / notice / média / globale).
- **Offres wishlist multiples** (repris du schéma existant) : plusieurs offres (prix + source) possibles par jeu recherché, via `ref_wishlist_offer`.
- **Pas de journal d'activité persistant** : on garde les notifications éphémères 30 jours (§4) uniquement, pas de table d'audit long terme.
- **Pas de suivi des sessions de jeu** : hors périmètre.
- **Genres/gameplay/perspective/visual/setting/développeurs/éditeurs en listes de texte simples** (`text[]`), pas de tables de référence normalisées (`lov_*`) : pas de besoin de navigation/filtrage par ces axes au MVP.
- **Pas de soft-delete** (`flag_active` retiré, présent dans le schéma existant) : conforme à §6, suppression définitive sans corbeille.
- **Pas d'estimation de valeur de marché** (`nb_estimated_value` du schéma existant retiré) : conforme à §3.1, seule la somme des prix payés est affichée.

**Schéma appliqué** (`apps/backend/db/migrations/0001_init.sql`, 9 tables) :

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE FUNCTION fn_set_ts_update() RETURNS trigger ... -- met à jour ts_update à chaque UPDATE

CREATE DOMAIN completeness_t AS text CHECK (VALUE IN ('LOOSE', 'LOOSE_MANUAL', 'BOXED', 'CIB', 'SEALED', 'NOS'));
CREATE DOMAIN condition_t AS text CHECK (VALUE IN ('MINT', 'NEAR_MINT', 'EXCELLENT', 'VERY_GOOD', 'GOOD', 'FAIR', 'POOR'));
CREATE DOMAIN video_standard_t AS text CHECK (VALUE IN ('NTSC', 'PAL', 'SECAM'));

ref_console            -- consoles (17 scrapées via LaunchBox, voir §2) : slug, nom, fichier source, libellé(s) de plateforme source
ref_game               -- jeux : (id_console, nb_source_id) unique, titre, aka, description, année, genres/gameplay/perspective/visual/setting (text[]),
                       -- note + nb votes (source), développeurs/éditeurs (text[]), url fiche source
ref_cover              -- jaquettes : (id_game, ll_cover_type) unique — un type par jeu, édition/région déjà figée à l'import (PAL→USA→Japon)
ref_collection         -- jeux possédés : quantité, completeness, condition globale + boîte/notice/média, date/prix/lieu d'acquisition, notes
ref_wishlist           -- jeux recherchés : complétude/condition désirées (optionnelles), date de dernière vérification
ref_wishlist_offer     -- offres multiples par jeu recherché (prix, libellé source, URL)
ref_console_collection -- consoles possédées : quantité, completeness, condition, standard vidéo, câbles/manette, acquisition
ref_console_wishlist   -- consoles recherchées : standard vidéo désiré, dernière vérification
ref_notification       -- notifications internes (succès/erreur), purge après 30 jours glissants (§4)
```

Voir le fichier `apps/backend/db/migrations/0001_init.sql` pour le détail complet des colonnes, contraintes et index.

**Migration `0002_launchbox_source.sql` (appliquée 2026-07-08)** — adaptation du schéma au changement de source MobyGames → LaunchBox (§2) :
- `ref_game.nb_moby_id` → `nb_source_id` (identifiant du jeu côté source, ici LaunchBox).
- `ref_game.nb_moby_score` → `nb_rating` (note source, `community_rating` LaunchBox 0-5) + ajout `nb_rating_votes` (`total_votes` LaunchBox).
- `ref_game.ll_moby_url` → `ll_source_url`.
- `ref_cover.ll_group_id` **supprimé** : pas d'équivalent côté LaunchBox (la région est déjà portée par `ll_region`, la notion de `group_id` MobyGames n'existe pas).
- `ref_game.ll_gameplay`/`ll_perspective`/`ll_visual`/`ll_setting` conservés en base (vides pour l'import LaunchBox, qui n'a qu'un champ `genres` unique) — gardés pour compatibilité si une source future les fournit à nouveau.

**Migration `0003_wishlist_regions_priority.sql` (appliquée 2026-07-08)** — support de l'import de la wishlist Excel (§2ter) :
- `ref_wishlist.ll_desired_regions text[]` ajouté : régions acceptées pour ce jeu (ex. `{USA,EU,JAPON}`), une seule entrée `ref_wishlist` par jeu plutôt qu'une par région.
- `ref_wishlist.nb_priority integer` (CHECK 1-5) ajouté : priorité de recherche, reprise de la colonne `Pririoty` du fichier Excel.

**Migration `0004_collection_multi_region.sql` (appliquée 2026-07-10)** — suivi de plusieurs éditions régionales du même jeu séparément en collection (ex. Crash Bandicoot PAL + USA + Japon possédés en parallèle, décision utilisateur) :
- Vérification préalable dans les données LaunchBox brutes (`scrapper_launchbox/output/*.json`) : **une seule fiche jeu par (console, source_id)**, avec les jaquettes de plusieurs régions déjà groupées dans le champ `media` de cette même fiche (pas de fiches séparées par région côté LaunchBox). Le catalogue (`ref_game`) n'a donc pas changé de forme ; c'est `ref_cover` et `ref_collection` qui ont été adaptées.
- `ref_cover` : contrainte `UNIQUE(id_game, ll_cover_type)` → `UNIQUE(id_game, ll_cover_type, ll_region)` — une jaquette par région disponible au lieu d'une seule choisie par priorité à l'import.
- `ref_collection` : contrainte `UNIQUE(id_game)` **retirée**, colonne `ll_region text` ajoutée, nouvelle contrainte `UNIQUE(id_game, ll_region)` — plusieurs lignes de collection possibles pour un même jeu, une par région suivie séparément (chacune avec son propre état/prix/notes/quantité).
- Script `import-launchbox.ts` modifié : `pickCover()` → `pickCovers()`, importe désormais une image par région prioritaire disponible (Europe/USA/Japon, repli sur la première dispo sinon) au lieu d'une seule ; noms de fichiers suffixés par région (ex. `front-europe.jpg`, `front-japan.jpg`). Ré-exécuté avec succès : **90 649 jaquettes** (vs 66 140 avant), 0 fichier manquant.
- Backend : toutes les requêtes joignant `ref_cover` sur `ll_cover_type = 'FRONT'` (catalogue, collection, wishlist, dashboard) sont passées d'un simple `LEFT JOIN` à un `LEFT JOIN LATERAL ... ORDER BY (priorité région) LIMIT 1`, pour continuer à afficher une seule jaquette par défaut dans les vues liste sans dupliquer les lignes (un jeu a maintenant potentiellement plusieurs jaquettes FRONT). Pour une ligne de collection précise, la jaquette de sa propre région est privilégiée si connue (`col.ll_region`), sinon repli sur la priorité globale. Les indicateurs `in_collection`/`in_wishlist` du catalogue sont passés de `LEFT JOIN ... IS NOT NULL` à `EXISTS (...)` pour la même raison (éviter la duplication de lignes).
- **Bug rencontré et corrigé** : dans `GameQueries.list()`, le `LEFT JOIN LATERAL` de la jaquette avait été placé après la clause `WHERE` (héritage d'un refactor `count`/`list` partagé) — syntaxiquement invalide en SQL (JOIN doit précéder WHERE). Corrigé en séparant proprement les `FROM` du comptage et de la liste.

**Migration `0005_offer_notes_and_console_offers.sql` (appliquée 2026-07-12)** — annotation libre par offre + suivi d'offres multiples pour la wishlist de consoles (retour utilisateur : « rajouter plusieurs prix, ex. vu 50€ sur Leboncoin, complet ») :
- `ref_wishlist_offer.ll_notes text` ajouté : annotation libre sur une offre précise (ex. « complet en boîte »), distincte des critères de recherche globaux du jeu.
- `ref_console_wishlist_offer` créée, symétrique à `ref_wishlist_offer` mais pour `ref_console_wishlist` (`id_console_wishlist`, `nb_price`, `ll_source_label`, `ll_source_url`, `ll_notes`) — n'existait pas du tout avant pour le matériel physique.
- Décision utilisateur sur la forme de l'annotation : un champ texte libre plutôt qu'une réutilisation des échelles `completeness_t`/`condition_t` existantes (jugées trop lourdes pour une simple note de veille prix).

**Migration `0006_offer_completeness_condition.sql` (appliquée 2026-07-12)** — retour utilisateur ultérieur, revient partiellement sur la décision de la migration `0005` ci-dessus : la note libre reste (annotations informelles), mais l'utilisateur souhaite en plus des champs structurés réutilisant les échelles existantes, pour un exemple précis (« vu sur Vinted à 50€, complet boîte et jeu bon état et notice très bon état ») :
- `ref_wishlist_offer` : `ll_completeness completeness_t`, `ll_condition_media/box/manual condition_t` (même détail jeu/boîte/notice que `ref_collection`).
- `ref_console_wishlist_offer` : `ll_completeness completeness_t`, `ll_condition_overall condition_t` (état global, même granularité que `ref_console_collection`).
- Toutes les colonnes restent optionnelles (une offre reste une annotation informelle, pas une fiche complète comme la Collection).

**Points d'attention** :
- `ref_game` : contrainte d'unicité sur `(id_console, nb_source_id)`, pas sur `nb_source_id` seul — un même identifiant source peut réapparaître sous une autre console (portages ignorés, §2bis).
- `ref_console.ll_platform_names` porte le(s) libellé(s) de plateforme LaunchBox (ex. `"Sega Genesis"`) — un seul élément par console avec la source actuelle, tableau conservé pour flexibilité future.
- `ref_cover` : pas de valeur pour `MANUAL_FRONT`/`MANUAL_BACK` avec la source LaunchBox actuelle (aucune jaquette de manuel disponible, voir §2) — les valeurs restent autorisées par le `CHECK` mais aucune ligne n'est insérée pour ces deux types.
- `ref_wishlist` garde sa relation 1:1 avec `ref_game` (`id_game UNIQUE`) : un jeu est soit en collection, soit en wishlist, jamais les deux (§3.2) — exclusivité gérée par l'application (le bouton "Acheter" supprime la ligne wishlist et crée la ligne collection), pas par contrainte SQL. Même principe pour `ref_console_wishlist`/`ref_console_collection` (non modifiées par la migration 0004, un seul exemplaire matériel suivi par console — pas de besoin exprimé de suivi multi-région pour le matériel).
- `ref_collection` **n'a plus** de relation 1:1 avec `ref_game` depuis la migration `0004` (voir ci-dessus) : plusieurs lignes possibles par jeu, une par région (`ll_region`, nullable).
- Prix stockés en `numeric(10,2)` pour éviter les erreurs d'arrondi flottant.
- Vocabulaires contrôlés (`completeness_t`, `condition_t`, `video_standard_t`) implémentés en `DOMAIN` Postgres plutôt qu'en tables `lov_*` : évite la normalisation superflue pour des listes de valeurs fixes qui ne nécessitent pas d'administration.
- **État sur deux axes** (`Completeness` / `Condition`, standard collectionneur retrogaming, §3.1) : `Completeness` décrit la composition de l'exemplaire (Loose/Loose+Manual/Boxed/CIB/Sealed/NOS), `Condition` décrit l'usure (Mint → Poor). Les deux champs sont **requis** sur `CollectionItem` (un exemplaire réel a toujours les deux), mais **optionnels** sur `WishlistItem` (`desiredCompleteness`/`desiredCondition`) car ce sont des critères de recherche, pas toujours stricts. Pas de contrainte de cohérence entre les deux axes (ex. `SEALED` + `POOR` reste possible en base même si incohérent en pratique) — validation légère éventuelle côté formulaire, pas au niveau schéma.

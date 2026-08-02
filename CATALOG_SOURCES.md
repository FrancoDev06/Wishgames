# Suivi des sources du catalogue

État après la reconstruction du 2026-07-27 (croisement MobyGames API payante + LaunchBox). Sert à
savoir, console par console, quelle source alimente le catalogue en base et ce qu'il reste à faire.

## Sauvegarde avant reconstruction

Toutes les tables de la base Supabase telle qu'elle était avant le vidage (17 consoles LaunchBox
seules, 23 594 jeux, 112 626 jaquettes, **30 jeux + 2 consoles de ta vraie collection**) ont été
exportées dans :

```
backups/supabase-backup-2026-07-27T11-52-53-582Z.json
```

Rien n'a été perdu, mais **ta collection réelle (30 jeux, 2 consoles) n'a pas été réimportée** —
le vidage était total sur demande explicite. À réintégrer manuellement si besoin en repartant de
ce fichier (titres/consoles/régions listés dedans, à retrouver dans le nouveau catalogue par
titre).

## Consoles reconstruites (mobygames-api payant + LaunchBox croisés)

Source jeux/genres/description/notes : MobyGames (prioritaire) avec repli LaunchBox si absent.
Source régions + jaquettes (FRONT/BACK/SPINE/MEDIA) : fusion des deux — `cover_groups`/`countries`
MobyGames (vraies régions par édition, raison d'être de l'abonnement payant) + `media` LaunchBox
(Box 3D en plus). Images hotlinkées (CDN MobyGames + LaunchBox), pas de copie locale.

| Console | Jeux | Jaquettes | Sources |
|---|---:|---:|---|
| Sega Dreamcast | 856 | 4 834 | MobyGames + LaunchBox |
| Nintendo GameCube | 766 | 4 943 | MobyGames + LaunchBox |
| Sega Genesis | 1 282 | 8 801 | MobyGames + LaunchBox |
| Nintendo Entertainment System | 1 988 | 9 909 | MobyGames + LaunchBox |
| Nintendo 64 | 445 | 3 446 | MobyGames + LaunchBox |
| Sony PlayStation | 5 077 | 28 010 | MobyGames + LaunchBox |
| Sega Master System | 415 | 3 043 | MobyGames + LaunchBox |
| Sega Saturn | 1 455 | 7 963 | MobyGames + LaunchBox |
| Super Nintendo Entertainment System | 2 017 | 10 844 | MobyGames + LaunchBox |
| NEC TurboGrafx-CD | 533 | 2 067 | MobyGames + LaunchBox |
| NEC TurboGrafx-16 | 361 | 1 874 | MobyGames + LaunchBox |
| NEC SuperGrafx (nouvelle console) | 7 | 11 | MobyGames seul (pas de fichier LaunchBox) |
| **TOTAL** | **15 202** | **85 745** | |

Scripts : `apps/backend/scripts/build-master-list-v2.ts` (fusion, sort dans
`apps/backend/scripts/master-lists-v2/<slug>.json`) puis `apps/backend/scripts/import-master-catalog.ts`
(vide la base et réimporte).

## Consoles exclues de cette passe (à reprendre plus tard)

Pas couvertes par le scraping mobygames-api de cette session (autre sélection de plateformes) —
données sources toujours disponibles, rien n'est perdu, juste absentes du catalogue en base pour
l'instant :

| Console | Ancienne source | Où retrouver les données |
|---|---|---|
| Sony PlayStation 2 | LaunchBox seul (23 585 jeux dans l'ancien import) | `Wish/output/sony-playstation-2.json` |
| Sony PlayStation 3 | LaunchBox seul | `Wish/output/sony-playstation-3.json` |
| Sony PlayStation 4 | LaunchBox seul | `Wish/output/sony-playstation-4.json` |
| Sega CD | LaunchBox seul | `Wish/output/sega-cd.json` |
| Sega 32X | LaunchBox seul | `Wish/output/sega-32x.json` |
| Nintendo Famicom Disk System | LaunchBox seul | `Wish/output/nintendo-famicom-disk-system.json` |
| Nintendo Wii | MobyGames gratuit, pas de région | `retro_collection/scraper/data/platform-games/wii.json` |
| Nintendo Wii U | MobyGames gratuit, pas de région | `retro_collection/scraper/data/platform-games/wii-u.json` |
| Game Boy | MobyGames gratuit, pas de région | `retro_collection/scraper/data/platform-games/gameboy.json` |
| Game Gear | MobyGames gratuit, pas de région | `retro_collection/scraper/data/platform-games/game-gear.json` |
| Neo Geo | MobyGames gratuit, pas de région | `retro_collection/scraper/data/platform-games/neo-geo.json` |

**Non ajoutées du tout** (scrapées par mobygames-api mais hors périmètre, décision utilisateur
2026-07-27) : Atari 5200, Atari 7800, Atari ST — données présentes dans `mobygames-api/data`
(platform_id 33/34/24) si besoin de les ajouter plus tard.

## Prochaine étape suggérée

Relancer `mobygames-api` (sélection de plateformes) sur PS2/PS3/PS4/Wii/Wii U/Game Boy/Game
Gear/Neo Geo/Sega CD/32X/Famicom Disk System pour leur faire bénéficier des mêmes vraies régions
par édition, puis les fusionner dans `build-master-list-v2.ts` de la même manière.

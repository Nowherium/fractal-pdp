# CLAUDE.md

Contexte de travail pour Claude Code ou toute autre IA intervenant sur `fractal-pdp`.

## Objectif

Faire des changements **petits, sûrs et vérifiés**. Ne pas « simplifier » l’architecture ou la persistance d’une manière qui réintroduit d’anciens bugs.

## Stack rapide

- **Frontend** : React 18 + Vite 5 + TypeScript (`strict: true`)
- **Backend** : Express + PostgreSQL (`pg`)
- **Proxy local** : Caddy
- **URL de dev locale** : `https://fractal.dev.local`

## Commandes à lancer avant d’annoncer que c’est terminé

```bash
npm run format:check && npm run typecheck && npm run lint && npm run build && npm test
```

## Commandes utiles

```bash
npm run start:watch      # backend
npm run dev              # frontend Vite
docker compose up -d     # stack locale avec Caddy + DB
```

## Règles importantes / pièges à éviter

### 1) Vérification locale

- Utiliser **`https://fractal.dev.local`** plutôt que `localhost` pour les checks applicatifs.
- Si la résolution DNS locale n’est pas active :
  ```bash
  curl --resolve fractal.dev.local:443:127.0.0.1 https://fractal.dev.local/
  ```
- La vue principale `Ville` est accessible sur `https://fractal.dev.local/ville`.

### 2) Base de données et persistance

- `server/db.ts` est une **façade** ; la logique réelle est dans `server/db/**`.
- Les sauvegardes sont **incrémentales / UPSERT**, pas des suppressions globales suivies d’un réimport complet.
- **Ne pas réintroduire** d’ancienne compatibilité DB ni de fallback legacy.
- `server/sql/schema.sql` est la source SQL de référence actuelle.

### 3) Modèle timeline / lunes

- `cities.current_lune` persiste la lune courante.
- `lunes.id` est normalisé en séquence entière (`1, 2, 3, ...`).
- `lunes.constructions` remplace l’ancien champ `coutMat` : **ne pas réintroduire `coutMat`**.
- Chaque lune peut persister une météo par ressource (`eau`, `nrt`, `med`, `mat`).

### 4) Groupes / inventaire

- **Supprimer un groupe ne supprime pas les persos** : on enlève seulement l’affectation au groupe.
- Les règles métier importantes sont couvertes dans `tests/groupInventoryActions.test.ts`.

### 5) UI / composants

- Préférer les composants partagés de `src/components/ui/` :
  - `Button`
  - `Panel`
  - `Field`
  - `InfoText`
  - `ToastViewport`
- Éviter de réintroduire des styles legacy ou des classes `btn-*` ad hoc quand un composant partagé existe déjà.
- Le texte UI est majoritairement en **français** ; rester cohérent avec le vocabulaire existant.
- Les confirmations destructives se gèrent côté UI ; éviter les doubles confirmations dans les helpers bas niveau.

### 6) Qualité attendue

- Garder TypeScript **strict** et ESLint propre.
- Éviter `any` si possible.
- Préférer des changements ciblés à de gros refactors opportunistes.
- Ne pas casser le formatage Prettier ni le hook de pre-commit.

## Carte rapide du projet

- `src/hooks/*` : orchestration des actions et de l’état
- `src/utils/appDataIO.ts` : import/export/reset des données
- `server/index.ts` : routes API Express
- `server/db/**` : implémentation DB par domaine
- `tests/timelineSimulation.test.ts` : simulation timeline
- `tests/groupInventoryActions.test.ts` : groupes + inventaire

## État validé au 2026-04-04

- `format:check` ✅
- `typecheck` ✅
- `lint` ✅
- `build` ✅
- `test` ✅ (`12/12`)

## Docker

- Les images Docker ont déjà été durcies récemment.
- Ne pas redescendre vers d’anciennes bases Node/Alpine sans raison explicite.

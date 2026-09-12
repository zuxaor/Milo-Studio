# Milo Studio

Prototype web de Milo Studio, entièrement en français.

## Lancer en local

```bash
npm install
npm run dev
```

Puis ouvrir l'adresse indiquée par Vite.

## Important

Le prototype ne prétend pas générer de vidéo sans moteur connecté.
La génération réelle devra être branchée côté serveur à un moteur vidéo/audio/lip-sync.
Ne mets jamais de clé API secrète dans `src/`.

## Structure

- `src/main.jsx` : application
- `src/styles.css` : interface
- `package.json` : dépendances

Le projet utilise localStorage pour les projets dans cette première version.

# RISK — Conquête du Monde

Emulateur du jeu risk : React 19 + TypeScript + Vite, animations avec Motion, état avec Zustand.

## Fonctionnalités

- **Français / anglais** : toute l'interface, les noms des territoires et le journal (langue du navigateur par défaut, modifiable dans le menu ou les réglages).
- **Vidéo de présentation** en motion design : 8 chapitres animés, sous-titres, voix off (synthèse vocale du navigateur) et contrôles de lecture. Elle s'ouvre à la première visite, puis depuis le bouton « Vidéo ».
- **Multijoueur**
  - sur un même appareil : un écran de passage cache le jeu entre deux joueurs humains ;
  - **en ligne**, chacun sur son appareil : l'hôte crée un salon et partage un code ou un lien (`#/room/CODE`). La partie tourne dans le navigateur de l'hôte, qui valide les coups des invités et fait jouer les ordinateurs (pair-à-pair WebRTC via PeerJS, aucun serveur à héberger). Reconnexion automatique, reprise du salon après rechargement, et une place absente peut être confiée à l'ordinateur.
- **Conseiller militaire** pour les joueurs humains : conseil expliqué pour la phase en cours (renforts, échange de cartes, attaque, manœuvre), mis en évidence sur la carte et applicable d'un clic ; probabilité exacte de conquête en blitz ; alertes sur les continents adverses et les frontières menacées.
- Trois niveaux d'IA, thèmes clair / sombre / automatique, vitesse des animations, sauvegarde automatique.

## Scripts

| Commande | Rôle |
| --- | --- |
| `npm run dev` | serveur de développement Vite |
| `npm test` | tests Vitest (probabilités, i18n, conseiller, protocole en ligne, store) |
| `npm run typecheck` | vérification TypeScript |
| `npm run build` | build de production |
| `npm run simulate` | parties complètes entre IA |
| `npm run check-map` | vérification de la carte |

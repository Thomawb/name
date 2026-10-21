# Booster Positive

Page web d'ouverture de booster (façon cartes Pokémon / wiki-masters) aux couleurs de l'agence Positive.

## Lancer

Ouvrir `index.html` dans un navigateur (aucune dépendance, aucun build).

## Fonctionnement

1. **Maintenir appuyé** le booster (souris, doigt, ou Espace/Entrée) pendant 3 s : il se secoue, grossit et la ligne de déchirure se dessine. Relâcher trop tôt annule.
2. Le haut du pack se **déchire et tombe**, les cartes sortent du paquet, puis le pack disparaît.
3. **Toucher** la carte pour la retourner, puis encore pour passer à la suivante. Les cartes sont révélées de la moins rare à la plus rare (effets : halo, particules, flash pour la légendaire, reflet holographique qui suit le pointeur).
4. Récapitulatif de la collection + bouton pour rouvrir un booster.

## Personnaliser

| Quoi | Où |
| --- | --- |
| Contenu des cartes (titre, image, description, rareté, capacité, infos, lien) | `cards.js` |
| Couleurs, typos, tailles, couleurs de rareté | variables `:root` en haut de `styles.css` |
| Logo, trame, police Bohemian Soul | dossier `assets/` |
| Durée d'appui, hauteur de la déchirure | constantes en haut de `app.js` |

Raretés : commun = rose, rare = bleu, épique = violet, légendaire = jaune. Fond blanc, textes noirs. Titres en Bohemian Soul, textes en Century Gothic (Didact Gothic en secours si la police n'est pas installée).

Sans `image`, une illustration provisoire est générée dans la couleur de la rareté. Les champs marqués `TODO` sont à vérifier avec le contenu exact du site agence-positive.fr.

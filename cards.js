/*
 * Contenu des cartes du booster.
 * ---------------------------------------------------------------
 * Pour modifier une carte, il suffit d'éditer ce fichier.
 *  - rarity : "commun" | "rare" | "epique" | "legendaire"
 *  - image  : URL ou chemin (ex: "assets/celine.jpg"). Laisser vide
 *             pour afficher une illustration générée aux couleurs de l'agence.
 *  - Les champs marqués  TODO  sont à vérifier / compléter avec le
 *    contenu exact du site agence-positive.fr.
 */
window.BOOSTER_CARDS = [
  {
    id: "agence",
    title: "Agence Positive",
    type: "Agence",
    rarity: "epique",
    image: "", // TODO : photo de l'équipe / des locaux / visuel signature
    imageAlt: "L'agence Positive",
    energy: 100,
    description:
      "Une agence de communication qui met du sens et de l'énergie positive au service des marques.", // TODO
    ability: {
      name: "Effet Positif",
      text: "Quand cette carte entre en jeu, toutes vos marques gagnent +2 en clarté et en caractère.",
    },
    facts: [
      { label: "Expertise", value: "Identité visuelle & communication" }, // TODO
      { label: "Site", value: "agence-positive.fr" },
    ],
    link: { label: "Découvrir l'agence", url: "https://agence-positive.fr/" },
  },
  {
    id: "celine",
    title: "Céline",
    type: "Fondatrice",
    rarity: "legendaire",
    image: "", // TODO : portrait de Céline
    imageAlt: "Portrait de Céline, fondatrice de l'agence Positive",
    energy: 150,
    description:
      "Fondatrice de l'agence Positive. Elle transforme les idées en marques qui ont du sens.", // TODO : bio exacte
    ability: {
      name: "Vision créative",
      text: "Une fois par partie, révèle l'identité cachée d'une marque et la rend inoubliable.",
    },
    facts: [
      { label: "Rôle", value: "Fondatrice & directrice" }, // TODO
      { label: "Super-pouvoir", value: "Voir le potentiel partout" },
    ],
    link: null,
  },
  {
    id: "adrpsy",
    title: "ADRpsy",
    type: "Réalisation",
    rarity: "rare",
    image: "", // TODO : visuel du projet ADRpsy
    imageAlt: "Nouvelle identité visuelle ADRpsy",
    energy: 80,
    description:
      "Évolution de l'identité visuelle de l'Association pour le Développement de la Recherche en Soins en Psychiatrie.",
    ability: {
      name: "Nouvelle identité",
      text: "Donne à la recherche en soins psychiatriques une image claire, moderne et rassembleuse.",
    },
    facts: [
      { label: "Client", value: "ADRpsy (association, créée fin 2022)" },
      { label: "Mission", value: "Évolution d'identité visuelle" },
    ],
    link: {
      label: "Voir le projet",
      url: "https://agence-positive.fr/realisation/adrpsy-evolution-identite-visuelle/",
    },
  },
];

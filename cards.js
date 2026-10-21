/*
 * Contenu des cartes du booster.
 * ---------------------------------------------------------------
 * Pour modifier une carte, il suffit d'éditer ce fichier.
 *  - rarity : "commun" (corail) | "rare" (bleu) | "epique" (violet) | "legendaire" (jaune/orange)
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
      "Agence de communication responsable pour les entreprises, collectivités et associations du Val de Saône, de la Dombes et du Beaujolais.",
    facts: [
      { label: "Basée à", value: "Savigneux" },
      { label: "Site web", value: "0,16 g de CO₂ par vue" },
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

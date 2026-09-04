export const SUCCESS_MESSAGES: string[] = [
  "Ça, c'était limite trop facile pour toi.",
  "Stop, on va croire que t'as triché.",
  "T'as répondu plus vite que ton ombre.",
  "Tranquille, comme si t'étais né avec un atlas dans le berceau.",
  "On dirait que t'as un GPS greffé dans le cerveau.",
  "Bon ok là tu commences à faire peur.",
  "T'as sorti ça sans trembler, respect total.",
  "Impossible de te piéger toi, hein.",
  "T'es en train de ruiner la moyenne des autres, là.",
  "Franchement, t'as pas volé tes points.",
  "Tu collectionnes les capitales comme d'autres les timbres.",
  "On sent l'ancien élève studieux qui sommeille en toi.",
  "T'as dégainé ça plus vite que ton café du matin.",
  "Ok, on arrête de te sous-estimer à partir de maintenant.",
  "Y'a un before/after cette réponse, clairement.",
  "T'as fait ça les doigts dans le nez.",
  "C'est le genre de réponse qui muscle l'ego.",
  "Petit rappel : le hasard, c'est pas ton truc, t'assures vraiment.",
  "T'as dû réviser en cachette, avoue.",
  "La classe, rien à redire.",
];

export const FAILURE_MESSAGES: string[] = [
  "Après tout, la moitié de la population est en dessous de la moyenne.",
  "Au village, c'est toi qui cours après le facteur depuis que le chien est mort.",
  "C'est pas de ta faute si c'est pas marqué \"ne pas manger\" sur le shampoing.",
  "T'es pas la carpe la plus oxygénée du bassin.",
  "T'es pas la chips la plus croustillante du paquet.",
  "T'es pas la flèche la plus aiguisée du carquois.",
  "T'es pas la lumière la plus brillante du lustre.",
  "T'es pas la perle la plus brillante du collier.",
  "T'es pas la pomme la plus sucrée du verger.",
  "T'es pas le castor le plus utile au barrage.",
  "T'es pas le couteau le plus aiguisé du tiroir.",
  "T'es pas le fromage le plus affiné du terroir.",
  "T'es pas le kouign-amann le plus beurré de la vitrine.",
  "T'es pas le lampadaire qui éclaire le mieux l'allée.",
  "T'es pas le pingouin qui glisse le plus loin.",
  "T'es pas le pigeon qui vole le plus haut.",
  "T'es pas le plus malin de la bande.",
  "T'es pas le plus rapide du peloton.",
  "T'es pas le processeur le mieux cadencé du marché.",
  "T'es pas le rosier le plus fleuri du jardin.",
  "T'es pas le saumon le plus vigoureux de l'Atlantique.",
  "T'es pas le sommet le plus enneigé du massif.",
  "T'es pas le volcan le plus actif d'Auvergne.",
  "T'as 2 neurones qui se battent pour la 3ème place.",
  "T'as de la bonne mécanique, mais personne au volant.",
  "T'as des ampoules mais pas de lumière.",
  "T'as été démoulé trop chaud.",
  "T'as l'étincelle, mais la flamme s'est éteinte.",
  "T'as la boîte, mais pas les outils.",
  "T'as le pâté qui touche le couvercle.",
];

export function getRandomSuccessPunchline(): string {
  const idx = Math.floor(Math.random() * SUCCESS_MESSAGES.length);
  return SUCCESS_MESSAGES[idx];
}

export function getRandomFailurePunchline(): string {
  const idx = Math.floor(Math.random() * FAILURE_MESSAGES.length);
  return FAILURE_MESSAGES[idx];
}

export const LEADER_FLATTERING_MESSAGES: string[] = [
  "Roi/Reine du monde, littéralement.",
  "T'as explosé la concurrence, chapeau.",
  "On t'appelle l'Atlas humain, à partir de maintenant.",
  "T'es sur le toit du monde, et ça se voit.",
  "Les autres jouent pour la deuxième place, en fait.",
  "T'as posé ta couronne de capitales sur cette manche.",
];

export const LAST_PLACE_BITING_MESSAGES: string[] = [
  "T'es la preuve vivante que la sélection naturelle prend parfois des pauses.",
  "T'as tellement raté que même le hasard t'a lâché.",
  "On te propose une carte du monde, t'as réussi à te perdre dans la légende.",
  "Y'a des chances que le GPS te recommande de rester chez toi.",
  "T'as fait un sans-faute... dans le mauvais sens.",
  "Même en fermant les yeux et en pointant au hasard, t'aurais fait mieux.",
  "T'es dernier, et honnêtement, c'était pas très surprenant.",
  "On dirait que la géographie et toi, c'est une histoire qui finit toujours mal.",
];

export function getRandomLeaderPunchline(): string {
  const idx = Math.floor(Math.random() * LEADER_FLATTERING_MESSAGES.length);
  return LEADER_FLATTERING_MESSAGES[idx];
}

export function getRandomLastPlacePunchline(): string {
  const idx = Math.floor(Math.random() * LAST_PLACE_BITING_MESSAGES.length);
  return LAST_PLACE_BITING_MESSAGES[idx];
}

export const RUNNER_UP_MESSAGES: string[] = [
  "2ème place : tu es officiellement le premier des perdants !",
  "Si près du but... et pourtant si loin de la gloire.",
  "La médaille d'argent, c'est comme le bronze mais avec plus de regrets.",
  "Tu as touché la couronne des yeux, mais pas des mains.",
  "Bravo pour cette magnifique place de dauphin... sans couronne.",
  "Presque champion ! Il te manquait juste un coup de pouce du destin.",
];

export function getRandomRunnerUpPunchline(): string {
  const idx = Math.floor(Math.random() * RUNNER_UP_MESSAGES.length);
  return RUNNER_UP_MESSAGES[idx];
}

export const SOLO_DEFEAT_MESSAGES: string[] = [
  "Même en jouant tout seul, t'as réussi à perdre face au quiz.",
  "Le quiz vient de te battre par K.O. technique.",
  "C'était une tentative... pas glorieuse, mais une tentative.",
  "Le score pique un peu les yeux, respire un grand coup.",
  "Rassure-toi, personne d'autre n'a vu ça (sauf nous).",
];

export function getRandomSoloDefeatPunchline(): string {
  const idx = Math.floor(Math.random() * SOLO_DEFEAT_MESSAGES.length);
  return SOLO_DEFEAT_MESSAGES[idx];
}


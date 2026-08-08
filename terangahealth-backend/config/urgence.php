<?php

return [
    'mots_cles' => [

        'Cardiologie' => [
            'douleur thoracique', 'douleur poitrine', 'douleur dans la poitrine',
            'oppression thoracique', 'serrement poitrine', 'brûlure thoracique',
            'essoufflement sévère', 'essoufflement soudain', 'difficulté à respirer',
            'manque d\'air', 'palpitations fortes', 'palpitations intenses',
            'battements irréguliers', 'cœur qui s\'emballe', 'malaise',
            'perte de conscience', 'évanouissement', 'vertiges intenses',
            'crise cardiaque', 'infarctus', 'douleur bras gauche',
            'douleur qui irradie', 'sueurs froides', 'lèvres bleues',
            'gonflement des jambes soudain', 'tension artérielle très élevée',
            'pouls irrégulier', 'douleur cou et mâchoire',
        ],

        'Dermatologie' => [
            'brûlure étendue', 'brûlure grave', 'réaction allergique sévère',
            'gonflement du visage', 'gonflement des lèvres', 'gonflement de la gorge',
            'urticaire généralisée', 'éruption qui s\'étend rapidement',
            'plaie infectée', 'plaie qui suinte', 'peau qui se détache',
            'cloques étendues', 'nécrose', 'morsure infectée',
            'piqûre avec réaction sévère', 'décoloration rapide d\'un grain de beauté',
            'saignement de plaie qui ne s\'arrête pas', 'fièvre avec éruption cutanée',
        ],

        'Diabétologie' => [
            'glycémie très élevée', 'glycémie très basse', 'hypoglycémie sévère',
            'hyperglycémie sévère', 'confusion soudaine', 'tremblements intenses',
            'sueurs froides', 'perte de conscience', 'coma',
            'plaie au pied qui ne cicatrise pas', 'plaie infectée pied diabétique',
            'nausées et vomissements répétés', 'soif intense soudaine',
            'respiration rapide et profonde', 'haleine fruitée', 'vision trouble soudaine',
            'engourdissement soudain', 'perte de sensibilité soudaine',
        ],

        'Pédiatrie' => [
            'fièvre élevée', 'fièvre supérieure à 40', 'fièvre qui ne baisse pas',
            'convulsions', 'crise convulsive', 'difficulté à respirer',
            'respiration sifflante', 'lèvres bleues', 'coloration bleue',
            'déshydratation', 'refus de boire', 'léthargie', 'enfant très mou',
            'enfant inconscient', 'vomissements répétés', 'vomissements en jet',
            'diarrhée avec sang', 'éruption qui ne pâlit pas', 'raideur de la nuque',
            'pleurs inconsolables', 'somnolence anormale', 'chute avec traumatisme crânien',
            'ingestion de produit toxique', 'ingestion accidentelle',
            'étouffement', 'corps étranger avalé', 'brûlure grave enfant',
        ],

        'ORL' => [
            'difficulté à respirer', 'gêne respiratoire', 'stridor',
            'saignement de nez incontrôlable', 'saignement de nez abondant',
            'douleur intense oreille', 'douleur auriculaire brutale',
            'corps étranger', 'objet coincé dans le nez', 'objet coincé dans l\'oreille',
            'perte d\'audition brutale', 'vertiges intenses avec vomissements',
            'gonflement de la gorge', 'difficulté à avaler soudaine',
            'voix qui change brutalement', 'écoulement de l\'oreille avec fièvre',
            'traumatisme du nez', 'fracture du nez',
        ],

        'Gastro-entérologie' => [
            'douleur abdominale intense', 'douleur abdominale brutale',
            'ventre dur et douloureux', 'vomissement de sang', 'sang dans les vomissements',
            'sang dans les selles', 'selles noires', 'selles goudronneuses',
            'déshydratation sévère', 'diarrhée avec fièvre élevée',
            'jaunisse soudaine', 'peau et yeux jaunes', 'douleur qui empêche de bouger',
            'ballonnement sévère', 'arrêt des gaz et des selles',
            'douleur qui descend vers l\'aine', 'fièvre avec douleur abdominale',
        ],

        'Médecine générale' => [
            'urgent', 'urgence', 'insupportable', 'douleur intense',
            'perte de conscience', 'fièvre très élevée', 'difficulté à respirer',
            'saignement abondant', 'traumatisme', 'accident', 'chute grave',
            'confusion soudaine', 'faiblesse soudaine d\'un côté du corps',
            'difficulté à parler soudaine', 'vision double soudaine',
            'engourdissement d\'un côté du corps', 'mal de tête soudain et violent',
        ],
    ],

    // utilisés si le service du rendez-vous ne correspond à aucune liste ci-dessus
    'mots_cles_defaut' => [
        'urgent', 'urgence', 'insupportable', 'douleur intense',
        'perte de conscience', 'difficulté à respirer', 'saignement abondant',
    ],
];
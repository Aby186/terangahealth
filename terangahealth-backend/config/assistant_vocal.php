<?php

/*
 * Phrases fixes de l'assistant vocal.
 * 'fr' : texte affiché à l'écran. 'wo' : texte prononcé par la voix.
 * Tant qu'une phrase 'wo' contient "À ÉCRIRE EN WOLOF", aucun audio n'est généré pour elle.
 */
return [

    'salutation' => [
        'fr' => "Bonjour, je suis l'assistant TerangaHealth. Quelle spécialité souhaitez-vous consulter ?",
        'wo' => 'Salam Aleykum mane la assistant bi lane gua bëggoon  seet ?',
    ],

    'repeter' => [
        'fr' => "Je n'ai pas bien entendu. Pouvez-vous répéter ?",
        'wo' => 'Degguma bu baax. Meuneun nga ko waxaat?',
    ],

    'specialite_inconnue' => [
        'fr' => "Je n'ai pas compris la spécialité. Vous pouvez dire par exemple cardiologie ou médecine générale.",
        'wo' => 'Comprendre wuma specialite bi. Meuneun nga ne par exemple cardiology wala medecine generale.',
    ],

    'creneaux' => [
        'fr' => 'Voici les prochains créneaux disponibles. Lequel choisissez-vous ?',
        'wo' => 'medecin bi jour yi guako meuneu guiss Yan ci ñoom ngay tànn?',
    ],

    'aucun_creneau' => [
        'fr' => "Il n'y a aucun créneau disponible pour cette spécialité pour le moment.",
        'wo' => 'Doktoor bi amagoul ben jour bigua ko meuneu guiss bayil ba soubeu gua dougate khol.',
    ],

    'demander_confirmation' => [
        'fr' => 'Dites oui pour payer et réserver, ou non pour changer de créneau.',
        'wo' => 'Waxal "waaw" ngir fey , walla "déedéet" ngir tane benen heure.',
    ],

    'paiement_ouvert' => [
        'fr' => 'Je vous ouvre la page de paiement.',
        'wo' => 'Dinaa la ubbi figua wara faye par wave walleu orange money.',
    ],

    'paiement_impossible' => [
        'fr' => "Je n'arrive pas à ouvrir le paiement. Réessayez dans un instant.",
        'wo' => 'Meunou ma oubi finiouy faye da am problem',
    ],

    'choix_annonce' => [
        'fr' => 'Vous avez choisi',
        'wo' => 'jour bi gaa Tane',
    ],
];
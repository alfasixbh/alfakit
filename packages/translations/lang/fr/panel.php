<?php

declare(strict_types=1);

return [
    'dashboard' => [
        'title' => 'Tableau de bord',
        'customize' => [
            'span' => '{1} :count colonne|[2,*] :count colonnes',
            'span_full' => 'Pleine largeur',
            'invalid' => 'Cette disposition du tableau de bord n’est pas valide.',
        ],
    ],
    'global_search' => [
        'placeholder' => 'Rechercher…',
        'no_results' => 'Aucun résultat trouvé.',
    ],
    'resources' => [
        'list' => 'Liste',
        'create' => [
            'title' => 'Créer :label',
            'breadcrumb' => 'Créer',
        ],
        'edit' => [
            'title' => 'Modifier :label',
            'breadcrumb' => 'Modifier',
        ],
        'view' => [
            'title' => 'Afficher :label',
            'breadcrumb' => 'Afficher',
        ],
        'api' => [
            'failed' => 'La requête a échoué',
            'unreachable' => 'La source de données est injoignable. Veuillez réessayer.',
            'error' => 'La source de données a répondu par une erreur (:status). Veuillez réessayer.',
            'invalid' => 'La source de données a refusé les données.',
        ],
    ],
    'tenancy' => [
        'switch' => 'Changer d\'équipe',
        'register' => 'Nouvelle équipe',
        'profile' => 'Paramètres de l\'équipe',
    ],
    'errors' => [
        'default' => [
            'title' => 'Une erreur est survenue',
            'body' => 'La requête n’a pas pu aboutir. Veuillez réessayer.',
        ],
        403 => [
            'title' => 'Accès refusé',
            'body' => 'Vous n’êtes pas autorisé à effectuer cette action.',
        ],
        404 => [
            'title' => 'Introuvable',
            'body' => 'La page ou l’enregistrement que vous cherchez n’existe pas.',
        ],
    ],
    'command_palette' => [
        'placeholder' => 'Saisissez une commande ou recherchez…',
        'create' => 'Nouveau :label',
    ],
    'realtime' => [
        'conflict' => [
            'refused_title' => 'Non enregistré : l\'enregistrement a changé',
            'refused_body' => 'Quelqu\'un d\'autre a enregistré cet enregistrement après que vous l\'avez ouvert. Examinez ses modifications, puis enregistrez à nouveau ou gardez les vôtres.',
            'yes' => 'Oui',
            'no' => 'Non',
        ],
    ],
    'themes' => [
        'neutral' => [
            'label' => 'Neutre',
            'description' => 'Le classique : contenu en retrait à côté d’une barre latérale, en-têtes simples et cartes bordées.',
        ],
        'alfakit' => [
            'label' => 'AlfaKit',
            'description' => 'Le design signature de la marque AlfaKit : Alfa Navy et Fox Orange sur fond crème chaleureux, titres en Montserrat et texte en Inter, barre latérale flottante avec navigation en pilules, bannière d’en-tête sur chaque page, cartes surélevées, champs remplis et boutons en pilule.',
        ],
        'minimal' => [
            'label' => 'Minimal',
            'description' => 'Pas de barre latérale : la navigation court en haut sous forme d’onglets soulignés. Surfaces plates à filets fins, champs soulignés, boutons carrés, compact.',
        ],
        'soft' => [
            'label' => 'Doux',
            'description' => 'Un rail d’icônes fin, de grands titres à empattements, des cartes teintées sans bordure, des champs remplis arrondis et des tableaux rayés.',
        ],
        'corporate' => [
            'label' => 'Corporate',
            'description' => 'Barre latérale marine avec navigation à barre d’accent, bandeau de titre pleine largeur, surfaces carrées bordées et tableaux rayés denses.',
        ],
        'filament' => [
            'label' => 'Style Filament',
            'description' => 'Fond gris, barre latérale transparente, cartes blanches cerclées, accents ambre et Inter, comme FilamentPHP.',
        ],
    ],
    'pwa' => [
        'offline' => [
            'title' => 'Hors ligne',
            'heading' => 'Vous êtes hors ligne',
            'body' => 'Vérifiez votre connexion. Cette page se rechargera d’elle-même dès votre retour en ligne.',
            'retry' => 'Réessayer',
        ],
    ],
];

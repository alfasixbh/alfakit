<?php

declare(strict_types=1);

/*
 * French demo strings. Keys must match lang/en/demo.php (tests/Feature/TranslationParityTest.php).
 */
return [
    'brand' => 'Maison Alfa',
    'tagline' => 'Parfums & art de vivre, sélectionnés à Bahreïn.',

    'navigation' => [
        'catalog' => 'Catalogue',
        'sales' => 'Ventes',
        'customers' => 'Clients',
        'marketing' => 'Marketing',
        'reports' => 'Rapports',
        'settings' => 'Paramètres',
        'showcase' => 'Vitrine',
        'support' => 'Assistance',
        'content' => 'Contenu',
        'system' => 'Système',
    ],

    'switcher' => [
        'label' => 'Moteur de rendu',
        'react' => 'React',
        'vue' => 'Vue',
        'svelte' => 'Svelte',
        'current' => ':renderer (actuel)',
    ],

    'design' => [
        'theme' => 'Thème',
        'mobile_preset' => 'Préréglage mobile',
        'mobile_on' => 'Navigation en bas sur téléphone',
        'mobile_off' => 'Tiroir sur téléphone',
    ],

    'footer' => [
        'note' => 'Démo AlfaKit · réinitialisée toutes les heures',
        'docs' => 'Documentation',
    ],

    'meta' => [
        'site' => 'Démo AlfaKit',
        'title' => 'Maison Alfa · la démo AlfaKit',
        'panel_title' => 'Administration Maison Alfa · la démo AlfaKit',
        'description' => 'Une parfumerie fictive construite avec AlfaKit : une seule définition de panneau d’administration Laravel, rendue avec React, Vue et Svelte. Connectez-vous avec le compte de démonstration partagé ; tout est réinitialisé toutes les heures.',
    ],

    'reset' => [
        'in' => 'Réinitialisation dans :minutes min',
        'soon' => 'Réinitialisation dans moins d’une minute',
        'title' => 'La base de données de la démo et les fichiers envoyés sont restaurés toutes les heures, à l’heure pile.',
    ],

    'profile' => [
        'locked_heading' => 'Ceci est le compte de démonstration partagé',
        'locked_body' => 'Son adresse e-mail et son mot de passe restent inchangés pour que le visiteur suivant puisse se connecter. Vous pouvez néanmoins modifier le nom affiché.',
        'mfa_heading' => 'Authentification à deux facteurs',
        'mfa_body' => 'La configuration est désactivée pour le compte partagé. Empruntez l’identité d’un collègue depuis Paramètres › Équipe pour essayer l’application d’authentification et les codes par e-mail.',
    ],

    'errors' => [
        'back_home' => 'Retour à la boutique',
        'open_admin' => 'Ouvrir le panneau d’administration',
        '403' => ['title' => 'Pas pour ce compte', 'body' => 'Votre rôle dans cette boutique n’inclut pas cette page. Changez de boutique ou demandez l’accès à un propriétaire.'],
        '404' => ['title' => 'Page introuvable', 'body' => 'La page a peut-être été déplacée, ou l’enregistrement a été supprimé par la réinitialisation horaire.'],
        '419' => ['title' => 'Page expirée', 'body' => 'Votre session a expiré. Rechargez la page et réessayez.'],
        '429' => ['title' => 'Un peu moins vite', 'body' => 'Trop de requêtes en peu de temps. Patientez un instant, puis réessayez.'],
        '500' => ['title' => 'Une erreur est survenue', 'body' => 'L’erreur a été enregistrée. Réessayez dans un instant.'],
        '503' => ['title' => 'De retour bientôt', 'body' => 'La démo est en cours d’actualisation. Elle sera de retour dans une minute.'],
    ],

    'login' => [
        'about' => 'Maison Alfa est une parfumerie fictive dont le panneau d’administration est construit avec AlfaKit et rendu par React, Vue ou Svelte.',
        'heading' => 'Compte de démonstration',
        'hint' => 'Connectez-vous avec :email et le mot de passe :password. Tout ce que vous modifiez est réinitialisé toutes les heures.',
        'fill' => 'Utiliser le compte de démonstration',
    ],

    'storefront' => [
        'title' => 'Maison Alfa',
        'nav' => [
            'home' => 'Accueil',
            'contact' => 'Contact',
            'track' => 'Suivre une commande',
            'admin' => 'Ouvrir le panneau d’administration',
        ],
        'hero' => [
            'eyebrow' => 'La boutique de démonstration AlfaKit',
            'title' => 'Des parfums qui racontent une histoire, un logiciel qui a du caractère.',
            'body' => 'Maison Alfa est une maison de parfum fictive qui montre ce qu’AlfaKit sait rendre : une application Laravel, une définition de panneau d’administration, trois frontends. Parcourez la boutique, puis ouvrez le même panneau en React, Vue ou Svelte.',
            'cta' => 'Ouvrir le panneau d’administration',
            'secondary' => 'Lire la documentation',
        ],
        'featured' => 'À la une cette saison',
        'from' => 'À partir de :price',
        'notes' => 'Tête :top · Cœur :heart · Fond :base',
        'by' => 'par :brand',
        'empty' => 'Aucun produit à la une pour l’instant. Lancez php artisan demo:reset pour alimenter la boutique.',
        'footer' => [
            'beta' => 'Bêta publique d’AlfaKit',
            'built' => 'Construit avec AlfaKit par Alfa Six. Boutique fictive, vrai logiciel.',
            'renderer' => 'Rendu avec :renderer',
        ],
    ],

    'product_status' => [
        'draft' => 'Brouillon',
        'active' => 'Actif',
        'archived' => 'Archivé',
    ],
    'order_status' => [
        'pending' => 'En attente',
        'paid' => 'Payée',
        'processing' => 'En préparation',
        'shipped' => 'Expédiée',
        'delivered' => 'Livrée',
        'cancelled' => 'Annulée',
        'refunded' => 'Remboursée',
    ],
    'payment_method' => [
        'card' => 'Carte',
        'apple_pay' => 'Apple Pay',
        'paypal' => 'PayPal',
        'bank_transfer' => 'Virement bancaire',
        'cash_on_delivery' => 'Paiement à la livraison',
    ],
    'payment_status' => [
        'pending' => 'En attente',
        'captured' => 'Encaissé',
        'failed' => 'Échoué',
        'refunded' => 'Remboursé',
    ],
    'shipment_status' => [
        'pending' => 'En attente',
        'in_transit' => 'En transit',
        'delivered' => 'Livré',
        'returned' => 'Retourné',
    ],
    'review_status' => [
        'pending' => 'En attente',
        'approved' => 'Approuvé',
        'rejected' => 'Refusé',
    ],
    'discount_type' => [
        'percentage' => 'Pourcentage',
        'fixed' => 'Montant fixe',
        'free_shipping' => 'Livraison gratuite',
    ],
    'staff_role' => [
        'owner' => 'Propriétaire',
        'manager' => 'Responsable',
        'staff' => 'Employé',
    ],
    'concentration' => [
        'extrait' => 'Extrait de parfum',
        'parfum' => 'Parfum',
        'eau_de_parfum' => 'Eau de parfum',
        'eau_de_toilette' => 'Eau de toilette',
        'body_mist' => 'Brume pour le corps',
        'candle' => 'Bougie parfumée',
        'diffuser' => 'Diffuseur à bâtonnets',
    ],
    'audience' => [
        'unisex' => 'Mixte',
        'women' => 'Femme',
        'men' => 'Homme',
    ],

    'timeline' => [
        'placed' => 'Commande passée',
        'paid' => 'Paiement encaissé',
        'processing' => 'Préparée et emballée',
        'shipped' => 'Remise à :carrier',
        'delivered' => 'Livrée',
        'cancelled' => 'Annulée par le client',
        'refunded' => 'Remboursement effectué',
    ],
];

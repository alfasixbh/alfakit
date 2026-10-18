<?php

declare(strict_types=1);

/*
 * French storefront strings. Keys match lang/en/shop.php (tests/Feature/ShopTranslationParityTest.php).
 */
return [
    'attributes' => [
        'name' => 'nom',
        'rating' => 'note',
        'review' => 'avis',
    ],

    'locale' => [
        'label' => 'Langue',
    ],

    'strip' => [
        'eyebrow' => 'Construit avec AlfaKit',
        'title' => 'Une définition de panneau, trois frontends.',
        'body' => 'Tout ce que vous voyez ici est rendu à partir du même schéma PHP. Changez de moteur de rendu et la page se recharge en React, Vue ou Svelte avec le même balisage, le même style et le même comportement.',
        'cta' => 'Changer de moteur de rendu',
        'hint' => 'Vous consultez la version :renderer.',
        'mascot_alt' => 'Le renard, mascotte d’AlfaKit',
    ],

    'newsletter' => [
        'heading' => 'Lettres de l’atelier',
        'body' => 'Un mot à l’arrivée d’un nouveau parfum, jamais plus de deux fois par mois.',
        'label' => 'Adresse e-mail',
        'placeholder' => 'vous@example.com',
        'submit' => 'S’abonner',
        'duplicate' => 'Cette adresse est déjà inscrite.',
        'thanks' => [
            'title' => 'Vous êtes inscrit',
            'body' => 'La prochaine lettre de Maison Alfa vous parviendra en premier.',
        ],
    ],

    'product' => [
        'back' => 'Tous les produits',
        'by' => 'par :brand',
        'sku' => 'Référence',
        'gallery' => 'Galerie',
        'image_of' => ':name, vue :index',
        'sizes' => 'Contenances',
        'choose_size' => 'Choisir une contenance',
        'stock' => [
            'in' => 'En stock',
            'low' => 'Plus que :count',
            'out' => 'Épuisé',
        ],
        'notes' => [
            'heading' => 'Composition',
            'top' => 'Notes de tête',
            'heart' => 'Notes de cœur',
            'base' => 'Notes de fond',
        ],
        'details' => [
            'heading' => 'Détails',
            'concentration' => 'Concentration',
            'audience' => 'Pour',
            'size' => 'Contenance',
            'category' => 'Catégorie',
            'tags' => 'Étiquettes',
        ],
        'enquire' => 'Poser une question sur ce parfum',
        'track' => 'Suivre une commande',
        'reviews' => [
            'heading' => 'Avis',
            'count' => '{0} Aucun avis pour l’instant|{1} Un avis|[2,*] :count avis',
            'average' => ':average sur 5',
            'empty' => 'Aucun avis pour l’instant. Soyez le premier à raconter comment il se porte.',
            'verified' => 'Achat vérifié',
            'guest' => 'Invité',
            'write' => 'Écrire un avis',
            'write_help' => 'Les avis sont lus par l’équipe et publiés depuis le panneau d’administration, généralement sous un jour.',
        ],
        'related' => 'Vous aimerez peut-être aussi',
        'compare' => 'Au lieu de :price',
        'currency_note' => 'Prix en dollars américains, taxes comprises.',
    ],

    'review' => [
        'fields' => [
            'rating' => 'Votre note',
            'name' => 'Votre nom',
            'email' => 'E-mail',
            'email_help' => 'Jamais affiché. Si vous avez acheté ce parfum chez nous, votre avis est marqué comme achat vérifié.',
            'title' => 'Titre',
            'body' => 'Votre avis',
        ],
        'submit' => 'Envoyer l’avis',
        'thanks' => [
            'title' => 'Merci, :name',
            'body' => 'Votre avis a été transmis à l’équipe et apparaîtra une fois approuvé dans le panneau d’administration.',
        ],
    ],

    'contact' => [
        'heading' => 'Écrire à la maison',
        'intro' => 'Une question sur une commande, un parfum introuvable, la vente en gros ou la presse : l’équipe de Manama lit chaque message et répond sous deux jours ouvrés.',
        'form_heading' => 'Envoyer un message',
        'form_help' => 'Ceci est un formulaire autonome AlfaKit : la validation s’exécute sur le serveur, le sujet fait apparaître un champ de numéro de commande et le bouton d’envoi est limité en fréquence.',
        'details' => [
            'heading' => 'La boutique',
            'email' => 'E-mail',
            'phone' => 'Téléphone',
            'hours' => 'Horaires d’ouverture',
            'hours_value' => 'Du samedi au jeudi, de 10 h à 22 h',
            'address' => 'Bahrain Bay, Manama',
        ],
        'fields' => [
            'name' => 'Votre nom',
            'email' => 'E-mail',
            'topic' => 'Sujet',
            'order_number' => 'Numéro de commande',
            'message' => 'Message',
            'message_help' => 'Au moins 20 caractères. Précisez le parfum ou la commande concernés.',
        ],
        'topics' => [
            'order' => 'Une commande',
            'product' => 'Un produit',
            'wholesale' => 'Vente en gros',
            'press' => 'Presse',
            'other' => 'Autre chose',
        ],
        'prefill' => 'J’aimerais en savoir plus sur :product.',
        'submit' => 'Envoyer le message',
        'mail_subject' => 'Contact Maison Alfa : :topic',
        'thanks' => [
            'title' => 'Merci, :name',
            'body' => 'Nous répondrons à :email sous deux jours ouvrés.',
        ],
        'rate_limited' => 'Vous avez déjà envoyé plusieurs messages',
    ],

    'track' => [
        'heading' => 'Suivre une commande',
        'intro' => 'Saisissez l’e-mail utilisé lors du paiement et le numéro de commande figurant dans votre confirmation. Vous verrez toutes les commandes de ce compte et le parcours complet de celle demandée.',
        'fields' => [
            'email' => 'E-mail utilisé lors du paiement',
            'number' => 'Numéro de commande',
            'submit' => 'Trouver ma commande',
        ],
        'sample' => [
            'heading' => 'Essayez avec une vraie commande',
            'body' => 'Ceci est une boutique de démonstration ; voici une commande générée que vous pouvez rechercher :',
            'use' => 'Utiliser cette commande',
        ],
        'not_found' => [
            'heading' => 'Commande introuvable',
            'body' => 'Vérifiez l’e-mail et le numéro de commande, ou utilisez la commande d’exemple ci-dessous.',
        ],
        'orders' => [
            'heading' => 'Vos commandes',
            'description' => 'Toutes les commandes passées par :name. Cliquez sur une commande pour voir sa chronologie.',
            'number' => 'Commande',
            'placed' => 'Passée le',
            'items' => 'Articles',
            'status' => 'Statut',
            'total' => 'Total',
            'search' => 'Rechercher par numéro de commande',
        ],
        'timeline' => [
            'heading' => 'Commande :number',
            'description' => 'Chaque étape, du paiement jusqu’à votre porte.',
            'steps' => 'Chronologie',
            'carrier' => 'Transporteur',
            'tracking' => 'Numéro de suivi',
            'ship_to' => 'Livraison à',
            'no_shipment' => 'Pas encore expédiée',
            'no_tracking' => 'Disponible après l’expédition',
        ],
        'components_note' => 'Le tableau des commandes et la chronologie sont des composants autonomes AlfaKit : une Table et une Infolist rendues dans la mise en page de la boutique.',
    ],
];

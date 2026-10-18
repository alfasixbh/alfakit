<?php

declare(strict_types=1);

/*
 * French strings of the first-party plugin integration. Keys match lang/en/plugins.php.
 */
return [
    'commands' => [
        'group' => 'Maison Alfa',
        'order_board' => 'Ouvrir le tableau des commandes',
        'calendar' => 'Ouvrir le calendrier de la boutique',
        'returns' => 'Examiner les retours',
        'category_tree' => 'Organiser l’arborescence des catégories',
        'new_product' => 'Ajouter un produit',
        'storefront' => 'Ouvrir la boutique en ligne',
    ],

    'board' => [
        'title' => 'Tableau des commandes',
        'subheading' => 'Faites glisser les commandes le long du flux de préparation, ou déplacez-les au clavier (Espace, flèches, Espace). Les 60 derniers jours.',
        'open' => 'Tableau',
        'timeline_note' => 'Déplacée sur le tableau des commandes par :user',
    ],

    'calendar' => [
        'title' => 'Calendrier',
        'subheading' => 'Promotions, expéditions, livraisons et pages programmées de cette boutique.',
        'this_week' => 'Cette semaine',
        'new_promotion' => 'Planifier une promotion',
        'hint' => 'Faites glisser une promotion pour la déplacer, faites glisser sa fin pour changer sa durée, cliquez dessus pour la modifier, sélectionnez des jours pour en planifier une nouvelle.',
        'fields' => [
            'value' => 'Valeur (% ou montant)',
        ],
        'legend' => [
            'label' => 'Légende',
            'percentage' => 'Promotion : pourcentage de remise',
            'fixed' => 'Promotion : montant de remise',
            'free_shipping' => 'Promotion : livraison gratuite',
            'shipped' => 'L’expédition a quitté la boutique',
            'delivered' => 'Livrée',
            'publish' => 'Page programmée',
        ],
        'events' => [
            'shipped' => ':number expédiée (:carrier)',
            'delivered' => ':number livrée',
            'publish' => 'Publication : :title',
        ],
    ],

    'returns' => [
        'label' => 'retour',
        'plural' => 'Retours',
        'workflow' => 'Validation des retours',
        'subheading' => 'Le support ouvre un retour depuis une commande et le soumet ; un propriétaire ou un responsable l’approuve depuis Validations ; les retours approuvés sont remboursés.',
        'empty' => 'Aucun retour pour l’instant',
        'request' => 'Demander un retour',
        'request_heading' => 'Retour pour la commande :number',
        'created' => 'Retour :number ouvert. Soumettez-le à validation une fois complet.',
        'timeline_note' => 'Remboursée via le retour :number',
        'states' => [
            'requested' => 'Demandé',
            'awaiting_approval' => 'En attente de validation',
            'approved' => 'Approuvé',
            'rejected' => 'Refusé',
            'refunded' => 'Remboursé',
            'closed' => 'Clôturé',
        ],
        'transitions' => [
            'submit' => 'Soumettre à validation',
            'refund' => 'Rembourser',
            'reopen' => 'Rouvrir',
            'close' => 'Clôturer',
        ],
        'steps' => [
            'manager' => 'Validation du responsable',
        ],
        'reasons' => [
            'damaged' => 'Endommagé pendant le transport',
            'wrong_item' => 'Mauvais article',
            'not_as_described' => 'Non conforme à la description',
            'allergy' => 'Réaction cutanée',
            'changed_mind' => 'Changement d’avis',
        ],
        'fields' => [
            'number' => 'Retour',
            'state' => 'État',
            'reason' => 'Motif',
            'amount' => 'Montant remboursé',
            'details' => 'Détails',
            'requested_by' => 'Ouvert par',
            'refund_reference' => 'Référence du remboursement',
        ],
        'sections' => [
            'workflow' => 'Workflow',
            'history' => 'Historique',
            'details' => 'Retour',
        ],
    ],

    'invoices' => [
        'issue' => 'Émettre une facture',
        'open' => 'Ouvrir la facture',
        'issue_description' => 'Crée une facture à partir des lignes de la commande, avec la TVA selon les taux de la boutique.',
        'notes' => 'Facture de la commande :number. Merci pour vos achats chez Maison Alfa.',
        'terms' => 'Paiement sous 14 jours. Document d’exemple de la démo AlfaKit.',
    ],

    'comments' => [
        'section' => 'Commentaires internes',
        'section_description' => 'Visibles uniquement par l’équipe. Tapez @ pour mentionner un collègue ; il est notifié dans la cloche.',
    ],

    'activity' => [
        'section' => 'Piste d’audit',
    ],

    'helpdesk' => [
        'greeting' => 'Bonjour ! Posez-nous toutes vos questions sur nos parfums ou votre commande.',
    ],

    'tree' => [
        'title' => 'Arborescence des catégories',
        'subheading' => 'Faites glisser les catégories pour les imbriquer ou les réordonner (ou utilisez les flèches), puis enregistrez. Les catégories sont partagées par toutes les boutiques.',
        'open' => 'Vue arborescente',
    ],

    'tags' => [
        'segments' => 'Segments',
    ],

    'media' => [
        'gallery' => 'Galerie lifestyle',
        'gallery_description' => 'Images supplémentaires stockées dans la médiathèque (distinctes des images produit ci-dessus).',
    ],

    'views' => [
        'low_stock' => 'Stock faible',
        'featured' => 'À la une',
        'drafts' => 'Brouillons',
    ],

    'ai' => [
        'summarise_reviews' => 'Résumer les avis',
        'summarise_heading' => 'Ce que les clients disent de :name',
        'summarise_prompt' => 'Résume ces avis clients sur le parfum « :name » en trois puces courtes : ce qu’ils aiment, ce qu’ils critiquent et à qui il convient.',
    ],

    'settings' => [
        'title' => 'Paramètres de la maison',
        'subheading' => 'Partagés par toutes les boutiques de Maison Alfa. La boutique en ligne affiche l’annonce.',
        'sections' => [
            'brand' => 'Maison et boutique en ligne',
            'notifications' => 'Notifications',
        ],
        'fields' => [
            'house_name' => 'Nom de la maison',
            'announcement' => 'Annonce de la boutique en ligne',
            'announcement_help' => 'Affichée en haut de chaque page de la boutique. Laissez vide pour la masquer.',
            'support_hours' => 'Horaires du support',
            'price_display' => 'Prix sur la boutique en ligne',
            'low_stock_alerts' => 'Alertes de stock faible',
            'weekly_report' => 'Rapport hebdomadaire des ventes',
            'report_recipients' => 'Destinataires du rapport',
            'report_recipients_help' => 'Adresses e-mail (la démo écrit les e-mails uniquement dans le journal).',
        ],
        'price_display' => [
            'tax_inclusive' => 'TVA comprise',
            'tax_exclusive' => 'Hors TVA',
        ],
    ],

    'backups' => [
        'read_only' => 'En lecture seule dans la démo publique : la création, le téléchargement et la suppression des sauvegardes sont désactivés. La base de données de la démo est reconstruite toutes les heures.',
    ],

    'billing' => [
        'compare_plans' => 'Comparer les formules',
        'compare_plans_body' => 'La page des formules du plugin Billing présente chaque formule avec ses fonctionnalités. Aucun paiement n’est jamais encaissé dans la démo.',
        'see_plans' => 'Voir les formules',
        'checkout_disabled' => 'Le paiement est désactivé dans la démo publique',
        'checkout_disabled_body' => 'Vous avez choisi la formule :plan. Une vraie boutique ouvrirait maintenant Stripe Checkout ; la démo ne contacte jamais de prestataire de paiement.',
        'contact' => 'Parlons-en',
        'plans' => [
            'boutique' => 'Une boutique et sa boutique en ligne.',
            'maison' => 'Plusieurs boutiques avec catalogue et rapports partagés.',
            'enterprise' => 'Franchises, intégrations sur mesure et SSO.',
        ],
        'features' => [
            'boutique' => ['1 boutique', '5 comptes employés', 'Support par e-mail'],
            'maison' => ['Boutiques illimitées', 'Employés illimités', 'Helpdesk et statistiques', 'Support prioritaire'],
            'enterprise' => ['Responsable de compte dédié', 'Intégrations sur mesure', 'Authentification unique'],
        ],
    ],

    'storefront' => [
        'pages' => 'À propos',
        'wholesale' => 'Vente en gros',
        'support' => 'Assistance',
        'chat' => 'Discuter avec nous',
        'wholesale_title' => 'Demandes de vente en gros',
        'wholesale_intro' => 'Hôtels, spas, concept stores et cadeaux d’entreprise : ce formulaire est construit dans le panneau avec le plugin Forms (deux étapes, une question conditionnelle, une protection anti-spam).',
        'wholesale_unavailable' => 'Les demandes de vente en gros sont suspendues pour le moment.',
        'support_title' => 'Service client',
        'support_intro' => 'Le portail client du plugin Helpdesk : ouvrez un ticket, suivez la conversation, évaluez la réponse.',
        'new_checkout' => 'Nouveau paiement (bêta)',
        'cms_intro' => 'Cette page est gérée avec le plugin CMS : blocs, brouillons, aperçu en direct et barre d’édition pour l’équipe connectée.',
    ],
];

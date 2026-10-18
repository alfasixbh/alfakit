<?php

declare(strict_types=1);

return [
    'modal' => [
        'confirmation' => 'Voulez-vous vraiment effectuer cette action ?',
        'confirm' => 'Confirmer',
        'submit' => 'Valider',
        'cancel' => 'Annuler',
        'close' => 'Fermer',
    ],
    'create' => [
        'label' => 'Créer :label',
        'modal' => [
            'heading' => 'Créer :label',
            'submit' => 'Créer',
        ],
        'notification' => 'Créé',
        'create_another' => 'Créer et créer un autre',
    ],
    'edit' => [
        'label' => 'Modifier',
        'modal' => [
            'heading' => 'Modifier :label',
            'submit' => 'Enregistrer',
        ],
        'notification' => 'Enregistré',
    ],
    'view' => [
        'label' => 'Afficher',
        'modal' => [
            'heading' => 'Afficher :label',
        ],
    ],
    'delete' => [
        'label' => 'Supprimer',
        'modal' => [
            'heading' => 'Supprimer :label',
            'submit' => 'Supprimer',
        ],
        'notification' => 'Supprimé',
        'bulk' => [
            'heading' => 'Supprimer les enregistrements sélectionnés',
            'notification' => 'Supprimés',
        ],
    ],
    'restore' => [
        'label' => 'Restaurer',
        'modal' => [
            'heading' => 'Restaurer :label',
            'submit' => 'Restaurer',
        ],
        'notification' => 'Restauré',
        'bulk' => [
            'heading' => 'Restaurer les enregistrements sélectionnés',
            'notification' => 'Restaurés',
        ],
    ],
    'force_delete' => [
        'label' => 'Forcer la suppression',
        'modal' => [
            'heading' => 'Supprimer définitivement :label',
            'description' => 'Cette action est irréversible.',
            'submit' => 'Supprimer',
        ],
        'notification' => 'Supprimé définitivement',
        'bulk' => [
            'heading' => 'Supprimer définitivement les enregistrements sélectionnés',
            'notification' => 'Supprimés définitivement',
        ],
    ],
    'replicate' => [
        'label' => 'Dupliquer',
        'modal' => [
            'heading' => 'Dupliquer :label',
            'submit' => 'Dupliquer',
        ],
        'notification' => 'Dupliqué',
    ],
    'attach' => [
        'label' => 'Attacher',
        'modal' => [
            'heading' => 'Attacher :label',
            'submit' => 'Attacher',
        ],
        'notification' => 'Attaché',
    ],
    'detach' => [
        'label' => 'Détacher',
        'modal' => [
            'heading' => 'Détacher :label',
            'submit' => 'Détacher',
        ],
        'notification' => 'Détaché',
    ],
    'associate' => [
        'label' => 'Associer',
        'modal' => [
            'heading' => 'Associer :label',
            'submit' => 'Associer',
        ],
        'notification' => 'Associé',
    ],
    'dissociate' => [
        'label' => 'Dissocier',
        'modal' => [
            'heading' => 'Dissocier :label',
            'submit' => 'Dissocier',
        ],
        'notification' => 'Dissocié',
    ],
    'detach_bulk' => [
        'heading' => 'Détacher les enregistrements sélectionnés',
        'notification' => 'Détaché',
    ],
    'dissociate_bulk' => [
        'heading' => 'Dissocier les enregistrements sélectionnés',
        'notification' => 'Dissocié',
    ],
    'rate_limited' => [
        'title' => 'Trop de tentatives',
        'body' => 'Veuillez patienter :seconds seconde avant de réessayer.|Veuillez patienter :seconds secondes avant de réessayer.',
    ],
    'password_confirmation' => [
        'incorrect' => 'Le mot de passe est incorrect.',
        'throttled' => 'Trop de tentatives. Réessayez dans :seconds secondes.',
    ],
    'bulk' => [
        'unauthorized_records' => ':count enregistrement sélectionné a été ignoré car vous n’êtes pas autorisé à le modifier.|:count enregistrements sélectionnés ont été ignorés car vous n’êtes pas autorisé à les modifier.',
        'all_failed' => 'L’enregistrement n’a pas pu être traité.|Aucun des :count enregistrements n’a pu être traité.',
        'some_failed' => ':failure enregistrement sur :total n’a pas pu être traité.|:failure enregistrements sur :total n’ont pas pu être traités.',
    ],
    'history' => [
        'label' => 'Historique',
        'modal' => [
            'heading' => 'Historique de :label',
            'close' => 'Fermer',
        ],
        'empty' => 'Aucune version pour le moment.',
        'events' => [
            'created' => 'Créé',
            'updated' => 'Modifié',
            'deleted' => 'Supprimé',
            'restored' => 'Restauré',
            'reverted' => 'Version antérieure restaurée',
        ],
        'restore' => [
            'label' => 'Restaurer cette version',
            'modal' => [
                'heading' => 'Restaurer cette version ?',
                'description' => 'Les champs suivis reprennent leurs valeurs de cette version. Les valeurs actuelles restent dans l’historique.',
                'submit' => 'Restaurer',
            ],
            'notification' => 'Version restaurée',
        ],
    ],
    'undo' => [
        'done' => 'Terminé',
        'notification' => 'Annulé',
        'expired' => 'Cette action ne peut plus être annulée.',
        'conflict' => 'L’enregistrement a été modifié depuis : impossible d’annuler.',
        'unavailable' => 'Impossible d’annuler : l’enregistrement n’existe plus.',
    ],
];

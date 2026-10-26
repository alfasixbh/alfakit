<?php

declare(strict_types=1);

return [
    'modal' => [
        'confirmation' => 'Weet je zeker dat je dit wilt doen?',
        'confirm' => 'Bevestigen',
        'submit' => 'Verzenden',
        'cancel' => 'Annuleren',
        'close' => 'Sluiten',
    ],
    'create' => [
        'label' => 'Nieuw: :label',
        'modal' => [
            'heading' => ':label aanmaken',
            'submit' => 'Aanmaken',
        ],
        'notification' => 'Aangemaakt',
        'create_another' => 'Aanmaken & nog een aanmaken',
    ],
    'edit' => [
        'label' => 'Bewerken',
        'modal' => [
            'heading' => ':label bewerken',
            'submit' => 'Opslaan',
        ],
        'notification' => 'Opgeslagen',
    ],
    'view' => [
        'label' => 'Bekijken',
        'modal' => [
            'heading' => ':label bekijken',
        ],
    ],
    'delete' => [
        'label' => 'Verwijderen',
        'modal' => [
            'heading' => ':label verwijderen',
            'submit' => 'Verwijderen',
        ],
        'notification' => 'Verwijderd',
        'bulk' => [
            'heading' => 'Geselecteerde records verwijderen',
            'notification' => 'Verwijderd',
        ],
    ],
    'restore' => [
        'label' => 'Herstellen',
        'modal' => [
            'heading' => ':label herstellen',
            'submit' => 'Herstellen',
        ],
        'notification' => 'Hersteld',
        'bulk' => [
            'heading' => 'Geselecteerde records herstellen',
            'notification' => 'Hersteld',
        ],
    ],
    'force_delete' => [
        'label' => 'Definitief verwijderen',
        'modal' => [
            'heading' => ':label definitief verwijderen',
            'description' => 'Dit kan niet ongedaan worden gemaakt.',
            'submit' => 'Verwijderen',
        ],
        'notification' => 'Definitief verwijderd',
        'bulk' => [
            'heading' => 'Geselecteerde records definitief verwijderen',
            'notification' => 'Definitief verwijderd',
        ],
    ],
    'replicate' => [
        'label' => 'Dupliceren',
        'modal' => [
            'heading' => ':label dupliceren',
            'submit' => 'Dupliceren',
        ],
        'notification' => 'Gedupliceerd',
    ],
    'attach' => [
        'label' => 'Koppelen',
        'modal' => [
            'heading' => ':label koppelen',
            'submit' => 'Koppelen',
        ],
        'notification' => 'Gekoppeld',
    ],
    'detach' => [
        'label' => 'Ontkoppelen',
        'modal' => [
            'heading' => ':label ontkoppelen',
            'submit' => 'Ontkoppelen',
        ],
        'notification' => 'Ontkoppeld',
    ],
    'associate' => [
        'label' => 'Toewijzen',
        'modal' => [
            'heading' => ':label toewijzen',
            'submit' => 'Toewijzen',
        ],
        'notification' => 'Toegewezen',
    ],
    'dissociate' => [
        'label' => 'Toewijzing opheffen',
        'modal' => [
            'heading' => 'Toewijzing van :label opheffen',
            'submit' => 'Toewijzing opheffen',
        ],
        'notification' => 'Toewijzing opgeheven',
    ],
    'detach_bulk' => [
        'heading' => 'Geselecteerde records ontkoppelen',
        'notification' => 'Ontkoppeld',
    ],
    'dissociate_bulk' => [
        'heading' => 'Koppeling van geselecteerde records opheffen',
        'notification' => 'Koppeling opgeheven',
    ],
    'rate_limited' => [
        'title' => 'Te veel pogingen',
        'body' => 'Wacht :seconds seconde voordat je het opnieuw probeert.|Wacht :seconds seconden voordat je het opnieuw probeert.',
    ],
    'password_confirmation' => [
        'incorrect' => 'Het wachtwoord is onjuist.',
        'throttled' => 'Te veel pogingen. Probeer het over :seconds seconden opnieuw.',
    ],
    'bulk' => [
        'unauthorized_records' => ':count geselecteerd record is overgeslagen omdat je het niet mag wijzigen.|:count geselecteerde records zijn overgeslagen omdat je ze niet mag wijzigen.',
        'all_failed' => 'Het record kon niet worden verwerkt.|Geen van de :count records kon worden verwerkt.',
        'some_failed' => ':failure van :total records kon niet worden verwerkt.|:failure van :total records konden niet worden verwerkt.',
    ],
    'history' => [
        'label' => 'Geschiedenis',
        'modal' => [
            'heading' => 'Geschiedenis van :label',
            'close' => 'Sluiten',
        ],
        'empty' => 'Nog geen versies.',
        'events' => [
            'created' => 'Aangemaakt',
            'updated' => 'Bijgewerkt',
            'deleted' => 'Verwijderd',
            'restored' => 'Hersteld',
            'reverted' => 'Eerdere versie hersteld',
            'baseline' => 'Vóór het begin van de geschiedenis',
        ],
        'restore' => [
            'label' => 'Deze versie herstellen',
            'modal' => [
                'heading' => 'Deze versie herstellen?',
                'description' => 'De gevolgde velden krijgen weer hun waarden uit deze versie. De huidige waarden blijven in de geschiedenis.',
                'submit' => 'Herstellen',
            ],
            'notification' => 'Versie hersteld',
        ],
    ],
    'undo' => [
        'done' => 'Klaar',
        'notification' => 'Ongedaan gemaakt',
        'expired' => 'Dit kan niet meer ongedaan worden gemaakt.',
        'conflict' => 'Het record is sindsdien gewijzigd, dus dit kan niet ongedaan worden gemaakt.',
        'unavailable' => 'Dit kan niet meer ongedaan worden gemaakt omdat het record weg is.',
    ],
];

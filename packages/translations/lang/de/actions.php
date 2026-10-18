<?php

declare(strict_types=1);

return [
    'modal' => [
        'confirmation' => 'Möchten Sie diese Aktion wirklich ausführen?',
        'confirm' => 'Bestätigen',
        'submit' => 'Absenden',
        'cancel' => 'Abbrechen',
        'close' => 'Schließen',
    ],
    'create' => [
        'label' => ':label erstellen',
        'modal' => [
            'heading' => ':label erstellen',
            'submit' => 'Erstellen',
        ],
        'notification' => 'Erstellt',
        'create_another' => 'Erstellen & weiteres erstellen',
    ],
    'edit' => [
        'label' => 'Bearbeiten',
        'modal' => [
            'heading' => ':label bearbeiten',
            'submit' => 'Speichern',
        ],
        'notification' => 'Gespeichert',
    ],
    'view' => [
        'label' => 'Anzeigen',
        'modal' => [
            'heading' => ':label anzeigen',
        ],
    ],
    'delete' => [
        'label' => 'Löschen',
        'modal' => [
            'heading' => ':label löschen',
            'submit' => 'Löschen',
        ],
        'notification' => 'Gelöscht',
        'bulk' => [
            'heading' => 'Ausgewählte Einträge löschen',
            'notification' => 'Gelöscht',
        ],
    ],
    'restore' => [
        'label' => 'Wiederherstellen',
        'modal' => [
            'heading' => ':label wiederherstellen',
            'submit' => 'Wiederherstellen',
        ],
        'notification' => 'Wiederhergestellt',
        'bulk' => [
            'heading' => 'Ausgewählte Einträge wiederherstellen',
            'notification' => 'Wiederhergestellt',
        ],
    ],
    'force_delete' => [
        'label' => 'Endgültig löschen',
        'modal' => [
            'heading' => ':label endgültig löschen',
            'description' => 'Dies kann nicht rückgängig gemacht werden.',
            'submit' => 'Löschen',
        ],
        'notification' => 'Endgültig gelöscht',
        'bulk' => [
            'heading' => 'Ausgewählte Einträge endgültig löschen',
            'notification' => 'Endgültig gelöscht',
        ],
    ],
    'replicate' => [
        'label' => 'Duplizieren',
        'modal' => [
            'heading' => ':label duplizieren',
            'submit' => 'Duplizieren',
        ],
        'notification' => 'Dupliziert',
    ],
    'attach' => [
        'label' => 'Verknüpfen',
        'modal' => [
            'heading' => ':label verknüpfen',
            'submit' => 'Verknüpfen',
        ],
        'notification' => 'Verknüpft',
    ],
    'detach' => [
        'label' => 'Trennen',
        'modal' => [
            'heading' => ':label trennen',
            'submit' => 'Trennen',
        ],
        'notification' => 'Getrennt',
    ],
    'associate' => [
        'label' => 'Zuordnen',
        'modal' => [
            'heading' => ':label zuordnen',
            'submit' => 'Zuordnen',
        ],
        'notification' => 'Zugeordnet',
    ],
    'dissociate' => [
        'label' => 'Zuordnung aufheben',
        'modal' => [
            'heading' => 'Zuordnung von :label aufheben',
            'submit' => 'Zuordnung aufheben',
        ],
        'notification' => 'Zuordnung aufgehoben',
    ],
    'detach_bulk' => [
        'heading' => 'Ausgewählte Datensätze trennen',
        'notification' => 'Getrennt',
    ],
    'dissociate_bulk' => [
        'heading' => 'Zuordnung der ausgewählten Datensätze aufheben',
        'notification' => 'Zuordnung aufgehoben',
    ],
    'rate_limited' => [
        'title' => 'Zu viele Versuche',
        'body' => 'Bitte warte :seconds Sekunde, bevor du es erneut versuchst.|Bitte warte :seconds Sekunden, bevor du es erneut versuchst.',
    ],
    'password_confirmation' => [
        'incorrect' => 'Das Passwort ist falsch.',
        'throttled' => 'Zu viele Versuche. Versuche es in :seconds Sekunden erneut.',
    ],
    'bulk' => [
        'unauthorized_records' => ':count ausgewählter Datensatz wurde übersprungen, weil du ihn nicht ändern darfst.|:count ausgewählte Datensätze wurden übersprungen, weil du sie nicht ändern darfst.',
        'all_failed' => 'Der Eintrag konnte nicht verarbeitet werden.|Keiner der :count Einträge konnte verarbeitet werden.',
        'some_failed' => ':failure von :total Einträgen konnte nicht verarbeitet werden.|:failure von :total Einträgen konnten nicht verarbeitet werden.',
    ],
    'history' => [
        'label' => 'Verlauf',
        'modal' => [
            'heading' => 'Verlauf von :label',
            'close' => 'Schließen',
        ],
        'empty' => 'Noch keine Versionen.',
        'events' => [
            'created' => 'Erstellt',
            'updated' => 'Aktualisiert',
            'deleted' => 'Gelöscht',
            'restored' => 'Wiederhergestellt',
            'reverted' => 'Frühere Version wiederhergestellt',
        ],
        'restore' => [
            'label' => 'Diese Version wiederherstellen',
            'modal' => [
                'heading' => 'Diese Version wiederherstellen?',
                'description' => 'Die erfassten Felder erhalten wieder ihre Werte aus dieser Version. Die aktuellen Werte bleiben im Verlauf.',
                'submit' => 'Wiederherstellen',
            ],
            'notification' => 'Version wiederhergestellt',
        ],
    ],
    'undo' => [
        'done' => 'Erledigt',
        'notification' => 'Rückgängig gemacht',
        'expired' => 'Das kann nicht mehr rückgängig gemacht werden.',
        'conflict' => 'Der Datensatz wurde inzwischen geändert und kann nicht zurückgesetzt werden.',
        'unavailable' => 'Das kann nicht mehr rückgängig gemacht werden, weil der Datensatz fehlt.',
    ],
];

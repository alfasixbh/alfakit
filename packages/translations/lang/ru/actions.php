<?php

declare(strict_types=1);

return [
    'modal' => [
        'confirmation' => 'Вы уверены, что хотите это сделать?',
        'confirm' => 'Подтвердить',
        'submit' => 'Отправить',
        'cancel' => 'Отмена',
        'close' => 'Закрыть',
    ],
    'create' => [
        'label' => 'Создать: :label',
        'modal' => [
            'heading' => 'Создание: :label',
            'submit' => 'Создать',
        ],
        'notification' => 'Создано',
        'create_another' => 'Создать и добавить ещё',
    ],
    'edit' => [
        'label' => 'Редактировать',
        'modal' => [
            'heading' => 'Редактирование: :label',
            'submit' => 'Сохранить',
        ],
        'notification' => 'Сохранено',
    ],
    'view' => [
        'label' => 'Просмотр',
        'modal' => [
            'heading' => 'Просмотр: :label',
        ],
    ],
    'delete' => [
        'label' => 'Удалить',
        'modal' => [
            'heading' => 'Удаление: :label',
            'submit' => 'Удалить',
        ],
        'notification' => 'Удалено',
        'bulk' => [
            'heading' => 'Удалить выбранные записи',
            'notification' => 'Удалено',
        ],
    ],
    'restore' => [
        'label' => 'Восстановить',
        'modal' => [
            'heading' => 'Восстановление: :label',
            'submit' => 'Восстановить',
        ],
        'notification' => 'Восстановлено',
        'bulk' => [
            'heading' => 'Восстановить выбранные записи',
            'notification' => 'Восстановлено',
        ],
    ],
    'force_delete' => [
        'label' => 'Удалить навсегда',
        'modal' => [
            'heading' => 'Удаление навсегда: :label',
            'description' => 'Это действие нельзя отменить.',
            'submit' => 'Удалить',
        ],
        'notification' => 'Удалено навсегда',
        'bulk' => [
            'heading' => 'Удалить выбранные записи навсегда',
            'notification' => 'Удалено навсегда',
        ],
    ],
    'replicate' => [
        'label' => 'Дублировать',
        'modal' => [
            'heading' => 'Дублирование: :label',
            'submit' => 'Дублировать',
        ],
        'notification' => 'Дублировано',
    ],
    'attach' => [
        'label' => 'Прикрепить',
        'modal' => [
            'heading' => 'Прикрепление: :label',
            'submit' => 'Прикрепить',
        ],
        'notification' => 'Прикреплено',
    ],
    'detach' => [
        'label' => 'Открепить',
        'modal' => [
            'heading' => 'Открепление: :label',
            'submit' => 'Открепить',
        ],
        'notification' => 'Откреплено',
    ],
    'associate' => [
        'label' => 'Связать',
        'modal' => [
            'heading' => 'Связывание: :label',
            'submit' => 'Связать',
        ],
        'notification' => 'Связано',
    ],
    'dissociate' => [
        'label' => 'Отвязать',
        'modal' => [
            'heading' => 'Отвязывание: :label',
            'submit' => 'Отвязать',
        ],
        'notification' => 'Отвязано',
    ],
    'detach_bulk' => [
        'heading' => 'Открепить выбранные записи',
        'notification' => 'Откреплено',
    ],
    'dissociate_bulk' => [
        'heading' => 'Отвязать выбранные записи',
        'notification' => 'Отвязано',
    ],
    'rate_limited' => [
        'title' => 'Слишком много попыток',
        'body' => 'Подождите :seconds секунду и повторите попытку.|Подождите :seconds секунд и повторите попытку.',
    ],
    'password_confirmation' => [
        'incorrect' => 'Неверный пароль.',
        'throttled' => 'Слишком много попыток. Повторите через :seconds секунд.',
    ],
    'bulk' => [
        'unauthorized_records' => 'Пропущена :count выбранная запись: у вас нет прав на её изменение.|Пропущено выбранных записей: :count — у вас нет прав на их изменение.',
        'all_failed' => 'Не удалось обработать запись.|Не удалось обработать ни одну из :count записей.',
        'some_failed' => 'Не удалось обработать :failure из :total записей.|Не удалось обработать :failure из :total записей.',
    ],
    'history' => [
        'label' => 'История',
        'modal' => [
            'heading' => 'История: :label',
            'close' => 'Закрыть',
        ],
        'empty' => 'Версий пока нет.',
        'events' => [
            'created' => 'Создано',
            'updated' => 'Изменено',
            'deleted' => 'Удалено',
            'restored' => 'Восстановлено',
            'reverted' => 'Восстановлена прежняя версия',
            'baseline' => 'До начала истории',
        ],
        'restore' => [
            'label' => 'Восстановить эту версию',
            'modal' => [
                'heading' => 'Восстановить эту версию?',
                'description' => 'Отслеживаемые поля вернутся к значениям этой версии. Текущие значения останутся в истории.',
                'submit' => 'Восстановить',
            ],
            'notification' => 'Версия восстановлена',
        ],
    ],
    'undo' => [
        'done' => 'Готово',
        'notification' => 'Отменено',
        'expired' => 'Это больше нельзя отменить.',
        'conflict' => 'Запись с тех пор изменилась, поэтому отменить нельзя.',
        'unavailable' => 'Отменить нельзя: записи больше нет.',
    ],
];

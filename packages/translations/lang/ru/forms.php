<?php

declare(strict_types=1);

return [
    'select' => [
        'boolean' => [
            'true' => 'Да',
            'false' => 'Нет',
        ],
        'placeholder' => 'Выберите вариант',
        'search_prompt' => 'Начните вводить для поиска…',
        'no_search_results' => 'Ничего не найдено.',
        'loading' => 'Загрузка…',
    ],
    'key_value' => [
        'key' => 'Ключ',
        'value' => 'Значение',
        'add' => 'Добавить строку',
        'delete' => 'Удалить строку',
        'reorder' => 'Изменить порядок',
    ],
    'repeater' => [
        'cannot_add' => 'В «:attribute» нельзя добавлять элементы.',
        'cannot_delete' => 'Из «:attribute» нельзя удалять элементы.',
        'cannot_reorder' => 'Элементы в «:attribute» нельзя переупорядочивать.',
        'add' => 'Добавить в «:label»',
        'delete' => 'Удалить',
        'clone' => 'Дублировать',
        'move_up' => 'Переместить вверх',
        'move_down' => 'Переместить вниз',
        'collapse' => 'Свернуть',
        'expand' => 'Развернуть',
        'reorder' => 'Изменить порядок',
        'collapse_all' => 'Свернуть все',
        'expand_all' => 'Развернуть все',
    ],
    'wizard' => [
        'next' => 'Далее',
        'previous' => 'Назад',
        'submit' => 'Отправить',
    ],
    'file_upload' => [
        'drop' => 'Перетащите файлы или',
        'browse' => 'выберите',
        'uploading' => 'Загрузка…',
        'remove' => 'Удалить',
        'download' => 'Скачать',
        'too_large' => 'Файл слишком большой.',
        'invalid_type' => 'Этот тип файла не разрешён.',
        'too_small' => 'Этот файл слишком мал.',
        'unavailable' => 'Эта загрузка больше недоступна. Загрузите файл снова.',
        'invalid_dimensions' => 'Недопустимые размеры изображения.',
        'invalid_aspect_ratio' => 'Недопустимое соотношение сторон изображения.',
        'chunk_failed' => 'Загрузка не завершена. Загрузите файл ещё раз.',
        'types' => [
            'images' => 'Изображения',
            'videos' => 'Видео',
            'audio' => 'Аудио',
            'text' => 'Текстовые файлы',
        ],
    ],
    'tags_input' => [
        'placeholder' => 'Добавить тег…',
    ],
    'rich_editor' => [
        'link_prompt' => 'Введите URL',
        'insert_block' => 'Вставить :block',
        'edit_block' => 'Изменить :block',
        'save_block' => 'Сохранить',
        'insert' => 'Вставить',
        'text_colors' => [
            'red' => 'Красный',
            'orange' => 'Оранжевый',
            'amber' => 'Янтарный',
            'green' => 'Зелёный',
            'teal' => 'Бирюзовый',
            'blue' => 'Синий',
            'indigo' => 'Индиго',
            'purple' => 'Фиолетовый',
            'pink' => 'Розовый',
            'gray' => 'Серый',
        ],
    ],
    'actions' => [
        'save' => 'Сохранить изменения',
        'create' => 'Создать',
        'create_another' => 'Создать и добавить ещё',
        'cancel' => 'Отмена',
        'saved' => 'Сохранено',
        'created' => 'Создано',
    ],
    'builder' => [
        'add' => 'Добавить в :label',
        'block_max_items' => ':block можно использовать только один раз.|:block можно использовать не более :count раз.|:block можно использовать не более :count раз.',
    ],
    'slider' => [
        'difference' => 'Разница между значениями должна быть от :min до :max.',
    ],
    'modal_table_select' => [
        'heading' => 'Выбор: :label',
        'select' => 'Выбрать',
    ],
    'translatable' => [
        'attribute' => ':attribute (:locale)',
        'editing_language' => 'Язык редактирования',
    ],
    'morph_to_select' => [
        'type' => 'Тип',
    ],
    'icon_picker' => [
        'invalid' => 'Выбранный значок недоступен.',
    ],
];

<?php

declare(strict_types=1);

return [
    'label' => 'Exportar :label',
    'bulk_label' => 'Exportar selecionados',
    'modal' => [
        'heading' => 'Exportar :label',
        'submit' => 'Exportar',
        'columns' => 'Colunas',
        'description' => 'A exportação roda em segundo plano. Você será notificado quando os arquivos estiverem prontos.',
        'column_labels' => 'Rótulos das colunas',
    ],
    'notifications' => [
        'started' => [
            'title' => 'Exportação iniciada',
            'body' => '{1} :count linha está sendo exportada. Você será notificado quando os arquivos estiverem prontos.|[2,*] :count linhas estão sendo exportadas. Você será notificado quando os arquivos estiverem prontos.',
        ],
        'completed' => [
            'title' => 'Exportação concluída',
            'body' => '{0} Nenhuma linha foi exportada.|{1} :count linha foi exportada.|[2,*] :count linhas foram exportadas.',
            'failed' => '{1} :count linha falhou.|[2,*] :count linhas falharam.',
            'download_csv' => 'Baixar .csv',
            'download_xlsx' => 'Baixar .xlsx',
        ],
        'max_rows' => [
            'title' => 'Linhas demais',
            'body' => '{1} Você pode exportar no máximo :count linha por vez.|[2,*] Você pode exportar no máximo :count linhas por vez.',
        ],
    ],
];

<?php

declare(strict_types=1);

return [
    'label' => 'Importar :label',
    'column_number' => 'Coluna :number',
    'modal' => [
        'heading' => 'Importar :label',
        'max_rows' => 'Os arquivos podem ter até :count linhas.',
        'submit' => 'Importar',
        'file' => 'Arquivo CSV',
        'columns' => 'Colunas',
        'skip_column' => 'Não importar',
        'example' => 'Baixar CSV de exemplo',
    ],
    'validation' => [
        'max_rows' => '{1} O arquivo pode ter no máximo :count linha.|[2,*] O arquivo pode ter no máximo :count linhas.',
    ],
    'notifications' => [
        'started' => [
            'title' => 'Importação iniciada',
            'body' => '{1} :count linha está sendo importada. Você será notificado quando terminar.|[2,*] :count linhas estão sendo importadas. Você será notificado quando terminar.',
        ],
        'completed' => [
            'title' => 'Importação concluída',
            'body' => '{0} Nenhuma linha foi importada.|{1} :count linha foi importada.|[2,*] :count linhas foram importadas.',
            'failed' => '{1} :count linha falhou.|[2,*] :count linhas falharam.',
            'download_failed_rows' => '{1} Baixar a linha com falha|[2,*] Baixar as linhas com falha',
        ],
    ],
    'failures' => [
        'record_not_found' => 'O registro a ser atualizado não foi encontrado.',
        'relationship_not_found' => 'Nenhum :attribute corresponde a ":value".',
        'unauthorized' => 'Você não tem permissão para atualizar este registro.',
        'unexpected' => 'Não foi possível importar a linha.',
    ],
    'failed_rows' => [
        'error' => 'Erro',
    ],
];

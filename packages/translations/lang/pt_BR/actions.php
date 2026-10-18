<?php

declare(strict_types=1);

return [
    'modal' => [
        'confirmation' => 'Tem certeza de que deseja fazer isso?',
        'confirm' => 'Confirmar',
        'submit' => 'Enviar',
        'cancel' => 'Cancelar',
        'close' => 'Fechar',
    ],
    'create' => [
        'label' => 'Criar :label',
        'modal' => [
            'heading' => 'Criar :label',
            'submit' => 'Criar',
        ],
        'notification' => 'Criado',
        'create_another' => 'Criar e criar outro',
    ],
    'edit' => [
        'label' => 'Editar',
        'modal' => [
            'heading' => 'Editar :label',
            'submit' => 'Salvar',
        ],
        'notification' => 'Salvo',
    ],
    'view' => [
        'label' => 'Visualizar',
        'modal' => [
            'heading' => 'Visualizar :label',
        ],
    ],
    'delete' => [
        'label' => 'Excluir',
        'modal' => [
            'heading' => 'Excluir :label',
            'submit' => 'Excluir',
        ],
        'notification' => 'Excluído',
        'bulk' => [
            'heading' => 'Excluir registros selecionados',
            'notification' => 'Excluídos',
        ],
    ],
    'restore' => [
        'label' => 'Restaurar',
        'modal' => [
            'heading' => 'Restaurar :label',
            'submit' => 'Restaurar',
        ],
        'notification' => 'Restaurado',
        'bulk' => [
            'heading' => 'Restaurar registros selecionados',
            'notification' => 'Restaurados',
        ],
    ],
    'force_delete' => [
        'label' => 'Forçar exclusão',
        'modal' => [
            'heading' => 'Excluir permanentemente :label',
            'description' => 'Esta ação não pode ser desfeita.',
            'submit' => 'Excluir',
        ],
        'notification' => 'Excluído permanentemente',
        'bulk' => [
            'heading' => 'Excluir permanentemente os registros selecionados',
            'notification' => 'Excluídos permanentemente',
        ],
    ],
    'replicate' => [
        'label' => 'Duplicar',
        'modal' => [
            'heading' => 'Duplicar :label',
            'submit' => 'Duplicar',
        ],
        'notification' => 'Duplicado',
    ],
    'attach' => [
        'label' => 'Anexar',
        'modal' => [
            'heading' => 'Anexar :label',
            'submit' => 'Anexar',
        ],
        'notification' => 'Anexado',
    ],
    'detach' => [
        'label' => 'Desanexar',
        'modal' => [
            'heading' => 'Desanexar :label',
            'submit' => 'Desanexar',
        ],
        'notification' => 'Desanexado',
    ],
    'associate' => [
        'label' => 'Associar',
        'modal' => [
            'heading' => 'Associar :label',
            'submit' => 'Associar',
        ],
        'notification' => 'Associado',
    ],
    'dissociate' => [
        'label' => 'Desassociar',
        'modal' => [
            'heading' => 'Desassociar :label',
            'submit' => 'Desassociar',
        ],
        'notification' => 'Desassociado',
    ],
    'detach_bulk' => [
        'heading' => 'Desanexar os registros selecionados',
        'notification' => 'Desanexado',
    ],
    'dissociate_bulk' => [
        'heading' => 'Desassociar os registros selecionados',
        'notification' => 'Desassociado',
    ],
    'rate_limited' => [
        'title' => 'Muitas tentativas',
        'body' => 'Aguarde :seconds segundo antes de tentar novamente.|Aguarde :seconds segundos antes de tentar novamente.',
    ],
    'password_confirmation' => [
        'incorrect' => 'A senha está incorreta.',
        'throttled' => 'Muitas tentativas. Tente novamente em :seconds segundos.',
    ],
    'bulk' => [
        'unauthorized_records' => ':count registro selecionado foi ignorado porque você não tem permissão para alterá-lo.|:count registros selecionados foram ignorados porque você não tem permissão para alterá-los.',
        'all_failed' => 'Não foi possível processar o registro.|Nenhum dos :count registros pôde ser processado.',
        'some_failed' => ':failure de :total registros não pôde ser processado.|:failure de :total registros não puderam ser processados.',
    ],
    'history' => [
        'label' => 'Histórico',
        'modal' => [
            'heading' => 'Histórico de :label',
            'close' => 'Fechar',
        ],
        'empty' => 'Ainda não há versões.',
        'events' => [
            'created' => 'Criado',
            'updated' => 'Atualizado',
            'deleted' => 'Excluído',
            'restored' => 'Restaurado',
            'reverted' => 'Versão anterior restaurada',
        ],
        'restore' => [
            'label' => 'Restaurar esta versão',
            'modal' => [
                'heading' => 'Restaurar esta versão?',
                'description' => 'Os campos acompanhados voltam aos valores desta versão. Os valores atuais permanecem no histórico.',
                'submit' => 'Restaurar',
            ],
            'notification' => 'Versão restaurada',
        ],
    ],
    'undo' => [
        'done' => 'Concluído',
        'notification' => 'Desfeito',
        'expired' => 'Isso não pode mais ser desfeito.',
        'conflict' => 'O registro foi alterado desde então, por isso não é possível desfazer.',
        'unavailable' => 'Não é mais possível desfazer porque o registro não existe mais.',
    ],
];

<?php

declare(strict_types=1);

return [
    'label' => 'modelo de e-mail',
    'plural_label' => 'modelos de e-mail',
    'navigation' => 'Modelos de e-mail',
    'sections' => [
        'template' => 'E-mail',
        'template_description' => 'Escolha o e-mail e o idioma desta versão.',
        'content' => 'Conteúdo',
        'content_description' => 'Deixe o assunto ou o conteúdo vazio para manter o do e-mail.',
    ],
    'fields' => [
        'key' => 'E-mail',
        'locale' => 'Idioma',
        'subject' => 'Assunto',
        'subject_help' => 'As tags de mesclagem também funcionam aqui, por exemplo {{ name }}.',
        'body' => 'Conteúdo',
        'body_help' => 'Insira tags de mesclagem pela barra de ferramentas; elas são substituídas pelos valores reais quando o e-mail é enviado.',
        'merge_tags' => 'Tags de mesclagem deste e-mail:',
        'status' => 'Status',
        'updated_at' => 'Atualizado',
    ],
    'statuses' => [
        'customized' => 'Personalizado',
        'default' => 'Padrão',
    ],
    'empty' => [
        'heading' => 'Nenhum e-mail personalizado',
        'description' => 'Personalize um e-mail para mudar o assunto e o conteúdo em um idioma.',
    ],
    'actions' => [
        'preview' => [
            'label' => 'Pré-visualizar',
            'close' => 'Fechar',
            'subject' => 'Assunto:',
            'light' => 'Claro',
            'dark' => 'Escuro',
            'frame' => 'Pré-visualização do e-mail (:variant)',
            'error' => 'Não foi possível pré-visualizar este e-mail.',
        ],
        'send_test' => [
            'label' => 'Enviar teste',
            'modal_heading' => 'Enviar um e-mail de teste?',
            'modal_description' => 'A versão salva é enviada com dados de exemplo para o seu próprio endereço, :email.',
            'submit' => 'Enviar teste',
            'sent' => 'E-mail de teste enviado para :email.',
            'no_email' => 'Sua conta não tem um endereço de e-mail para receber o teste.',
        ],
        'reset' => [
            'label' => 'Restaurar padrão',
            'modal_heading' => 'Restaurar o e-mail padrão?',
            'modal_description' => 'O e-mail volta ao próprio assunto e conteúdo. As versões anteriores ficam no histórico.',
            'submit' => 'Restaurar',
            'done' => 'O e-mail voltou ao padrão.',
        ],
    ],
    'test' => [
        'subject' => '[Teste] :subject',
    ],
    'validation' => [
        'unique' => 'Este e-mail já tem um modelo neste idioma.',
        'unknown_tags' => ':tags não é uma tag de mesclagem deste e-mail.|:tags não são tags de mesclagem deste e-mail.',
    ],
];

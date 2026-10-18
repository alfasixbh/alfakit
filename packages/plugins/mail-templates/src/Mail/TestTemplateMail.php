<?php

declare(strict_types=1);

namespace AlfaSix\AlfakitMailTemplates\Mail;

use AlfaSix\Alfakit\Mail\RenderedMailTemplate;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

/**
 * A rendered template sent to the admin who edits it (`SendTestMailAction`), with sample
 * data and a "[Test]" subject.
 */
class TestTemplateMail extends Mailable
{
    use Queueable;

    public function __construct(public RenderedMailTemplate $template) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: (string) __('alfakit-mail-templates::mail-templates.test.subject', ['subject' => $this->template->subject]));
    }

    public function content(): Content
    {
        return new Content(view: 'alfakit::mail.raw', text: 'alfakit::mail.raw-text', with: [
            'alfakitHtml' => $this->template->html,
            'alfakitText' => $this->template->text,
        ]);
    }
}

{{-- Login page: the demo credentials, above the form (Slot::AUTH_BEFORE). --}}
<p class="mb-4 text-center text-sm text-muted-foreground">{{ __('demo.login.about') }}</p>
<div class="mb-6 rounded-xl border border-(--alfakit-secondary)/40 bg-(--alfakit-secondary)/10 p-4 text-sm">
    <p class="font-semibold text-foreground">{{ __('demo.login.heading') }}</p>
    <p class="mt-1 text-muted-foreground">
        {!! __('demo.login.hint', [
            'email' => '<code class="rounded bg-background px-1.5 py-0.5 font-mono text-xs text-foreground" dir="ltr">'.e($email).'</code>',
            'password' => '<code class="rounded bg-background px-1.5 py-0.5 font-mono text-xs text-foreground" dir="ltr">'.e($password).'</code>',
        ]) !!}
    </p>
    <button
        type="button"
        class="mt-3 inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary/90"
        onclick="(function(){var f=function(n,v){var i=document.querySelector('input[name=&quot;'+n+'&quot;]');if(!i)return;var s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;s.call(i,v);i.dispatchEvent(new Event('input',{bubbles:true}));i.dispatchEvent(new Event('change',{bubbles:true}));};f('email',@js($email));f('password',@js($password));})()"
    >{{ __('demo.login.fill') }}</button>
</div>

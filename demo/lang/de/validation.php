<?php

declare(strict_types=1);

/*
 * German validation messages for the demo (Laravel ships English only). Covers the rules the
 * demo's forms use; anything else falls back to English. Keys match lang/ar/validation.php.
 */
return [
    'accepted' => ':attribute muss akzeptiert werden.',
    'after' => ':attribute muss ein Datum nach :date sein.',
    'after_or_equal' => ':attribute muss ein Datum am oder nach dem :date sein.',
    'alpha_dash' => ':attribute darf nur Buchstaben, Ziffern und Bindestriche enthalten.',
    'array' => ':attribute muss eine Liste sein.',
    'before' => ':attribute muss ein Datum vor :date sein.',
    'before_or_equal' => ':attribute muss ein Datum am oder vor dem :date sein.',
    'between' => [
        'numeric' => ':attribute muss zwischen :min und :max liegen.',
        'string' => ':attribute muss zwischen :min und :max Zeichen lang sein.',
        'array' => ':attribute muss zwischen :min und :max Elemente enthalten.',
        'file' => ':attribute muss zwischen :min und :max Kilobyte groß sein.',
    ],
    'boolean' => ':attribute muss wahr oder falsch sein.',
    'confirmed' => 'Die Bestätigung von :attribute stimmt nicht überein.',
    'current_password' => 'Das Passwort ist falsch.',
    'date' => ':attribute muss ein gültiges Datum sein.',
    'different' => ':attribute und :other müssen sich unterscheiden.',
    'digits' => ':attribute muss :digits Ziffern lang sein.',
    'distinct' => ':attribute enthält einen doppelten Wert.',
    'email' => ':attribute muss eine gültige E-Mail-Adresse sein.',
    'exists' => 'Der gewählte Wert für :attribute ist ungültig.',
    'file' => ':attribute muss eine Datei sein.',
    'filled' => ':attribute muss einen Wert enthalten.',
    'gt' => [
        'numeric' => ':attribute muss größer als :value sein.',
        'string' => ':attribute muss länger als :value Zeichen sein.',
        'array' => ':attribute muss mehr als :value Elemente enthalten.',
        'file' => ':attribute muss größer als :value Kilobyte sein.',
    ],
    'gte' => [
        'numeric' => ':attribute muss größer oder gleich :value sein.',
        'string' => ':attribute muss mindestens :value Zeichen lang sein.',
        'array' => ':attribute muss mindestens :value Elemente enthalten.',
        'file' => ':attribute muss mindestens :value Kilobyte groß sein.',
    ],
    'image' => ':attribute muss ein Bild sein.',
    'in' => 'Der gewählte Wert für :attribute ist ungültig.',
    'integer' => ':attribute muss eine ganze Zahl sein.',
    'lt' => [
        'numeric' => ':attribute muss kleiner als :value sein.',
        'string' => ':attribute muss kürzer als :value Zeichen sein.',
        'array' => ':attribute muss weniger als :value Elemente enthalten.',
        'file' => ':attribute muss kleiner als :value Kilobyte sein.',
    ],
    'lte' => [
        'numeric' => ':attribute muss kleiner oder gleich :value sein.',
        'string' => ':attribute darf höchstens :value Zeichen lang sein.',
        'array' => ':attribute darf höchstens :value Elemente enthalten.',
        'file' => ':attribute darf höchstens :value Kilobyte groß sein.',
    ],
    'max' => [
        'numeric' => ':attribute darf nicht größer als :max sein.',
        'string' => ':attribute darf höchstens :max Zeichen lang sein.',
        'array' => ':attribute darf höchstens :max Elemente enthalten.',
        'file' => ':attribute darf höchstens :max Kilobyte groß sein.',
    ],
    'mimes' => ':attribute muss eine Datei vom Typ :values sein.',
    'mimetypes' => ':attribute muss eine Datei vom Typ :values sein.',
    'min' => [
        'numeric' => ':attribute muss mindestens :min sein.',
        'string' => ':attribute muss mindestens :min Zeichen lang sein.',
        'array' => ':attribute muss mindestens :min Elemente enthalten.',
        'file' => ':attribute muss mindestens :min Kilobyte groß sein.',
    ],
    'numeric' => ':attribute muss eine Zahl sein.',
    'password' => [
        'letters' => ':attribute muss mindestens einen Buchstaben enthalten.',
        'mixed' => ':attribute muss mindestens einen Groß- und einen Kleinbuchstaben enthalten.',
        'numbers' => ':attribute muss mindestens eine Ziffer enthalten.',
        'symbols' => ':attribute muss mindestens ein Sonderzeichen enthalten.',
        'uncompromised' => ':attribute ist in einem Datenleck aufgetaucht. Bitte wählen Sie einen anderen Wert.',
    ],
    'regex' => 'Das Format von :attribute ist ungültig.',
    'required' => ':attribute ist ein Pflichtfeld.',
    'required_if' => ':attribute ist erforderlich, wenn :other :value ist.',
    'required_with' => ':attribute ist erforderlich, wenn :values angegeben ist.',
    'same' => ':attribute und :other müssen übereinstimmen.',
    'size' => [
        'numeric' => ':attribute muss :size sein.',
        'string' => ':attribute muss :size Zeichen lang sein.',
        'array' => ':attribute muss :size Elemente enthalten.',
        'file' => ':attribute muss :size Kilobyte groß sein.',
    ],
    'string' => ':attribute muss ein Text sein.',
    'unique' => ':attribute ist bereits vergeben.',
    'uploaded' => ':attribute konnte nicht hochgeladen werden.',
    'url' => ':attribute muss eine gültige URL sein.',

    'attributes' => [],
];

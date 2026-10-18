import { AlfakitComponent, type StandaloneComponentSchema } from '@alfakit/react';
import { Head } from '@inertiajs/react';
import Heading from '@/components/heading';

/**
 * An Alfakit form outside the admin panel: `ContactForm::make()` arrives as the `form`
 * prop and renders with the starter kit's own layout and shadcn tokens.
 */
export default function Contact({ form }: { form: StandaloneComponentSchema }) {
    return (
        <>
            <Head title="Contact" />
            <div className="mx-auto w-full max-w-2xl p-6">
                <Heading
                    title="Contact us"
                    description="This form is an AlfaKit standalone component rendered in the app layout."
                />
                <AlfakitComponent component={form} className="mt-6" />
            </div>
        </>
    );
}

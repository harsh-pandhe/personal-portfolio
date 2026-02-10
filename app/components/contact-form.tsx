"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import emailjs from "emailjs-com";

const formSchema = z.object({
    name: z.string().min(2, { message: "Name must be at least 2 characters." }),
    email: z
        .string()
        .email({ message: "Please enter a valid email address." }),
    message: z
        .string()
        .min(10, { message: "Message must be at least 10 characters." }),
});

export default function ContactForm() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [sent, setSent] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: { name: "", email: "", message: "" },
    });

    async function onSubmit(data: z.infer<typeof formSchema>) {
        setIsSubmitting(true);

        const serviceId = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID;
        const templateId = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID;
        const publicKey = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY;

        if (!serviceId || !templateId || !publicKey) {
            console.error("Missing EmailJS environment variables.");
            setIsSubmitting(false);
            return;
        }

        try {
            await emailjs.send(
                serviceId,
                templateId,
                {
                    from_name: data.name,
                    from_email: data.email,
                    message: data.message,
                },
                publicKey
            );
            setSent(true);
            form.reset();
            setTimeout(() => setSent(false), 4000);
        } catch (error) {
            console.error("Error sending email:", error);
        }

        setIsSubmitting(false);
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                {(["name", "email", "message"] as const).map((fieldName) => (
                    <FormField
                        key={fieldName}
                        control={form.control}
                        name={fieldName}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-sm text-neutral-300 capitalize">
                                    {fieldName}
                                </FormLabel>
                                <FormControl>
                                    {fieldName === "message" ? (
                                        <Textarea
                                            placeholder={`Your ${fieldName}`}
                                            className="resize-none h-28 bg-white/5 border-white/10 text-white placeholder:text-neutral-500 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                                            {...field}
                                        />
                                    ) : (
                                        <Input
                                            placeholder={`Your ${fieldName}`}
                                            className="bg-white/5 border-white/10 text-white placeholder:text-neutral-500 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                                            {...field}
                                        />
                                    )}
                                </FormControl>
                                <FormMessage className="text-sm text-red-400" />
                            </FormItem>
                        )}
                    />
                ))}

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-11 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-sm font-medium text-white transition-all duration-300 shadow-lg shadow-violet-500/20"
                >
                    {isSubmitting ? "Sending..." : sent ? "Sent!" : "Send Message"}
                </button>
            </form>
        </Form>
    );
}
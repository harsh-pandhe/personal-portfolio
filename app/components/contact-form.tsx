'use client'

import { useState } from 'react'
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { motion, AnimatePresence } from "framer-motion"
import emailjs from 'emailjs-com'
import { ButtonsCard } from '@/components/ui/tailwindcss-buttons'

const formSchema = z.object({
    name: z.string().min(2, {
        message: "Name must be at least 2 characters.",
    }),
    email: z.string().email({
        message: "Please enter a valid email address.",
    }),
    message: z.string().min(10, {
        message: "Message must be at least 10 characters.",
    }),
})

export default function ContactForm() {
    const [isSubmitting, setIsSubmitting] = useState(false)

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            email: "",
            message: "",
        },
    })

    async function onSubmit(data: { name: string; email: string; message: string }) {
        setIsSubmitting(true)

        const serviceId = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID;
        const templateId = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID;
        const publicKey = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY;

        if (!serviceId || !templateId || !publicKey) {
            console.error("Missing EmailJS environment variables.");
            setIsSubmitting(false);
            return;
        }

        try {
            const result = await emailjs.send(
                serviceId,
                templateId,
                {
                    from_name: data.name,
                    from_email: data.email,
                    message: data.message,
                },
                publicKey
            );
            console.log('Email sent successfully:', result);

            window.alert("Message Sent! Thanks for reaching out. I'll get back to you soon!");
        } catch (error) {
            console.error('Error sending email:', error);
        }

        setIsSubmitting(false);
        form.reset();
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <AnimatePresence>
                    {["name", "email", "message"].map((field) => (
                        <motion.div key={field}>
                            <FormField
                                control={form.control}
                                name={field as "name" | "email" | "message"}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-lg text-gray-800">
                                            {field.name.charAt(0).toUpperCase() + field.name.slice(1)}
                                        </FormLabel>
                                        <FormControl>
                                            {field.name === "message" ? (
                                                <Textarea
                                                    placeholder={`Your ${field.name}`}
                                                    className="resize-none h-32 bg-white text-black border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                                                    {...field}
                                                />
                                            ) : (
                                                <Input
                                                    placeholder={`Your ${field.name}`}
                                                    className="bg-white text-black border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                                                    {...field}
                                                />
                                            )}
                                        </FormControl>
                                        <FormMessage className="text-sm text-red-500" />
                                    </FormItem>
                                )}
                            />
                        </motion.div>
                    ))}
                </AnimatePresence>

                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <ButtonsCard key="Send">
                        <button
                            disabled={isSubmitting}
                            className="inline-flex h-12 w-full animate-shimmer items-center justify-center rounded-xl border border-slate-800 bg-[linear-gradient(110deg,#000103,45%,#1e2631,55%,#000103)] bg-[length:200%_100%] px-6 font-medium text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-50">
                            {isSubmitting ? "Sending..." : "Send Message"}
                        </button>
                    </ButtonsCard>
                </motion.div>
            </form>
        </Form >
    )
}
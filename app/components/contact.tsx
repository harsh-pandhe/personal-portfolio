"use client";
import React from "react";
import { Boxes } from "@/components/ui/background-boxes";
import ContactForm from '@/app/components/contact-form';
import { Mail, Phone, MapPin } from 'lucide-react';

export default function ContactPage() {
  return (
    <div className="relative w-full min-h-screen bg-slate-900 flex flex-col items-center justify-center overflow-hidden">
      <div className="absolute inset-0 w-full h-screen bg-slate-900 [mask-image:radial-gradient(transparent,white)] pointer-events-none" />
      <Boxes />
      <div className="w-full max-w-4xl z-20 mb-24 bg-white shadow-md rounded-2xl overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 md:p-8">
          <div className="p-6 text-blue-900 rounded-2xl flex flex-col justify-center">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight">
              Get in Touch!
            </h1>
            <p className="text-base md:text-lg opacity-90 mt-4">
              I'd love to hear from you! Whether you have a question, want to discuss a project, or just want to say hello, feel free to reach out.
            </p>
            <div className="space-y-4 mt-6">

              {[
                { icon: Mail, text: "harshpandhe@gmail.com", href: "mailto:harshpandhehome@gmail.com" },
                { icon: Phone, text: "+91 908-293-4286", href: "tel:+919082934286" },
                { icon: MapPin, text: "Navi Mumbai, IN", href: "https://g.co/kgs/GHoQCjN" },
              ].map((item, index) => (
                <a
                  key={index}
                  href={item.href}
                  className="flex items-center space-x-3 text-sm md:text-base hover:opacity-80 transition-opacity duration-200"
                >
                  <item.icon className="h-5 w-5 md:h-6 md:w-6" />
                  <span>{item.text}</span>
                </a>
              ))}
            </div>
          </div>

          <div className="bg-blue-100 p-6 text-gray-900 rounded-2xl flex flex-col justify-center">
            <h2 className="text-2xl font-bold text-center mb-4">Drop a Message</h2>
            <p className="text-center text-gray-600 mb-6">
              I'll get back to you as soon as possible.
            </p>
            <ContactForm />
          </div>
        </div>
      </div>
    </div>
  );
}

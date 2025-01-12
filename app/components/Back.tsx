import Spline from "@splinetool/react-spline";
import { FlipWords } from "@/components/ui/flip-words";
import { ShootingStars } from "@/components/ui/shooting-stars";
import { StarsBackground } from "@/components/ui/stars-background";

export default function Back() {
    const words = [
        "Harsh Pandhe",
        "a JavaScript developer",
        "a Python developer",
        "a C developer",
        "a Java developer",
        "a C++ developer",
        "a Rust developer",
        "a React developer",
        "a TypeScript developer",
        "a Node.js developer",
        "a Next.js developer",
        "a PHP developer",
        "a HTML developer",
        "a CSS developer",
        "a TailwindCSS developer",
        "a Sass developer",
        "a SQL developer",
        "a MongoDB developer",
        "a PostgreSQL developer",
        "a Firebase developer",
    ];

    const hello = [
        "Namaste",
        "Hello",
        "Bonjour",
        "Hola",
        "Ciao",
        "Hallo",
        "Olá",
        "Konnichiwa",
        "Annyeong",
        "Zdravstvuyte",
        "Nǐ hǎo",
        "Shalom",
        "Sawubona",
    ];

    return (
        <div className="relative h-screen">
            <div className="absolute text-center top-7 md:text-4xl text-lg mx-auto font-normal text-white dark:text-white w-full">
                <FlipWords words={hello} />
                <br />
                I am <FlipWords words={words} />
            </div>
            <StarsBackground className="absolute inset-0 z-10 h-full w-full" />

            <div className="relative z-20 h-full">
                <Spline scene="https://prod.spline.design/oumZ0UDMuQBuUecd/scene.splinecode" />
            </div>

            <ShootingStars className="absolute inset-0 z-30" />

        </div>
    );
}
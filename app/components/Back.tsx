import Spline from "@splinetool/react-spline";
import { ShootingStars } from "@/components/ui/shooting-stars";
import { StarsBackground } from "@/components/ui/stars-background";
import { FlipWords } from "@/components/ui/flip-words";

export default function Back() {
    const programmingLanguages = [
        "JavaScript",
        "Python",
        "C",
        "Java",
        "C++",
        "Rust",
        "React",
        "TypeScript",
        "Node.js",
        "Next.js",
        "PHP",
        "HTML",
        "CSS",
        "TailwindCSS",
        "Sass",
        "SQL",
        "MongoDB",
        "PostgreSQL",
        "Firebase",
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
                My name is Harsh Pandhe.
                <br />
                I am a <FlipWords words={programmingLanguages} />developer from India.
            </div>

            <StarsBackground className="absolute inset-0 z-10 h-full w-full" />

            <div className="relative z-20 h-full">
                <Spline scene="https://prod.spline.design/oumZ0UDMuQBuUecd/scene.splinecode" />
            </div>

            <ShootingStars className="absolute inset-0 z-30" />

        </div>
    );
}
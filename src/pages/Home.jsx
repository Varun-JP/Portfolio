import { ThemeToggle } from "../components/ThemeToggle";
import { StarBackground } from "../components/StarBackground";
import { Navbar } from "@/components/Navbar";
import { HeroSection } from "../components/HeroSection";
import { AboutMe } from "../components/AboutMe";
import { Skills } from "../components/Skills";
import { ProjectsSection } from "../components/ProjectsSection";
import { ContactSection } from "@/components/ContactSection";
import { Footer } from "@/components/Footer";
export const Home = () => {
    return <div className="min-h-screen bg-background text-foreground overflow-x-hidden">


        {/*Theme toggle*/}
            <ThemeToggle />
        {/*Backgrund Effects*/}
            <StarBackground />

             <Navbar />

        <main>
            <HeroSection />
            <AboutMe />
            <Skills />
            <ProjectsSection />
        </main>

        {/*footer*/}
        <ContactSection />
        <Footer />


    </div>;
};
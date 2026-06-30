import { Skills } from "../components/Skills";
import { ProjectsSection } from "../components/ProjectsSection";
import { ContactSection } from "@/components/ContactSection";
import { Footer } from "@/components/Footer";

export const Home = () => {
  return (
    <div className="bg-background text-foreground overflow-x-hidden">
      <main>
        <Skills />
        <ProjectsSection />
        <ContactSection />
      </main>
      <Footer />
    </div>
  );
};
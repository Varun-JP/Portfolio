import { Briefcase, User , Code } from "lucide-react"






export const AboutMe = () => {
    return <section id="about" className="py-24 px-4 relative ">
        <div className="container mx-auto max-w-5xl ">
            <h2 className="text-3xl md:text-4xl font-bold mb-12 text-center">
                About <span className="text-primary"> Me</span>
            </h2>


            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center ">
                <div className="space-y-6 ">
                    <h3 className="text-2xl font-semibold ">Passionate Developer</h3>
                    <p className="text-muted-foreground ">
                        I'm a passionate developer with a keen interest in building clean, functional, and visually engaging web applications. 
                    </p>
                    <p className="text-muted-foreground ">
                       Beyond coding, I’m curious about design, user experience, and how
                       technology can be leveraged to create meaningful digital products.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 pt-4 justify-center ">
                        <a href="#contact" className="px-6 py-2 rounded-full border border-primary text-primary hover:bg-primary/10 transition-colors duration-300 ">
                            
                            Get in Touch
                        </a>
                        <a href="#contact" className="cosmic-button">
                            
                            Resume/CV
                        </a>
                    </div>

            </div>
            <div className="grid grid-cols-1 gap-6">
                <div className="gradient-border p-6 card-hover" style={{ background: "rgba(255, 255, 255, 0.15)" }}>
                    <div className="flex items-start gap-4">
                            <div className="p-3 rounded-full border border-primary/10">
                                <Code className="w-6 h-6 text-primary"/>
                            </div>
                            <div className="text-left">
                                <h4 className="font-semibold text-lg">
                                    Web Development
                                </h4>
                                <p className="text-muted-foreground">
                                    Creating responsive and user-friendly websites using HTML, CSS, JavaScript, and frameworks like React.
                                </p>
                            </div>
                    </div>
                </div>
                <div className="gradient-border p-6 card-hover" style={{ background: "rgba(255, 255, 255, 0.10)" }}>
                    <div className="flex items-start gap-4">
                            <div className="p-3 rounded-full border border-primary/10">
                                <User className="w-6 h-6 text-primary"/>
                            </div>
                           <div className="text-left">
                                <h4 className="font-semibold text-lg">
                                    UI/UX Development
                                </h4>
                                <p className="text-muted-foreground">
                                     Designing intuitive and visually appealing interfaces that
                                     balance creativity with usability.
                                </p>
                            </div>                            
                    </div>
                </div>
                <div className="gradient-border p-6 card-hover" style={{ background: "rgba(255, 255, 255, 0.05)" }}>
                    <div className="flex items-start gap-4">
                            <div className="p-3 rounded-full border border-primary/10">
                                <Briefcase className="w-6 h-6 text-primary"/>
                            </div>
                           <div className="text-left">
                                <h4 className="font-semibold text-lg">
                                    Project Management
                                </h4>
                                <p className="text-muted-foreground">
                                     Experience working in collaborative environments, managing
                                     tasks efficiently, and delivering projects on time.
                                </p>
                            </div>
                    </div>
                </div>
            </div>
        </div>
        </div>
        </section>
}
import { ArrowUp } from "lucide-react"

export const Footer = () => {
    return (
        <footer className="py-12 px-4 relative bg-card border-t border-border mt-12 pt-8 flex flex-wrap justify-between items-center ">

            <p className="text-muted-foreground text-sm">&copy; {new Date().getFullYear()} Varun JP. All rights reserved.</p>  
            <a href="#" className="p-2 rounded-full border bg-primary/10 hover:bg-primary/20 text-primary transition-colors">
                <ArrowUp size={20}/>
            </a>
        </footer>
    )
}

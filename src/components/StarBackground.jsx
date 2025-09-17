import { useEffect, useState } from "react";
export const StarBackground= ()=>{
    const [stars, setStars]= useState([]);  
    const [meteors, setMeteors]= useState([]);  
    const [isDarkMode, setIsDarkMode] = useState(false);
    useEffect(() => {
        generateStars();
        generateMeteors();
        const handleResize= ()=>{
            generateStars();
        };

    // Read initial theme
        setIsDarkMode(localStorage.getItem("theme") === "dark");

    // Listen for theme changes
        const handler = () => {
        setIsDarkMode(localStorage.getItem("theme") === "dark");
        };
  window.addEventListener("themeChange", handler);
  window.addEventListener("resize", handleResize);

  return () => {
                window.removeEventListener("themeChange", handler);
                window.removeEventListener("resize", handleResize);
}}, []);
    
    //empty dependency array [] here is useful since other wise theloopwould break your computer 
    const generateStars= () =>{
        
        const numberOfStars = Math.floor((window.innerWidth * window.innerHeight)/10000);
    

    const newStars= [];
    for(let i=0; i<numberOfStars;i++){
        newStars.push({
            id:i,
            size: Math.random()*3+1,
            x:Math.random()*100,
            y:Math.random()*100,
            opacity: Math.random()*0.5+0.5,
            animationDuration: Math.random()*4+2,

        });

    }

    setStars(newStars);
    };

    const generateMeteors= () =>{
        
        const numberOfMeteors = 5;
        const newMeteors=[];
        for(let i=0; i<numberOfMeteors;i++){
            newMeteors.push({
                id:i,
                size: Math.random()*2+1,
                x:Math.random()*100,
                y:Math.random()*20,
                delay: Math.random()*15,
                animationDuration: Math.random()*3+3,
            });
        }    

        setMeteors(newMeteors);
    };
    return (
    
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Light background: visible only in light mode ::: keyholder: light mode color[colour]*/}
                {!isDarkMode && (
                <div className="absolute inset-0 bg-gradient-to-b from-[#f5f7ff] via-[#e0e4ff] to-[#d0d4ff]" />
                )}

      {/* Dark background: visible only in dark mode ::: keyholder: dark mode color[colour]*/}
                {isDarkMode && (
                <div className="absolute inset-0 bg-gradient-to-b from-[#0a0020] via-[#171e6e] via-[#1a1a66] via-[#0e0530] to-[#225392]" />
                )}
        {stars.map((star)=>(
            <div 
                key={star.id} className="star animate-pulse-subtle" style={{
                width:star.size+'px',
                height:star.size+'px',
                left:star.x+'%',
                top:star.y+'%',
                opacity:star.opacity,
                animationDuration:star.animationDuration+'s',
            }}/>
        ))}
        {isDarkMode && meteors.map((meteor)=>(
            <div 
                key={meteor.id} className="meteor animate-meteor" style={{
                width: `${meteor.size * 50}px`,
                height: `${meteor.size / 1.5}px`,
                left:meteor.x+'%',
                top:meteor.y+'%',
                animationDelay:meteor.delay,
                animationDuration:meteor.animationDuration+'s',
            }}/>
        ))}
    </div>

);
};
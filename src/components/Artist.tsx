import { useRef, useState, useEffect, memo } from 'react';
import { motion, useInView, useScroll, useTransform } from 'motion/react';

import './Artist.css';

const CYAN = "#00d2d3";
const PINK = "#e84393";
const PURPLE = "#9b5de5";

interface ArtistProp {
    name: string;
    image: string;
    role: string;
    color: string;
}

const day2Artists: ArtistProp[] = [
    { name: "Akshay Barodia", image: "/Artists/Akshay_Barodia.webp", role: "The Groove Master", color: PURPLE },
    { name: "DJ Jerry", image: "/Artists/Dj_Jerry.webp", role: "Electrifying Beats", color: CYAN },
    { name: "Kamandal", image: "/Artists/Kamandal.webp", role: "Rocking the Cosmos", color: PINK },
];

const SectionDivider = memo(() => (
    <div className="md:hidden w-full flex justify-center py-4">
        <div className="w-[80%] h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
    </div>
));

const HeroSection = memo(() => (
    <section className="relative h-screen min-h-[600px] flex flex-col items-center justify-center overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#00d2d3]/50 to-transparent" />

        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="relative z-10 text-center px-6"
        >
            <motion.h1
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                transition={{ duration: 2, ease: "easeOut" }}
                className="font-['Cinzel'] text-[clamp(2.8rem,10vw,8rem)] text-transparent bg-clip-text bg-gradient-to-b from-white to-[#00d2d3]/80 tracking-[0.12em] md:tracking-[0.15em] mb-4 drop-shadow-[0_0_40px_rgba(0,210,211,0.3)]"
            >
                ARTISTS
            </motion.h1>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 1 }}
                className="flex items-center justify-center gap-4 font-['Cormorant_Garamond'] text-[clamp(0.9rem,2vw,1.4rem)] tracking-[0.3em] md:tracking-[0.4em] uppercase text-white/60"
            >
                STARS OF THE NIGHT
            </motion.div>
        </motion.div>

        <motion.div
            className="absolute bottom-10 flex flex-col items-center gap-3"
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
        >
            <div className="w-[1px] h-12 bg-gradient-to-b from-white/40 to-transparent" />
            <span className="font-sans text-[10px] md:text-xs tracking-[0.3em] uppercase text-white/30">Scroll</span>
        </motion.div>
    </section>
));

const Day1Section = memo(() => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, amount: 0.15 });

    return (
        <section ref={ref} className="relative min-h-[80vh] flex items-center justify-center py-16 md:py-20 lg:py-24 px-6 lg:px-16 overflow-hidden">
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_30%_50%,rgba(0,210,211,0.15)_0%,transparent_60%)]" />

            <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-10 md:gap-12 lg:gap-24">
                <motion.div
                    initial={{ opacity: 0, x: -50, rotateY: 15 }}
                    animate={isInView ? { opacity: 1, x: 0, rotateY: 0 } : {}}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="w-full lg:w-1/2 flex justify-center perspective-[1000px]"
                >
                    <div className="relative w-full max-w-[320px] md:max-w-[420px] aspect-[4/5] rounded-2xl overflow-hidden border border-[#00d2d3]/30 shadow-[0_0_40px_rgba(0,210,211,0.4)]">
                        <img
                            src="/Artists/Navjot_Ahuja.webp"
                            alt="Navjot Ahuja"
                            className="w-full h-full object-cover object-[center_15%] transition-transform duration-1000 hover:scale-105"
                            loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#050810] via-transparent to-transparent opacity-80" />
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: 50 }}
                    animate={isInView ? { opacity: 1, x: 0 } : {}}
                    transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
                    className="w-full lg:w-1/2 flex flex-col items-center lg:items-start text-center lg:text-left"
                >
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-8 md:w-10 h-[1px] bg-[#00d2d3] opacity-60 hidden lg:block" />
                        <span className="font-['Cinzel'] text-xs md:text-sm tracking-[0.2em] md:tracking-[0.3em] text-[#00d2d3]">DAY 1 &middot; THE AWAKENING</span>
                        <div className="w-8 md:w-10 h-[1px] bg-[#00d2d3] opacity-60 block lg:hidden" />
                    </div>

                    <h2 className="font-['Cinzel'] text-[clamp(2.2rem,6vw,5rem)] font-bold mb-4 md:mb-6 text-white leading-tight drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                        Navjot Ahuja
                    </h2>

                    <p className="font-['Cormorant_Garamond'] text-[clamp(1.1rem,2vw,1.6rem)] italic text-white/70 leading-relaxed max-w-sm md:max-w-md">
                        Prepare to be enchanted by soulful melodies and an awakening of the senses.
                        Navjot Ahuja sets the celestial rhythm of Oneiros 2026, delivering an unforgettable
                        opening night.
                    </p>
                </motion.div>
            </div>
        </section>
    );
});

const Day2Section = memo(({ isMobile }: { isMobile: boolean }) => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, amount: 0.1 });
    const [hoveredArtist, setHoveredArtist] = useState<string | null>(null);

    return (
        <section ref={ref} className="relative min-h-screen flex items-center justify-center py-16 md:py-24 px-6 lg:px-16 overflow-hidden">
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_50%_50%,rgba(155,93,229,0.1)_0%,transparent_70%)]" />
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />

            <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col items-center">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.8 }}
                    className="text-center mb-12 md:mb-16"
                >
                    <span className="block font-['Cinzel'] text-xs md:text-sm tracking-[0.25em] md:tracking-[0.3em] text-[#9b5de5] mb-3 md:mb-4">DAY 2 &middot; THE COSMIC SYNERGY</span>
                    <h2 className="font-['Cinzel'] text-[clamp(1.8rem,5vw,4.5rem)] text-white">A Trinity of Stars</h2>
                </motion.div>

                <div className="flex flex-col lg:flex-row w-full h-[750px] md:h-[650px] lg:h-[550px] gap-3 md:gap-4">
                    {day2Artists.map((artist, i) => {
                        const isHovered = hoveredArtist === artist.name;
                        const isOtherHovered = hoveredArtist !== null && !isHovered;

                        return (
                            <motion.div
                                key={artist.name}
                                initial={{ opacity: 0, y: 50 }}
                                animate={isInView ? { opacity: 1, y: 0 } : {}}
                                transition={{ duration: 0.8, delay: i * 0.15 }}
                                onMouseEnter={() => !isMobile && setHoveredArtist(artist.name)}
                                onMouseLeave={() => !isMobile && setHoveredArtist(null)}
                                onClick={() => isMobile && setHoveredArtist(isHovered ? null : artist.name)}
                                layout
                                style={{
                                    flex: isMobile ? (isHovered ? 3 : 1) : (isHovered ? 3 : 1),
                                    borderColor: `${artist.color}30`
                                }}
                                className={`relative rounded-xl md:rounded-2xl overflow-hidden cursor-pointer border transition-all duration-500 ease-[cubic-bezier(0.25,0.8,0.25,1)]
                                    ${isOtherHovered ? 'opacity-50 grayscale-[50%]' : 'opacity-100 grayscale-0'}
                                `}
                            >
                                <img
                                    src={artist.image}
                                    alt={artist.name}
                                    className="absolute inset-0 w-full h-full object-cover object-[center_20%] transition-transform duration-700 hover:scale-105"
                                    loading="lazy"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#050810] via-[#050810]/40 to-transparent opacity-80 lg:opacity-60 transition-opacity" />

                                <motion.div
                                    className="absolute bottom-0 left-0 w-full p-4 md:p-6 lg:p-8 flex flex-col justify-end"
                                    initial={false}
                                    animate={{
                                        y: isHovered || isMobile ? 0 : 20,
                                        opacity: isHovered || isMobile ? 1 : 0.7
                                    }}
                                    transition={{ duration: 0.4 }}
                                >
                                    <h4 className="font-['Cinzel'] text-xl md:text-2xl lg:text-3xl text-white mb-1 md:mb-2 whitespace-nowrap">{artist.name}</h4>
                                    <p className="font-['Cormorant_Garamond'] text-sm md:text-base lg:text-lg italic opacity-90" style={{ color: artist.color }}>{artist.role}</p>
                                </motion.div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
});

const Day3Section = memo(() => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, amount: 0.15 });

    return (
        <section ref={ref} className="relative min-h-[80vh] flex items-center justify-center py-16 md:py-24 px-6 lg:px-16 overflow-hidden">
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_70%_50%,rgba(232,67,147,0.15)_0%,transparent_60%)]" />

            <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col-reverse lg:flex-row items-center gap-10 md:gap-12 lg:gap-24">
                <motion.div
                    initial={{ opacity: 0, x: -50 }}
                    animate={isInView ? { opacity: 1, x: 0 } : {}}
                    transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
                    className="w-full lg:w-1/2 flex flex-col items-center lg:items-end text-center lg:text-right"
                >
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-8 md:w-10 h-[1px] bg-[#e84393] opacity-60 block lg:hidden" />
                        <span className="font-['Cinzel'] text-xs md:text-sm tracking-[0.2em] md:tracking-[0.3em] text-[#e84393]">DAY 3 &middot; THE GRAND FINALE</span>
                        <div className="w-8 md:w-10 h-[1px] bg-[#e84393] opacity-60 hidden lg:block" />
                    </div>

                    <h2 className="font-['Cinzel'] text-[clamp(2.5rem,7vw,5.5rem)] font-bold mb-4 md:mb-6 text-white leading-tight drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                        Benny Dayal
                    </h2>

                    <p className="font-['Cormorant_Garamond'] text-[clamp(1.1rem,2vw,1.6rem)] italic text-white/70 leading-relaxed max-w-sm md:max-w-md">
                        The ultimate crescendo to our celestial journey. Dance the night away with
                        Benny Dayal's powerhouse vocals and legendary energetic performance.
                    </p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: 50, rotateY: -15 }}
                    animate={isInView ? { opacity: 1, x: 0, rotateY: 0 } : {}}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="w-full lg:w-1/2 flex justify-center perspective-[1000px]"
                >
                    <div className="relative w-full max-w-[320px] md:max-w-[450px] aspect-square lg:aspect-[4/5] rounded-2xl overflow-hidden border-2 border-[#e84393]/40 shadow-[0_0_50px_rgba(232,67,147,0.5)]">
                        <img
                            src="/Artists/Benny_Dayal.webp"
                            alt="Benny Dayal"
                            className="w-full h-full object-cover object-[center_10%] transition-transform duration-1000 hover:scale-110"
                            loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#050810] via-transparent to-transparent opacity-80" />
                    </div>
                </motion.div>
            </div>
        </section>
    );
});

export default function Artist() {
    const containerRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end end"]
    });

    const backgroundY = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 900);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    return (
        <div className="artist-page relative bg-[#050810] min-h-screen text-white overflow-hidden" ref={containerRef}>
            <motion.div
                className="absolute inset-0 pointer-events-none opacity-20"
                style={{
                    y: backgroundY,
                    backgroundImage: 'radial-gradient(circle at 50% 30%, rgba(0, 210, 211, 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(232, 67, 147, 0.1) 0%, transparent 40%)'
                }}
            />

            <HeroSection />
            <Day1Section />
            <SectionDivider />
            <Day2Section isMobile={isMobile} />
            <SectionDivider />
            <Day3Section />
        </div>
    );
}

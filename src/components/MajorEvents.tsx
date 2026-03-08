import { useRef, useState } from "react";
import { motion, useInView } from "motion/react";
import CosmicBackground from "./CosmicBackground";
import "./MajorEvents.css";

const CYAN = "#00d2d3";
const PINK = "#e84393";
const PURPLE = "#9b5de5";

interface Event {
  number: string;
  name: string;
  prize: string;
  description: string;
  images: [string, string, string];
  imageLeft: boolean;
  glowColors: [string, string, string];
}

const events: Event[] = [
  {
    number: "01",
    name: "REQUIEM",
    prize: "₹50,000",
    description: "A high-octane musical showdown where vocalists and instrumentalists battle for harmonic supremacy.",
    images: ["/major_events/requiem/3.webp", "/major_events/requiem/2.webp", "/major_events/requiem/1.webp"],
    imageLeft: true,
    glowColors: [CYAN, PURPLE, CYAN],
  },
  {
    number: "02",
    name: "DESTIVAL",
    prize: "₹60,000",
    description: "A high-energy dance competition celebrating rhythm, choreography, and the art of movement.",
    images: ["/major_events/destival/3.webp", "/major_events/destival/2.webp", "/major_events/destival/1.webp"],
    imageLeft: false,
    glowColors: [PINK, CYAN, PURPLE],
  },
  {
    number: "03",
    name: "COSMOS",
    prize: "₹40,000",
    description: "A premier fashion runway where style meets creativity in a dazzling display of avant-garde design.",
    images: ["/major_events/cosmos/3.webp", "/major_events/cosmos/2.webp", "/major_events/cosmos/1.webp"],
    imageLeft: true,
    glowColors: [CYAN, PINK, CYAN],
  },
  {
    number: "04",
    name: "SPOT PHOTOGRAPHY",
    prize: "₹25,000",
    description: "A test of pure skill where photographers have two hours to capture three unedited images on a surprise theme.",
    images: ["/major_events/photography/3.webp", "/major_events/photography/2.webp", "/major_events/photography/1.webp"],
    imageLeft: false,
    glowColors: [PURPLE, CYAN, PINK],
  },
  {
    number: "05",
    name: "BEHAS",
    prize: "₹25,000",
    description: "A premier parliamentary debating tournament where the sharpest minds clash in a battle of wit and logic.",
    images: ["/major_events/behas/3.webp", "/major_events/behas/2.webp", "/major_events/behas/1.webp"],
    imageLeft: true,
    glowColors: [CYAN, PURPLE, PINK],
  },
  {
    number: "06",
    name: "NUKKAD NATAK",
    prize: "₹30,000",
    description: "A powerful street play competition bringing impactful stories and vibrant energy to the open air.",
    images: ["/major_events/nukkad-natak/3.webp", "/major_events/nukkad-natak/2.webp", "/major_events/nukkad-natak/1.webp"],
    imageLeft: false,
    glowColors: [PINK, CYAN, PURPLE],
  },
];

function ImageCollage({
  images, glowColors, reversed, eventName,
}: {
  images: [string, string, string];
  glowColors: [string, string, string];
  reversed: boolean;
  eventName: string;
}) {
  const [order, setOrder] = useState<number[]>([0, 1, 2]);
  const baseRotations = reversed ? [5, -4, 3] : [-6, 4, -3];
  const slots = [
    { top: 0, left: 0 },
    { top: 110, left: 90 },
    { top: 220, left: 180 },
  ];

  const sendToBack = (imgIndex: number) => {
    setOrder((prev) => {
      const rest = prev.filter((i) => i !== imgIndex);
      return [imgIndex, ...rest];
    });
  };

  return (
    <motion.div
      className="relative shrink-0"
      style={{ width: "min(500px, 90vw)", height: "min(580px, 70vw)" }}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.9, ease: "easeOut" }}
    >
      {order.map((imgIndex, slotPos) => (
        <motion.div
          key={imgIndex}
          onClick={() => sendToBack(imgIndex)}
          initial={false}
          animate={{
            top: `${slots[slotPos].top * 0.55}px`,
            left: `${slots[slotPos].left * 0.55}px`,
            rotate: baseRotations[slotPos],
          }}
          transition={{ duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] }}
          whileHover={{ scale: 1.05, transition: { duration: 0.18 } }}
          whileTap={{ scale: 0.93, transition: { duration: 0.12 } }}
          className="absolute overflow-hidden cursor-pointer select-none"
          style={{
            width: "min(260px, 55vw)",
            height: "min(340px, 72vw)",
            zIndex: slotPos + 1,
            borderRadius: "16px",
            border: `1.5px solid ${glowColors[imgIndex]}80`,
            boxShadow: `0 0 18px ${glowColors[imgIndex]}60, 0 0 40px ${glowColors[imgIndex]}25, inset 0 0 20px rgba(0,0,0,0.4)`,
          }}
        >
          <img
            src={images[imgIndex]}
            alt={`${eventName} at Oneiros 2026`}
            className="w-full h-full object-cover"
            style={{ filter: "brightness(0.88) contrast(1.05)", pointerEvents: "none" }}
            loading="lazy"
            decoding="async"
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://placehold.co/260x340/0a0a1a/00d2d3?text=Coming+Soon`;
            }}
          />
          <div
            className="absolute inset-0"
            style={{ background: `linear-gradient(135deg, ${glowColors[imgIndex]}15 0%, transparent 50%, rgba(0,0,0,0.3) 100%)` }}
          />
          {slotPos === 2 && (
            <div
              className="absolute inset-0 flex items-end justify-center pb-4 opacity-0 hover:opacity-100"
              style={{ transition: "opacity 0.25s ease" }}
            >
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: "0.55rem", letterSpacing: "0.25em", color: "rgba(255,255,255,0.55)" }}>
                CLICK TO SHUFFLE
              </span>
            </div>
          )}
        </motion.div>
      ))}
    </motion.div>
  );
}

function EventSection({ event }: { event: Event }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.2 });

  const textVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <section
      ref={ref}
      className="relative flex items-center justify-center overflow-hidden"
      style={{ minHeight: "100vh", padding: "5rem 0" }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at ${event.imageLeft ? "25%" : "75%"} 50%, ${event.glowColors[0]}12 0%, transparent 60%)` }}
      />
      <div
        className="absolute top-0 left-0 right-0"
        style={{ height: "1px", background: `linear-gradient(90deg, transparent 0%, ${CYAN}40 30%, ${PINK}40 70%, transparent 100%)` }}
      />

      {/* ── DESKTOP: side-by-side layout ── */}
      <div
        className="relative z-10 hidden lg:flex items-center justify-between w-full max-w-7xl mx-auto px-16 gap-8"
        style={{ flexDirection: event.imageLeft ? "row" : "row-reverse" }}
      >
        <div className="flex items-center justify-center shrink-0">
          <ImageCollage images={event.images} glowColors={event.glowColors} reversed={!event.imageLeft} eventName={event.name} />
        </div>

        <motion.div
          className="flex flex-col justify-center"
          style={{ maxWidth: "520px" }}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          variants={textVariants}
          transition={{ duration: 0.85, ease: "easeOut" }}
        >
          <div className="flex items-center gap-4 mb-5">
            <div style={{ width: "40px", height: "1px", backgroundColor: CYAN, opacity: 0.6 }} />
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: "0.75rem", letterSpacing: "0.35em", color: CYAN }}>
              {event.number}
            </span>
          </div>
          <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: "clamp(2.8rem, 6vw, 5.5rem)", fontWeight: 700, color: "#ffffff", lineHeight: 1.05, letterSpacing: "0.04em", marginBottom: "1.2rem" }}>
            {event.name}
          </h2>
          <div className="flex items-center gap-3 mb-6">
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: "0.7rem", letterSpacing: "0.3em", color: `${CYAN}90` }}>PRIZE POOL</span>
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: "1.1rem", color: CYAN, textShadow: `0 0 12px ${CYAN}cc`, fontWeight: 600 }}>{event.prize}</span>
          </div>
          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(1.35rem, 2vw, 1.7rem)", fontStyle: "italic", fontWeight: 300, color: "rgba(255,255,255,0.65)", lineHeight: 1.85, maxWidth: "420px", marginBottom: "2rem" }}>
            {event.description}
          </p>
          <div className="flex items-center gap-3">
            {[PINK, CYAN, CYAN].map((color, i) => (
              <div key={i} style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: color, boxShadow: `0 0 8px ${color}aa` }} />
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── MOBILE: stacked layout ── */}
      <motion.div
        className="relative z-10 flex lg:hidden flex-col items-center w-full px-6 gap-10 text-center"
        initial={{ opacity: 0, y: 40 }}
        animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        {/* Single hero image on mobile */}
        <div
          style={{
            width: "75vw",
            height: "95vw",
            maxWidth: "340px",
            maxHeight: "440px",
            borderRadius: "16px",
            overflow: "hidden",
            border: `1.5px solid ${event.glowColors[0]}60`,
            boxShadow: `0 0 24px ${event.glowColors[0]}50`,
            flexShrink: 0,
          }}
        >
          <img
            src={event.images[2]}
            alt={`${event.name} at Oneiros 2026`}
            style={{ width: "100%", height: "100%", objectFit: "cover", filter: "brightness(0.88) contrast(1.05)" }}
            loading="lazy"
            decoding="async"
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://placehold.co/400x260/0a0a1a/00d2d3?text=${event.name}`;
            }}
          />
        </div>

        {/* Text */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-3 mb-4">
            <div style={{ width: "28px", height: "1px", backgroundColor: CYAN, opacity: 0.6 }} />
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: "0.7rem", letterSpacing: "0.35em", color: CYAN }}>{event.number}</span>
            <div style={{ width: "28px", height: "1px", backgroundColor: CYAN, opacity: 0.6 }} />
          </div>

          <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: "clamp(2rem, 9vw, 3.5rem)", fontWeight: 700, color: "#ffffff", lineHeight: 1.05, letterSpacing: "0.06em", marginBottom: "1rem" }}>
            {event.name}
          </h2>

          <div className="flex items-center justify-center gap-3 mb-5">
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: "0.65rem", letterSpacing: "0.3em", color: `${CYAN}90` }}>PRIZE POOL</span>
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: "1rem", color: CYAN, textShadow: `0 0 12px ${CYAN}cc`, fontWeight: 600 }}>{event.prize}</span>
          </div>

          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(1.1rem, 4.5vw, 1.4rem)", fontStyle: "italic", fontWeight: 300, color: "rgba(255,255,255,0.65)", lineHeight: 1.8, maxWidth: "340px", marginBottom: "1.5rem" }}>
            {event.description}
          </p>

          <div className="flex items-center justify-center gap-3">
            {[PINK, CYAN, CYAN].map((color, i) => (
              <div key={i} style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: color, boxShadow: `0 0 6px ${color}aa` }} />
            ))}
          </div>
        </div>
      </motion.div>
    </section>
  );
}

export default function MajorEvents() {
  return (
    <div className="major-events-page" style={{ minHeight: "100vh", position: "relative" }}>
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}>
        <CosmicBackground />
      </div>

      <img
        src="/favicon-nobg.webp"
        alt=""
        style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "min(60vw,480px)", opacity: 0.09, filter: "blur(2px) brightness(1.3)", pointerEvents: "none", zIndex: 0 }}
        draggable={false}
        loading="lazy"
        decoding="async"
      />

      <div style={{ position: "relative", zIndex: 1 }}>

        {/* HERO */}
        <header
          className="relative overflow-hidden"
          style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}
        >
          <div className="absolute top-0 left-0 right-0" style={{ height: "1px", background: `linear-gradient(90deg, transparent 0%, ${CYAN}50 50%, transparent 100%)` }} />

          <div
            className="relative z-10 px-6 text-center"
          >
            <h1 style={{ fontFamily: "'Cinzel', serif", fontSize: "clamp(2.8rem, 8vw, 6.5rem)", fontWeight: 400, color: "#ffffff", letterSpacing: "0.12em", marginBottom: "1.2rem", textShadow: "0 0 40px rgba(255,255,255,0.15), 0 0 80px rgba(200,210,255,0.08)" }}>
              MAJOR EVENTS
            </h1>
            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(0.9rem, 2vw, 1.25rem)", fontWeight: 400, letterSpacing: "0.45em", textTransform: "uppercase", color: "rgba(255,255,255,0.55)", marginTop: "1rem" }}>
              BEYOND THE MAIN STAGE
              <span style={{ display: "inline-block", margin: "0 1.2em", opacity: 0.4 }}>·</span>
              INFINITE GLORY
            </p>
          </div>

          <div style={{ position: "absolute", bottom: "2.5rem", left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.6rem", animation: "majorEventsBounce 2s ease-in-out infinite" }}>
            <div style={{ width: "1px", height: "36px", background: "linear-gradient(to bottom, rgba(255,255,255,0.4), transparent)" }} />
            <span style={{ fontFamily: "sans-serif", fontSize: "0.8rem", letterSpacing: "0.3em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)" }}>Scroll</span>
          </div>
        </header>

        {/* 6 EVENTS */}
        {events.map((event) => (
          <EventSection key={event.number} event={event} />
        ))}

        {/* MARQUEE */}
        <div style={{ width: "100%", overflow: "hidden", padding: "1.5rem 0", borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
          <div style={{ display: "flex", width: "max-content", animation: "majorEventsMarqueeScroll 22s linear infinite" }}>
            {[0, 1].map((copy) => (
              <div key={copy} style={{ display: "flex", alignItems: "center" }} aria-hidden={copy === 1}>
                {["Requiem", "Destival", "Cosmos", "Photography", "Behas", "Nukkad Natak"].map((word) => (
                  <span key={word} style={{ fontFamily: "'Cinzel', serif", fontSize: "clamp(1.1rem, 2vw, 1.4rem)", letterSpacing: "0.25em", textTransform: "uppercase", color: "rgba(200,220,240,0.5)", padding: "0 2rem", whiteSpace: "nowrap" }}>
                    <span style={{ marginRight: "1.5rem", fontSize: "0.5em", color: `${CYAN}60` }}>✦</span>
                    {word}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* JOIN IN */}
        <section
          className="relative flex flex-col items-center justify-center text-center"
          style={{ minHeight: "60vh", padding: "6rem 2rem" }}
        >
          <motion.p initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}
            style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "0.95rem", fontWeight: 600, letterSpacing: "0.5em", textTransform: "uppercase", color: CYAN, marginBottom: "1rem" }}>
            GET INVOLVED
          </motion.p>

          <motion.h2 initial={{ opacity: 0, y: 25 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.15 }}
            style={{ fontFamily: "'Cinzel', serif", fontSize: "clamp(3rem, 8vw, 5.5rem)", fontWeight: 400, color: "#fff", letterSpacing: "0.1em", marginBottom: "1.5rem" }}>
            Compete Now
          </motion.h2>

          <div style={{ width: "40px", height: "3px", background: CYAN, borderRadius: "2px", boxShadow: `0 0 10px ${CYAN}66`, marginBottom: "1.5rem" }} />

          <motion.p initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.3 }}
            style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(1.15rem, 2vw, 1.5rem)", fontStyle: "italic", color: "rgba(180,200,230,0.7)", marginBottom: "2rem", letterSpacing: "0.04em" }}>
            Register now and claim your place on the stage
          </motion.p>

          <motion.p initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.45 }}
            style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(1.1rem, 1.8vw, 1.35rem)", color: "rgba(255,255,255,0.6)", lineHeight: 1.85, maxWidth: "600px" }}>
            Registrations for all major events are now open. Secure your spot before slots fill up and bring your A-game to Oneiros 2026!
          </motion.p>

          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.6 }}
            className="flex items-center gap-3" style={{ marginTop: "2.5rem" }}>
            {[CYAN, PINK, CYAN].map((color, i) => (
              <div key={i} style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: color, boxShadow: `0 0 8px ${color}aa` }} />
            ))}
          </motion.div>
        </section>

        {/* STATS */}
        <section
          className="relative flex flex-col items-center justify-center py-24"
          style={{ borderTop: `1px solid rgba(255,255,255,0.06)` }}
        >
          <motion.p initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}
            style={{ fontFamily: "'Cinzel', serif", fontSize: "0.85rem", letterSpacing: "0.5em", color: CYAN, marginBottom: "3rem" }}>
            BY THE NUMBERS
          </motion.p>

          <div className="flex flex-wrap justify-center gap-0" style={{ width: "100%", maxWidth: "900px", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", backdropFilter: "blur(12px)", background: "rgba(255,255,255,0.03)", overflow: "hidden" }}>
            {[
              { value: "6", label: "Major Events" },
              { value: "₹1.65L+", label: "Total Prize Pool" },
              { value: "3", label: "Days of Glory" },
              { value: "10K+", label: "Expected Footfall" },
            ].map((stat, i) => (
              <motion.div key={stat.label} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, delay: i * 0.15 }}
                style={{ flex: "1 1 200px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2.5rem 1rem", borderRight: i < 3 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
                <span style={{ fontFamily: "'Cinzel', serif", fontSize: "clamp(1.8rem, 3vw, 2.5rem)", fontWeight: 500, color: "#fff", letterSpacing: "0.04em", textShadow: `0 0 20px ${CYAN}60` }}>
                  {stat.value}
                </span>
                <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.1rem", fontStyle: "italic", color: "rgba(180,200,230,0.6)", marginTop: "0.5rem" }}>
                  {stat.label}
                </span>
              </motion.div>
            ))}
          </div>
        </section>

        {/* FOOTER */}
        <footer className="flex flex-col items-center justify-center py-16">
          <div style={{ width: "100%", height: "1px", background: `linear-gradient(90deg, transparent 0%, ${CYAN}40 50%, transparent 100%)`, marginBottom: "2.5rem" }} />
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: "0.65rem", letterSpacing: "0.5em", color: `${CYAN}60` }}>
            ONEIROS 2026 · THE CULTURAL FESTIVAL
          </p>
        </footer>

      </div>
    </div>
  );
}
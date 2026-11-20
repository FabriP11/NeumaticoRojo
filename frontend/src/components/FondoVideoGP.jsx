import { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "motion/react";

// Fondo decorativo de TODO el banner, no solo de la columna izquierda.
export default function FondoVideoGP({ esSemanaCarrera }) {
  const videoRef = useRef(null);
  const reducirMovimiento = useReducedMotion();

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const movil = window.matchMedia("(max-width: 639px)");

    const actualizar = () => {
      if (reducirMovimiento || movil.matches || document.hidden) {
        video.pause();
      } else {
        video.play().catch(() => {});
      }
    };

    actualizar();
    movil.addEventListener("change", actualizar);
    document.addEventListener("visibilitychange", actualizar);

    return () => {
      movil.removeEventListener("change", actualizar);
      document.removeEventListener("visibilitychange", actualizar);
      video.pause();
    };
  }, [reducirMovimiento]);

  return (
    <motion.div
      aria-hidden="true"
      initial={reducirMovimiento ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
    >
      <motion.video
        ref={videoRef}
        muted
        loop
        playsInline
        preload="metadata"
        initial={false}
        animate={{ opacity: esSemanaCarrera ? 0.85 : 0.45 }}
        transition={{ duration: reducirMovimiento ? 0 : 0.55 }}
        className="absolute inset-0 hidden h-full w-full object-cover sm:block"
      >
        <source src="/videos/raceweek.mp4" type="video/mp4" />
      </motion.video>

      {/* Filtro para que el texto y los horarios siempre sean legibles. */}
      <div className="absolute inset-0 bg-black/35" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,10,18,0.65)_0%,rgba(8,10,18,0.35)_55%,rgba(8,10,18,0.48)_100%)]" />
      <motion.div
        className="absolute inset-0 bg-[radial-gradient(circle_at_20%_25%,rgba(225,6,0,0.15),transparent_58%)]"
        initial={false}
        animate={{ opacity: esSemanaCarrera ? 1 : 0.45 }}
        transition={{ duration: reducirMovimiento ? 0 : 0.65 }}
      />
    </motion.div>
  );
}

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

// Fondo decorativo: se evita solicitar el vídeo en móvil, tablet y ahorro de datos.
export default function FondoVideoGP({ esSemanaCarrera }) {
  const videoRef = useRef(null);
  const reducirMovimiento = useReducedMotion();
  const [mostrarVideo, setMostrarVideo] = useState(false);

  useEffect(() => {
    const escritorio = window.matchMedia("(min-width: 1024px)");
    const ahorroDatos = window.matchMedia("(prefers-reduced-data: reduce)");
    function actualizar() {
      setMostrarVideo(
        escritorio.matches &&
        !ahorroDatos.matches &&
        !navigator.connection?.saveData &&
        !document.hidden &&
        !reducirMovimiento,
      );
    }
    actualizar();
    escritorio.addEventListener("change", actualizar);
    ahorroDatos.addEventListener("change", actualizar);
    navigator.connection?.addEventListener?.("change", actualizar);
    document.addEventListener("visibilitychange", actualizar);
    return () => {
      escritorio.removeEventListener("change", actualizar);
      ahorroDatos.removeEventListener("change", actualizar);
      navigator.connection?.removeEventListener?.("change", actualizar);
      document.removeEventListener("visibilitychange", actualizar);
    };
  }, [reducirMovimiento]);

  useEffect(() => {
    if (!mostrarVideo || !videoRef.current) return;
    const video = videoRef.current;
    video.play().catch(() => {}); // Rechazo normal si el navegador bloquea autoplay.
    return () => video.pause();
  }, [mostrarVideo]);

  return (
    <motion.div
      aria-hidden="true"
      initial={reducirMovimiento ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
    >
      {mostrarVideo && (
        <motion.video
          ref={videoRef}
          muted
          loop
          playsInline
          autoPlay
          preload="none"
          initial={false}
          animate={{ opacity: esSemanaCarrera ? 0.85 : 0.45 }}
          transition={{ duration: reducirMovimiento ? 0 : 0.55 }}
          className="absolute inset-0 h-full w-full object-cover"
        >
          <source src="/videos/raceweek.mp4" type="video/mp4" />
        </motion.video>
      )}

      {/* Mantener filtros y legibilidad con o sin video. */}
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

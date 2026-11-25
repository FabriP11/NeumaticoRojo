import { useEffect } from "react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";

const formato = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 });

// Anima solamente valores numéricos; "—" y otros valores se muestran sin cambios.
// El valor anterior se conserva durante las actualizaciones periódicas.
export default function NumeroAnimado({ valor, sufijo = "", clase = "" }) {
  const reducirMovimiento = useReducedMotion();
  const valido = valor !== null && valor !== undefined &&
    String(valor).trim() !== "" && Number.isFinite(Number(valor));
  const destino = valido ? Number(valor) : 0;
  const progreso = useMotionValue(reducirMovimiento ? destino : 0);
  const texto = useTransform(progreso, (numero) => `${formato.format(numero)}${sufijo}`);

  useEffect(() => {
    if (!valido || reducirMovimiento) {
      progreso.set(destino);
      return;
    }
    const controles = animate(progreso, destino, {
      duration: 0.8,
      ease: "easeOut",
    });
    return () => controles.stop();
  }, [destino, valido, reducirMovimiento, progreso]);

  return (
    <motion.span className={clase}>
      {valido ? texto : (valor ?? "—")}
    </motion.span>
  );
}

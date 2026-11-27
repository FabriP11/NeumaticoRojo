import { useEffect, useState } from "react";

// Imagen decorativa para las tarjetas del Inicio.
// Permite probar extensiones alternativas si el archivo no existe.
export default function FondoTarjetaInicio({
  src,
  alternativas = [],
  adaptarTema = false,
}) {
  const [indice, setIndice] = useState(0);

  useEffect(() => {
    setIndice(0);
  }, [src]);

  const rutas = [src, ...alternativas].filter(Boolean);
  const actual = rutas[indice];

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
    >
      {actual && (
        <img
          key={actual}
          src={actual}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setIndice((anterior) => anterior + 1)}
          className="h-full w-full scale-105 object-cover object-center blur-[0.8px]"
        />
      )}
      {/* En las tablas del Inicio, el modo claro utiliza el mismo velo blanco
          del Calendario. Otros usos conservan sus fondos oscuros originales. */}
      <div
        className={
          adaptarTema
            ? "absolute inset-0 bg-white/75 dark:bg-[linear-gradient(105deg,rgba(9,11,20,0.90)_0%,rgba(9,11,20,0.72)_48%,rgba(9,11,20,0.72)_100%)]"
            : "absolute inset-0 bg-[linear-gradient(105deg,rgba(9,11,20,0.90)_0%,rgba(9,11,20,0.72)_48%,rgba(9,11,20,0.72)_100%)]"
        }
      />
      <div
        className={
          adaptarTema
            ? "absolute inset-0 bg-transparent dark:bg-[linear-gradient(0deg,rgba(9,11,20,0.47),transparent_65%)]"
            : "absolute inset-0 bg-[linear-gradient(0deg,rgba(9,11,20,0.47),transparent_65%)]"
        }
      />
    </div>
  );
}

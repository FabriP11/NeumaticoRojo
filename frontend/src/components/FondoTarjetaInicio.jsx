import { useEffect, useState } from "react";

// Imagen decorativa para las tarjetas del Inicio.
// Permite probar extensiones alternativas si el archivo no existe.
export default function FondoTarjetaInicio({
  src,
  alternativas = [],
  adaptarTema = false,
  destacarFoto = false,
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
          className={
            destacarFoto
              ? "h-full w-full scale-105 object-cover object-center brightness-110 saturate-110 blur-[1.2px] dark:brightness-100 dark:saturate-100 dark:blur-[0.8px]"
              : "h-full w-full scale-105 object-cover object-center blur-[0.8px]"
          }
        />
      )}
      {/* Las tablas mantienen su velo blanco. En favoritos, el degradado
          se aclara hacia el lado de la foto para destacar al piloto o auto.
          En modo oscuro no cambian los filtros ni los fondos originales. */}
      <div
        className={
          destacarFoto
            ? "absolute inset-0 bg-[linear-gradient(105deg,rgba(255,255,255,0.80)_0%,rgba(255,255,255,0.55)_46%,rgba(255,255,255,0.18)_100%)] dark:bg-[linear-gradient(105deg,rgba(9,11,20,0.90)_0%,rgba(9,11,20,0.72)_48%,rgba(9,11,20,0.72)_100%)]"
            : adaptarTema
              ? "absolute inset-0 bg-white/75 dark:bg-[linear-gradient(105deg,rgba(9,11,20,0.90)_0%,rgba(9,11,20,0.72)_48%,rgba(9,11,20,0.72)_100%)]"
              : "absolute inset-0 bg-[linear-gradient(105deg,rgba(9,11,20,0.90)_0%,rgba(9,11,20,0.72)_48%,rgba(9,11,20,0.72)_100%)]"
        }
      />
      <div
        className={
          adaptarTema || destacarFoto
            ? "absolute inset-0 bg-transparent dark:bg-[linear-gradient(0deg,rgba(9,11,20,0.47),transparent_65%)]"
            : "absolute inset-0 bg-[linear-gradient(0deg,rgba(9,11,20,0.47),transparent_65%)]"
        }
      />
    </div>
  );
}

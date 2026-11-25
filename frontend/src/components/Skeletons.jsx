// Marcadores de carga. Solo aparecen durante la primera consulta, no en errores.
// Respetan la preferencia del sistema de reducir movimiento.
function Bloque({ clase = "", oscuro = false }) {
  return (
    <div
      aria-hidden="true"
      className={`${oscuro ? "bg-white/10" : "bg-slate-200/85 dark:bg-white/10"} animate-pulse rounded-lg motion-reduce:animate-none ${clase}`}
    />
  );
}

export function SkeletonRaceWeek() {
  return (
    <section role="status" aria-label="Cargando calendario de Fórmula 1" className="rounded-2xl bg-[#0c0e16] p-4 text-white sm:p-5">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.7fr)]">
        <div className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
          <Bloque oscuro clase="h-8 w-32 rounded-full" />
          <Bloque oscuro clase="h-9 w-4/5" />
          <Bloque oscuro clase="h-5 w-3/4" />
          <Bloque oscuro clase="h-5 w-2/3" />
          <Bloque oscuro clase="mt-4 h-28 w-full" />
        </div>
        <div>
          <Bloque oscuro clase="mb-4 h-7 w-56 max-w-full" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, indice) => (
              <div key={indice} className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
                <Bloque oscuro clase="h-6 w-12" />
                <Bloque oscuro clase="h-5 w-4/5" />
                <Bloque oscuro clase="h-4 w-2/3" />
                <Bloque oscuro clase="h-4 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </div>
      <span className="sr-only">Cargando calendario...</span>
    </section>
  );
}

export function SkeletonTarjetas({ cantidad = 6, columnas = "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3", oscuro = false, imagen = true, etiqueta = "Cargando datos" }) {
  return (
    <div role="status" aria-label={etiqueta} className={`grid gap-4 ${columnas}`}>
      {Array.from({ length: cantidad }, (_, indice) => (
        <div key={indice} aria-hidden="true" className={`overflow-hidden rounded-2xl border p-4 ${oscuro ? "border-white/10 bg-[#171923]" : "border-slate-200 bg-white dark:border-white/10 dark:bg-[#1c1e27]"}`}>
          {imagen && <Bloque oscuro={oscuro} clase="mb-4 h-28 w-full" />}
          <Bloque oscuro={oscuro} clase="h-5 w-3/4" />
          <Bloque oscuro={oscuro} clase="mt-3 h-4 w-1/2" />
          <div className="mt-5 flex gap-2">
            {[0, 1, 2].map((item) => <Bloque key={item} oscuro={oscuro} clase="h-12 flex-1" />)}
          </div>
        </div>
      ))}
      <span className="sr-only">{etiqueta}</span>
    </div>
  );
}

export function SkeletonFilas({ cantidad = 8, oscuro = false, etiqueta = "Cargando datos" }) {
  return (
    <div role="status" aria-label={etiqueta} className={`overflow-hidden rounded-2xl border p-4 ${oscuro ? "border-white/10 bg-[#1b1c25]" : "border-slate-200 bg-white dark:border-white/10 dark:bg-[#1c1e27]"}`}>
      <Bloque oscuro={oscuro} clase="mb-4 h-6 w-40 max-w-full" />
      <div className="space-y-3">
        {Array.from({ length: cantidad }, (_, indice) => (
          <div key={indice} aria-hidden="true" className={`flex items-center gap-4 border-t py-2 ${oscuro ? "border-white/10" : "border-slate-100 dark:border-white/10"}`}>
            <Bloque oscuro={oscuro} clase="h-9 w-9 shrink-0" />
            <div className="flex-1 space-y-2">
              <Bloque oscuro={oscuro} clase="h-4 w-3/4" />
              <Bloque oscuro={oscuro} clase="h-3 w-2/5" />
            </div>
            <Bloque oscuro={oscuro} clase="h-5 w-12 shrink-0" />
          </div>
        ))}
      </div>
      <span className="sr-only">{etiqueta}</span>
    </div>
  );
}

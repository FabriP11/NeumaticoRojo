import { Component } from "react";

// Captura errores de renderizado y de carga de componentes (React.lazy).
// No reemplaza las validaciones de peticiones HTTP.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hayError: false };
  }

  static getDerivedStateFromError() {
    return { hayError: true };
  }

  componentDidCatch(error, informacion) {
    // Datos de diagnóstico en la consola, no en la pantalla pública.
    console.error("Error al mostrar Neumático Rojo:", error, informacion.componentStack);
  }

  render() {
    if (this.state.hayError) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-[#111218] px-4 text-white">
          <div role="alert" className="w-full max-w-md rounded-2xl border border-white/10 bg-[#1b1c25] p-7 text-center shadow-xl">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#ff6660]">Neumático Rojo</p>
            <h1 className="font-racing text-2xl font-black uppercase italic">No pudimos mostrar esta página</h1>
            <p className="mt-3 text-sm leading-6 text-gray-300">
              Ocurrió un error inesperado. Probá recargar la página.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-6 min-h-11 rounded-xl bg-[#e10600] px-6 py-3 font-nav text-sm font-bold text-white hover:bg-[#b90500]"
            >
              Recargar página
            </button>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}

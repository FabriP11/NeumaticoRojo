import { Mail, Code2 } from "lucide-react";
import {
  FaGithub as Github,
  FaInstagram as Instagram,
  FaLinkedin as Linkedin,
} from "react-icons/fa";

const enlaces = [
  {
    nombre: "Instagram",
    url: "https://www.instagram.com/fabriponce/",
    Icono: Instagram,
  },
  {
    nombre: "LinkedIn",
    url: "https://www.linkedin.com/in/fabrip11/",
    Icono: Linkedin,
  },
  {
    nombre: "Correo",
    url: "mailto:fabricioponce2012@gmail.com",
    Icono: Mail,
  },
  {
    nombre: "GitHub",
    url: "https://github.com/FabriP11",
    Icono: Github,
  },
  {
    nombre: "Repositorio",
    url: "https://github.com/FabriP11/NeumaticoRojo",
    Icono: Code2,
  },
];

function Footer() {
  return (
    <footer className="mt-12 border-t border-[#dedfe5] bg-[#e9ebf0] text-[#15151d] dark:border-white/10 dark:bg-[#15151d] dark:text-white">
      {/* LÍNEA ROJA SUPERIOR */}
      <div className="h-1 w-full bg-[#e10600]" />

      <div className="mx-auto w-full max-w-[1500px] px-5 py-10 sm:px-8 lg:px-10">
        {/* IDENTIDAD Y DESCRIPCIÓN */}
        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-start">
          <div className="max-w-xl">
            <h2 className="font-racing text-2xl font-extrabold uppercase italic tracking-tight">
              NEUMATICO
              <span className="text-[#e10600]">ROJO</span>
            </h2>

            <p className="mt-3 text-sm leading-6 text-[#555965] dark:text-[#a5a8b4]">
              Proyecto personal desarrollado por Fabricio Ponce. Una plataforma
              dedicada a los resultados, estadísticas y actualidad de la Fórmula
              1.
            </p>

            <span className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#e10600]/30 bg-[#e10600]/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[#c50500] dark:text-[#ff5c56]">
              <span className="h-2 w-2 rounded-full bg-[#e10600]" />
              Proyecto en desarrollo
            </span>
          </div>

          {/* REDES Y CONTACTO */}
          <div className="md:text-right">
            <h3 className="mb-4 font-nav text-sm font-bold uppercase tracking-widest">
              Contacto y enlaces
            </h3>

            <div className="flex flex-wrap gap-3 md:justify-end">
              {enlaces.map(({ nombre, url, Icono }) => (
                <a
                  key={nombre}
                  href={url}
                  target={url.startsWith("mailto:") ? undefined : "_blank"}
                  rel={
                    url.startsWith("mailto:")
                      ? undefined
                      : "noopener noreferrer"
                  }
                  aria-label={nombre}
                  title={nombre}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#d5d8e0] bg-white text-[#41434e] transition-all duration-200 hover:-translate-y-1 hover:border-[#e10600] hover:bg-[#e10600] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e10600] dark:border-white/15 dark:bg-white/5 dark:text-[#d5d6dc] dark:hover:border-[#e10600] dark:hover:bg-[#e10600] dark:hover:text-white"
                >
                  <Icono className="h-5 w-5" aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* INFORMACIÓN INFERIOR */}
        <div className="mt-10 flex flex-col gap-3 border-t border-[#d3d6dd] pt-5 text-xs text-[#777b86] sm:flex-row sm:items-center sm:justify-between dark:border-white/10 dark:text-[#9295a0]">
          <p>
            © {new Date().getFullYear()} Neumático Rojo. Todos los derechos
            reservados.
          </p>

          <p>
            Proyecto independiente, no afiliado a Formula 1 ni a sus
            organizaciones oficiales.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;

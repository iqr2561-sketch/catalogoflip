import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';

const DEFAULT_LP = {
  brandName: 'CUCHILLOS GALUCHO',
  tagline: 'Argentina',
  heroTitle: 'Cuchillos Galucho',
  heroSubtitle: 'Calidad, precisión y artesanía. Hecho para durar.',
  heroCtas: [
    { label: 'Ver Catálogo 2025', href: '/catalog', primary: true },
    { label: 'Contacto Directo Whatsapp', href: '#contacto', primary: false },
  ],
  quienesSomos: {
    title: 'Quienes Somos',
    body:
      'Somos Cuchillos Galucho: diseño, calidad y un estándar profesional en cada pieza. Nuestra prioridad es que cada producto sea confiable y elegante.',
  },
  noticias: [],
  galeria: [],
  contacto: {
    ciudad: 'BsAs, Argentina',
    nombre: 'Dolores',
    telefono: '',
    whatsapp: '',
  },
};

function cx(...xs) {
  return xs.filter(Boolean).join(' ');
}

// Landing “solo video”: dejamos la página como hero full-screen con video de fondo
// y un entramado animado muy sutil encima (sin textos).

export default function LandingPage() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/catalog-config', { cache: 'no-store' });
        const data = await res.json();
        setConfig(data);
      } catch (_) {
        setConfig(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const landing = useMemo(() => {
    const lp = config?.landingPage || {};
    return {
      ...DEFAULT_LP,
      ...lp,
      quienesSomos: { ...DEFAULT_LP.quienesSomos, ...(lp.quienesSomos || {}) },
      contacto: { ...DEFAULT_LP.contacto, ...(lp.contacto || {}) },
      noticias: Array.isArray(lp.noticias) ? lp.noticias : DEFAULT_LP.noticias,
      galeria: Array.isArray(lp.galeria) ? lp.galeria : DEFAULT_LP.galeria,
    };
  }, [config]);

  const videoUrl = config?.landingPage?.video?.source ? '/api/landing-video' : null;

  return (
    <>
      <Head>
        <title>{landing.brandName} – Landing</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta
          name="description"
          content="Cuchillos Galucho: carta de presentación moderna, profesional y enfocada en mobile."
        />
      </Head>

      <div className="lp-root min-h-screen text-white">
        {/* Video de fondo global (tipo template) */}
        <div className="lp-bg">
          {videoUrl ? (
            <video
              className="lp-bgVideo"
              src={videoUrl}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
            />
          ) : (
            <div className="lp-bgFallback">
              {loading ? 'Cargando…' : 'Video de portada no cargado (sube uno desde Panel → LandingPage)'}
            </div>
          )}
          {/* Overlay sin “bandas”: solo gradientes suaves */}
          <div className="lp-bgOverlay" />

          {/* Entramado animado por encima (sutil) */}
          <div className="lp-mesh" aria-hidden="true" />
        </div>

        {/* Sin texto: solo video + overlay */}
      </div>

      <style jsx global>{`
        html { scroll-behavior: smooth; }
        .lp-root {
          position: relative;
          background: #0b0a1a;
          overflow-x: hidden;
          font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji";
        }

        .lp-bg {
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
        }
        .lp-bgVideo {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          filter: saturate(1.1) contrast(1.05);
          transform: scale(1.02);
        }
        .lp-bgFallback {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          text-align: center;
          color: rgba(255,255,255,0.8);
          background: radial-gradient(1200px 600px at 20% 10%, rgba(133, 75, 255, 0.25), transparent 55%),
                      radial-gradient(800px 500px at 80% 40%, rgba(0, 255, 200, 0.12), transparent 55%),
                      linear-gradient(180deg, #0b0a1a, #0b0a1a);
        }
        .lp-bgOverlay {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(1200px 800px at 15% 15%, rgba(168, 85, 247, 0.26), transparent 58%),
            radial-gradient(900px 650px at 80% 35%, rgba(59, 130, 246, 0.18), transparent 60%),
            radial-gradient(900px 700px at 50% 85%, rgba(34, 197, 94, 0.07), transparent 62%),
            linear-gradient(180deg, rgba(11,10,26,0.30), rgba(11,10,26,0.55) 55%, rgba(11,10,26,0.82));
        }

        /* Entramado animado (suave) */
        .lp-mesh {
          position: absolute;
          inset: -20%;
          background:
            linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px),
            radial-gradient(circle at 30% 20%, rgba(168,85,247,0.18), transparent 55%),
            radial-gradient(circle at 70% 60%, rgba(59,130,246,0.12), transparent 55%);
          background-size: 52px 52px, 52px 52px, auto, auto;
          background-position: 0 0, 0 0, 0 0, 0 0;
          opacity: 0.22;
          mix-blend-mode: overlay;
          transform: translate3d(0,0,0);
          animation: lpMeshMove 14s ease-in-out infinite;
        }

        @keyframes lpMeshMove {
          0% {
            transform: translate3d(-1.5%, -1.2%, 0);
            filter: hue-rotate(0deg);
          }
          50% {
            transform: translate3d(1.2%, 1.6%, 0);
            filter: hue-rotate(18deg);
          }
          100% {
            transform: translate3d(-1.5%, -1.2%, 0);
            filter: hue-rotate(0deg);
          }
        }

        /* Pantalla completa */
        .lp-root, .lp-bg, .lp-bgVideo, .lp-bgFallback, .lp-bgOverlay, .lp-mesh { height: 100vh; }

        @media (prefers-reduced-motion: reduce) {
          html { scroll-behavior: auto; }
          .lp-mesh { animation: none; }
        }
      `}</style>
    </>
  );
}



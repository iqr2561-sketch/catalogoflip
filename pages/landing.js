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
  const waHref = useMemo(() => {
    const raw = landing?.contacto?.whatsapp || '';
    const digits = String(raw).replace(/[^\d]/g, '');
    return digits ? `https://wa.me/${digits}` : null;
  }, [landing?.contacto?.whatsapp]);

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

          {/* “Masa” suave tipo blur por encima del video (glass global) */}
          <div className="lp-frost" aria-hidden="true" />
        </div>

        {/* Contenido encima del video */}
        <div className="lp-content">
          <header className="lp-header">
            <div className="lp-brand">
              <div className="lp-mark" aria-hidden="true" />
              <div className="lp-brandText">
                <div className="lp-brandName">{landing.brandName}</div>
                <div className="lp-tagline">{landing.tagline}</div>
              </div>
            </div>
            <nav className="lp-nav" aria-label="Navegación">
              <a className="lp-navLink" href="#quienes">Quienes</a>
              <a className="lp-navLink" href="#contacto">Contacto</a>
              <a className="lp-navLink" href="/catalog">Catálogo</a>
            </nav>
          </header>

          <main className="lp-main">
            <section className="lp-hero" aria-label="Hero">
              <div className="lp-glass lp-heroCard">
                <h1 className="lp-heroTitle">{landing.heroTitle}</h1>
                <p className="lp-heroSubtitle">{landing.heroSubtitle}</p>

                <div className="lp-ctaRow" role="group" aria-label="Acciones principales">
                  {(landing.heroCtas || []).slice(0, 2).map((cta, idx) => {
                    const isPrimary = !!cta?.primary;
                    const href =
                      cta?.href === '#contacto' && waHref ? waHref : (cta?.href || '#');
                    const external = href.startsWith('http');
                    return (
                      <a
                        key={`${cta?.label || 'cta'}-${idx}`}
                        className={cx('lp-btn', isPrimary ? 'lp-btnPrimary' : 'lp-btnGhost')}
                        href={href}
                        target={external ? '_blank' : undefined}
                        rel={external ? 'noreferrer' : undefined}
                      >
                        {cta?.label || (isPrimary ? 'Ver catálogo' : 'Contactar')}
                      </a>
                    );
                  })}
                </div>

                <div className="lp-hint">
                  {videoUrl ? 'Video de fondo activo' : 'Sube un video para activar el fondo'}
                </div>
              </div>
            </section>

            <section id="quienes" className="lp-section" aria-label="Quienes somos">
              <div className="lp-glass lp-sectionCard">
                <h2 className="lp-h2">{landing?.quienesSomos?.title || 'Quienes Somos'}</h2>
                <p className="lp-p">{landing?.quienesSomos?.body || ''}</p>
              </div>
            </section>

            <section id="contacto" className="lp-section" aria-label="Contacto">
              <div className="lp-glass lp-sectionCard">
                <h2 className="lp-h2">Contacto</h2>
                <div className="lp-contactGrid">
                  <div className="lp-contactItem">
                    <div className="lp-label">Nombre</div>
                    <div className="lp-value">{landing?.contacto?.nombre || '—'}</div>
                  </div>
                  <div className="lp-contactItem">
                    <div className="lp-label">Ciudad</div>
                    <div className="lp-value">{landing?.contacto?.ciudad || '—'}</div>
                  </div>
                  <div className="lp-contactItem">
                    <div className="lp-label">Teléfono</div>
                    <div className="lp-value">{landing?.contacto?.telefono || '—'}</div>
                  </div>
                  <div className="lp-contactItem">
                    <div className="lp-label">WhatsApp</div>
                    <div className="lp-value">
                      {waHref ? (
                        <a className="lp-inlineLink" href={waHref} target="_blank" rel="noreferrer">
                          Abrir chat
                        </a>
                      ) : (
                        '—'
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <footer className="lp-footer">
              <div className="lp-footerInner lp-glass">
                <span>© {new Date().getFullYear()} {landing.brandName}</span>
                <a className="lp-inlineLink" href="/catalog">Ir al catálogo</a>
              </div>
            </footer>
          </main>
        </div>
      </div>

      <style jsx global>{`
        html { scroll-behavior: smooth; }
        .lp-root {
          position: relative;
          background: #0b0a1a;
          overflow-x: hidden;
          font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji";
          min-height: 100vh;
        }

        .lp-bg {
          position: fixed;
          inset: 0;
          /* Fondo detrás del contenido (esquema seguro cross-browser) */
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

        /* “Masa” blur (frosted glass) sobre el video: se ve el video, pero suavizado */
        .lp-frost {
          position: absolute;
          inset: 0;
          /* Fondo semitransparente + blur del backdrop */
          background:
            radial-gradient(900px 520px at 18% 25%, rgba(255,255,255,0.11), transparent 60%),
            radial-gradient(720px 520px at 72% 55%, rgba(255,255,255,0.08), transparent 62%),
            linear-gradient(180deg, rgba(0,0,0,0.06), rgba(0,0,0,0.22));
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          opacity: 0.9;
        }

        /* Contenido encima (habilita clicks) */
        .lp-content {
          position: relative;
          z-index: 2;
          min-height: 100vh;
          padding: 18px 16px 48px;
          pointer-events: auto;
        }
        .lp-header {
          max-width: 1040px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .lp-brand {
          display: flex;
          align-items: center;
          gap: 10px;
          user-select: none;
        }
        .lp-mark {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.35), rgba(255,255,255,0.08) 40%, rgba(0,0,0,0.08) 100%);
          border: 1px solid rgba(255,255,255,0.18);
          box-shadow: 0 10px 30px rgba(0,0,0,0.22);
        }
        .lp-brandName {
          font-weight: 800;
          letter-spacing: 0.2px;
          line-height: 1.05;
        }
        .lp-tagline {
          font-size: 12px;
          opacity: 0.78;
          margin-top: 2px;
        }
        .lp-nav {
          display: none;
          gap: 14px;
          align-items: center;
        }
        .lp-navLink {
          color: rgba(255,255,255,0.86);
          text-decoration: none;
          font-size: 13px;
          padding: 8px 10px;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.10);
          background: rgba(0,0,0,0.10);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          transition: transform 120ms ease, background 120ms ease, border-color 120ms ease;
        }
        .lp-navLink:hover {
          transform: translateY(-1px);
          background: rgba(0,0,0,0.16);
          border-color: rgba(255,255,255,0.18);
        }

        .lp-main { max-width: 1040px; margin: 0 auto; }
        .lp-hero { padding: 28px 0 18px; }

        /* Glass/blur suave sobre el video */
        .lp-glass {
          background: rgba(8, 10, 24, 0.30);
          border: 1px solid rgba(255,255,255,0.14);
          box-shadow: 0 20px 70px rgba(0,0,0,0.35);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
        }
        .lp-heroCard {
          border-radius: 22px;
          padding: 22px 18px;
        }
        .lp-heroTitle {
          font-size: 34px;
          line-height: 1.05;
          letter-spacing: -0.6px;
          font-weight: 900;
        }
        .lp-heroSubtitle {
          margin-top: 10px;
          color: rgba(255,255,255,0.86);
          font-size: 15px;
          line-height: 1.55;
          max-width: 60ch;
        }
        .lp-ctaRow {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 16px;
        }
        .lp-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 11px 14px;
          border-radius: 14px;
          text-decoration: none;
          font-weight: 700;
          font-size: 14px;
          border: 1px solid transparent;
          transition: transform 120ms ease, box-shadow 120ms ease, background 120ms ease, border-color 120ms ease;
        }
        .lp-btn:hover { transform: translateY(-1px); }
        .lp-btnPrimary {
          background: linear-gradient(135deg, rgba(168,85,247,0.92), rgba(59,130,246,0.92));
          box-shadow: 0 16px 44px rgba(88, 101, 255, 0.25);
          color: white;
        }
        .lp-btnGhost {
          background: rgba(0,0,0,0.18);
          border-color: rgba(255,255,255,0.16);
          color: rgba(255,255,255,0.92);
        }
        .lp-hint {
          margin-top: 14px;
          font-size: 12px;
          opacity: 0.7;
        }

        .lp-section { padding: 12px 0; }
        .lp-sectionCard {
          border-radius: 18px;
          padding: 18px;
        }
        .lp-h2 {
          font-size: 18px;
          font-weight: 850;
          letter-spacing: -0.2px;
        }
        .lp-p {
          margin-top: 10px;
          color: rgba(255,255,255,0.84);
          line-height: 1.65;
          font-size: 14px;
        }
        .lp-contactGrid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
          margin-top: 12px;
        }
        .lp-contactItem {
          padding: 12px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,0.10);
          background: rgba(0,0,0,0.12);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }
        .lp-label { font-size: 12px; opacity: 0.72; }
        .lp-value { margin-top: 2px; font-size: 14px; font-weight: 650; }
        .lp-inlineLink {
          color: rgba(255,255,255,0.92);
          text-decoration: underline;
          text-underline-offset: 3px;
        }
        .lp-footer { padding-top: 14px; }
        .lp-footerInner {
          border-radius: 16px;
          padding: 14px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          font-size: 13px;
          color: rgba(255,255,255,0.86);
        }

        /* Responsive */
        @media (min-width: 860px) {
          .lp-nav { display: flex; }
          .lp-hero { padding: 56px 0 26px; }
          .lp-heroTitle { font-size: 52px; }
          .lp-heroSubtitle { font-size: 16px; }
          .lp-contactGrid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .lp-heroCard { padding: 28px 24px; }
        }

        /* El fondo sigue full-screen */
        .lp-bg, .lp-bgVideo, .lp-bgFallback, .lp-bgOverlay, .lp-frost { height: 100vh; }

        @media (prefers-reduced-motion: reduce) {
          html { scroll-behavior: auto; }
          /* sin animaciones */
        }
      `}</style>
    </>
  );
}



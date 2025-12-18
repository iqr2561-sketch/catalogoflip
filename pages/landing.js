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

      <div className="lp-root">
        {/* Navbar estilo template (violeta + ondas) */}
        <header className="lp-topbar" role="banner">
          <div className="lp-topbarInner">
            <div className="lp-logo" aria-label={landing.brandName}>
              <span className="lp-logoMark" aria-hidden="true" />
              <span className="lp-logoText">{landing.brandName}</span>
            </div>
            <nav className="lp-menu" aria-label="Navegación">
              <a className="lp-menuLink" href="#home">Home</a>
              <a className="lp-menuLink" href="#quienes">Quienes</a>
              <a className="lp-menuLink" href="#contacto">Contacto</a>
              <a className="lp-menuLink" href="/catalog">Catálogo</a>
            </nav>
          </div>
          <div className="lp-topbarWave" aria-hidden="true">
            <svg viewBox="0 0 1440 130" preserveAspectRatio="none">
              <path
                d="M0,32 C120,60 240,92 360,92 C520,92 560,38 720,38 C900,38 940,100 1080,100 C1240,100 1320,62 1440,40 L1440,0 L0,0 Z"
                fill="rgba(255,255,255,0.07)"
              />
              <path
                d="M0,72 C140,110 260,124 380,124 C560,124 600,70 740,70 C940,70 980,128 1120,128 C1260,128 1340,88 1440,66 L1440,130 L0,130 Z"
                fill="rgba(0,0,0,0.18)"
              />
            </svg>
          </div>
        </header>

        {/* HERO: video de fondo sin texto encima */}
        <section id="home" className="lp-heroVideo" aria-label="Video de portada">
          {videoUrl ? (
            <video
              className="lp-heroVideoEl"
              src={videoUrl}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
            />
          ) : (
            <div className="lp-heroFallback">
              {loading ? 'Cargando…' : 'Video no cargado (sube uno desde Panel → LandingPage)'}
            </div>
          )}
          <div className="lp-heroOverlay" aria-hidden="true" />
          <div className="lp-heroWave" aria-hidden="true">
            <svg viewBox="0 0 1440 180" preserveAspectRatio="none">
              <path
                d="M0,120 C180,170 360,190 540,170 C720,150 840,100 1020,100 C1200,100 1320,140 1440,168 L1440,180 L0,180 Z"
                fill="#ffffff"
              />
            </svg>
          </div>
        </section>

        <main className="lp-main">
          {/* Bloque principal estilo template (texto grande + CTA) */}
          <section className="lp-intro" aria-label="Presentación">
            <div className="lp-introGrid">
              <div>
                <div className="lp-pill">{landing.tagline || 'Argentina'}</div>
                <h1 className="lp-title">{landing.heroTitle}</h1>
                <p className="lp-subtitle">{landing.heroSubtitle}</p>

                <div className="lp-ctaRow" role="group" aria-label="Acciones principales">
                  {(landing.heroCtas || []).slice(0, 2).map((cta, idx) => {
                    const isPrimary = !!cta?.primary;
                    const href = cta?.href === '#contacto' && waHref ? waHref : (cta?.href || '#');
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
              </div>

              <aside className="lp-featureCard" aria-label="Destacado">
                <div className="lp-featureBadge">CATALOGO 2025</div>
                <div className="lp-featureTitle">Calidad que se nota</div>
                <div className="lp-featureBody">
                  {landing?.quienesSomos?.body ||
                    'Diseño, precisión y artesanía. Hecho para durar.'}
                </div>
              </aside>
            </div>
          </section>

          {/* Quienes */}
          <section id="quienes" className="lp-section" aria-label="Quienes somos">
            <div className="lp-sectionInner">
              <h2 className="lp-h2">{landing?.quienesSomos?.title || 'Quienes Somos'}</h2>
              <p className="lp-p">{landing?.quienesSomos?.body || ''}</p>
            </div>
          </section>

          {/* Contacto */}
          <section id="contacto" className="lp-section lp-sectionAlt" aria-label="Contacto">
            <div className="lp-sectionInner">
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
            <div className="lp-footerInner">
              <span>© {new Date().getFullYear()} {landing.brandName}</span>
              <a className="lp-inlineLink" href="/catalog">Ir al catálogo</a>
            </div>
          </footer>
        </main>
      </div>

      <style jsx global>{`
        html { scroll-behavior: smooth; }
        .lp-root {
          position: relative;
          background: #ffffff;
          overflow-x: hidden;
          font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji";
          min-height: 100vh;
          color: #1a1630;
        }

        /* TOP BAR (template violeta) */
        .lp-topbar {
          position: sticky;
          top: 0;
          z-index: 50;
          background: radial-gradient(1200px 520px at 15% 10%, rgba(255,255,255,0.10), transparent 60%),
                      radial-gradient(900px 520px at 85% 40%, rgba(0,0,0,0.18), transparent 60%),
                      linear-gradient(90deg, #2a175a, #3a1f73 45%, #2a175a);
          color: #fff;
        }
        .lp-topbarInner {
          max-width: 1120px;
          margin: 0 auto;
          padding: 16px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .lp-topbarWave {
          height: 46px;
          overflow: hidden;
        }
        .lp-topbarWave svg { width: 100%; height: 100%; display: block; }

        .lp-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          user-select: none;
        }
        .lp-logoMark {
          width: 34px;
          height: 34px;
          border-radius: 999px;
          background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.35), rgba(255,255,255,0.10) 42%, rgba(0,0,0,0.10) 100%);
          border: 1px solid rgba(255,255,255,0.22);
          box-shadow: 0 10px 30px rgba(0,0,0,0.22);
        }
        .lp-logoText {
          font-weight: 900;
          letter-spacing: 0.2px;
          line-height: 1.05;
          font-size: 18px;
        }
        .lp-menu {
          display: none;
          gap: 18px;
          align-items: center;
        }
        .lp-menuLink {
          color: rgba(255,255,255,0.92);
          text-decoration: none;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.4px;
          text-transform: uppercase;
          opacity: 0.9;
          transition: opacity 120ms ease;
        }
        .lp-menuLink:hover { opacity: 1; }

        /* HERO VIDEO (sin texto) */
        .lp-heroVideo {
          position: relative;
          height: clamp(260px, 52vh, 520px);
          overflow: hidden;
          background: #0b0a1a;
        }
        .lp-heroVideoEl {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          filter: saturate(1.1) contrast(1.05);
          transform: scale(1.02);
        }
        .lp-heroFallback {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          text-align: center;
          color: rgba(255,255,255,0.85);
          background: radial-gradient(1200px 600px at 20% 10%, rgba(133, 75, 255, 0.25), transparent 55%),
                      radial-gradient(800px 500px at 80% 40%, rgba(0, 255, 200, 0.12), transparent 55%),
                      linear-gradient(180deg, #0b0a1a, #0b0a1a);
        }
        .lp-heroOverlay {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(1000px 500px at 18% 22%, rgba(255,255,255,0.10), transparent 62%),
            radial-gradient(900px 520px at 80% 55%, rgba(255,255,255,0.06), transparent 64%),
            linear-gradient(180deg, rgba(0,0,0,0.18), rgba(0,0,0,0.42));
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
        }
        .lp-heroWave {
          position: absolute;
          left: 0;
          right: 0;
          bottom: -1px;
          height: 120px;
        }
        .lp-heroWave svg { width: 100%; height: 100%; display: block; }

        .lp-main { max-width: 1120px; margin: 0 auto; padding: 0 16px 56px; }

        /* INTRO estilo template */
        .lp-intro { padding: 26px 0 10px; }
        .lp-introGrid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 18px;
          align-items: stretch;
        }
        .lp-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 999px;
          background: rgba(58,31,115,0.10);
          border: 1px solid rgba(58,31,115,0.18);
          color: #2a175a;
          font-weight: 800;
          font-size: 12px;
          letter-spacing: 0.4px;
          text-transform: uppercase;
        }
        .lp-title {
          margin-top: 14px;
          font-size: clamp(34px, 5.4vw, 64px);
          line-height: 1.02;
          letter-spacing: -1px;
          font-weight: 950;
          color: #24114f;
        }
        .lp-subtitle {
          margin-top: 14px;
          font-size: 16px;
          line-height: 1.7;
          color: rgba(35, 25, 72, 0.78);
          max-width: 62ch;
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
          background: linear-gradient(135deg, #8b5cf6, #f59e0b);
          box-shadow: 0 16px 44px rgba(58, 31, 115, 0.25);
          color: #fff;
        }
        .lp-btnGhost {
          background: rgba(42, 23, 90, 0.08);
          border-color: rgba(42, 23, 90, 0.18);
          color: #2a175a;
        }

        .lp-featureCard {
          border-radius: 26px;
          padding: 18px;
          color: #fff;
          background:
            radial-gradient(900px 400px at 20% 20%, rgba(255,255,255,0.12), transparent 60%),
            radial-gradient(700px 420px at 80% 80%, rgba(0,0,0,0.16), transparent 60%),
            linear-gradient(135deg, #2a175a, #4c1d95 50%, #2a175a);
          border: 1px solid rgba(255,255,255,0.16);
          box-shadow: 0 24px 70px rgba(18, 10, 48, 0.28);
        }
        .lp-featureBadge {
          display: inline-flex;
          padding: 8px 12px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.6px;
          text-transform: uppercase;
          background: rgba(255,255,255,0.12);
          border: 1px solid rgba(255,255,255,0.18);
        }
        .lp-featureTitle {
          margin-top: 12px;
          font-size: 22px;
          font-weight: 950;
          letter-spacing: -0.3px;
        }
        .lp-featureBody {
          margin-top: 10px;
          color: rgba(255,255,255,0.88);
          line-height: 1.7;
          font-size: 14px;
        }

        .lp-section { padding: 26px 0; }
        .lp-sectionAlt {
          background: radial-gradient(1200px 520px at 15% 10%, rgba(58,31,115,0.10), transparent 60%),
                      radial-gradient(900px 520px at 85% 60%, rgba(139,92,246,0.10), transparent 60%),
                      linear-gradient(180deg, rgba(58,31,115,0.04), rgba(58,31,115,0.02));
          border-radius: 28px;
          padding: 26px 16px;
        }
        .lp-sectionInner { max-width: 1120px; margin: 0 auto; }
        .lp-h2 {
          font-size: 18px;
          font-weight: 950;
          letter-spacing: -0.2px;
          color: #24114f;
        }
        .lp-p {
          margin-top: 10px;
          color: rgba(35, 25, 72, 0.78);
          line-height: 1.65;
          font-size: 14px;
          max-width: 80ch;
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
          border: 1px solid rgba(42, 23, 90, 0.14);
          background: rgba(255,255,255,0.70);
          box-shadow: 0 10px 30px rgba(18, 10, 48, 0.06);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }
        .lp-label { font-size: 12px; opacity: 0.72; }
        .lp-value { margin-top: 2px; font-size: 14px; font-weight: 650; }
        .lp-inlineLink {
          color: #2a175a;
          text-decoration: underline;
          text-underline-offset: 3px;
        }
        .lp-footer { padding-top: 14px; }
        .lp-footerInner {
          border-radius: 18px;
          padding: 16px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          font-size: 13px;
          color: rgba(255,255,255,0.90);
          background: linear-gradient(90deg, #2a175a, #3a1f73 45%, #2a175a);
          border: 1px solid rgba(255,255,255,0.14);
          box-shadow: 0 20px 60px rgba(18, 10, 48, 0.18);
        }

        /* Responsive */
        @media (min-width: 860px) {
          .lp-menu { display: flex; }
          .lp-intro { padding: 44px 0 16px; }
          .lp-introGrid { grid-template-columns: 1.2fr 0.8fr; gap: 22px; }
          .lp-contactGrid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .lp-featureCard { padding: 20px; }
        }

        @media (prefers-reduced-motion: reduce) {
          html { scroll-behavior: auto; }
          /* sin animaciones */
        }
      `}</style>
    </>
  );
}



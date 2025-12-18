import { useEffect, useMemo, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';

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

function Wave({ flip = false }) {
  return (
    <svg
      className={cx('w-full block', flip ? 'rotate-180' : '')}
      viewBox="0 0 1440 120"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d="M0,64 C240,120 480,0 720,56 C960,112 1200,24 1440,72 L1440,120 L0,120 Z"
        fill="currentColor"
      />
    </svg>
  );
}

function useRevealOnScroll() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setVisible(true);
            obs.disconnect();
            break;
          }
        }
      },
      { root: null, threshold: 0.12 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return { ref, visible };
}

export default function LandingPage() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 600);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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

  const menu = [
    { id: 'inicio', label: 'HOME', href: '#inicio' },
    { id: 'quienes', label: 'QUIENES SOMOS', href: '#quienes' },
    { id: 'imagenes', label: 'IMAGENES', href: '#imagenes' },
    { id: 'catalogo', label: 'CATALOGO 2025', href: '/catalog', isRoute: true },
    { id: 'contacto', label: 'CONTACTO', href: '#contacto' },
  ];

  const quienes = useRevealOnScroll();
  const imagenes = useRevealOnScroll();
  const noticias = useRevealOnScroll();
  const contacto = useRevealOnScroll();

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
          <div className="lp-bgOverlay" />
          <div className="lp-bgOverlay2" />
        </div>

        {/* Top nav estilo “template” */}
        <header className="lp-nav">
          <div className="lp-navInner">
            <div className="lp-brand">
              <div className="lp-logoMark" aria-hidden="true">
                <span>G</span>
              </div>
              <div className="lp-brandText">
                <div className="lp-brandName">{landing.brandName}</div>
                <div className="lp-brandTag">{landing.tagline}</div>
              </div>
            </div>

            <nav className="lp-menu">
              {menu.map((item) =>
                item.isRoute ? (
                  <Link key={item.id} href={item.href} className="lp-menuItem">
                    {item.label}
                  </Link>
                ) : (
                  <a key={item.id} href={item.href} className="lp-menuItem">
                    {item.label}
                  </a>
                )
              )}
            </nav>

            <div className="lp-navCta">
              <a className="lp-pill" href="#contacto">
                Contacto
              </a>
            </div>
          </div>
        </header>

        {/* HERO */}
        <section id="inicio" className="lp-hero">
          <div className="lp-heroInner">
            <div className="lp-heroGrid">
              <div className="lp-heroCopy">
                <div className="lp-chip">
                  <span className="lp-dot" />
                  {landing.tagline}
                </div>

                <h1 className="lp-h1">
                  {landing.heroTitle}
                  <span className="lp-h1Accent">.</span>
                </h1>

                <p className="lp-sub">{landing.heroSubtitle}</p>

                <div className="lp-ctas">
                  {(landing.heroCtas || []).map((cta, idx) => {
                    const isPrimary = !!cta.primary;
                    const cls = isPrimary ? 'lp-btn lp-btnPrimary' : 'lp-btn lp-btnGhost';
                    if (cta.href?.startsWith('/')) {
                      return (
                        <Link key={idx} href={cta.href} className={cls}>
                          {cta.label}
                        </Link>
                      );
                    }
                    return (
                      <a key={idx} href={cta.href} className={cls}>
                        {cta.label}
                      </a>
                    );
                  })}
                </div>

                <div className="lp-kpis">
                  {[
                    { t: 'Artesanía', d: 'Terminaciones premium.' },
                    { t: 'Profesional', d: 'Diseño y performance.' },
                    { t: 'Mobile‑first', d: 'Navegación rápida.' },
                  ].map((k) => (
                    <div key={k.t} className="lp-kpiCard">
                      <div className="lp-kpiTitle">{k.t}</div>
                      <div className="lp-kpiDesc">{k.d}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* “Mock” visual estilo template (onda + brillo) */}
              <div className="lp-heroVisual" aria-hidden="true">
                <div className="lp-visualCard">
                  <div className="lp-visualGlow" />
                  <div className="lp-visualWave" />
                  <div className="lp-visualBadge">CATALOGO 2025</div>
                  <div className="lp-visualTitle">Calidad que se nota</div>
                  <div className="lp-visualText">
                    Subí el video desde el panel y queda como fondo con este estilo suave.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="lp-waveTop text-[#241257]">
            <Wave />
          </div>
        </section>

        {/* QUIENES SOMOS */}
        <section id="quienes" className="lp-section lp-sectionPurple">
          <div className="lp-waveTop text-[#0b0a1a]">
            <Wave flip />
          </div>
          <div className="lp-sectionInner">
            <div ref={quienes.ref} className={cx('lp-reveal', quienes.visible && 'lp-revealOn')}>
              <div className="lp-sectionHeader">
                <h2 className="lp-h2">{landing.quienesSomos.title}</h2>
                <p className="lp-p">{landing.quienesSomos.body}</p>
              </div>
              <div className="lp-featureGrid">
                {[
                  { t: 'Materiales', d: 'Selección cuidada y consistencia.' },
                  { t: 'Terminación', d: 'Detalles que transmiten calidad.' },
                  { t: 'Confianza', d: 'Hecho para uso real.' },
                  { t: 'Atención', d: 'Contacto directo y simple.' },
                ].map((f) => (
                  <div key={f.t} className="lp-featureCard">
                    <div className="lp-featureIcon" />
                    <div className="lp-featureTitle">{f.t}</div>
                    <div className="lp-featureDesc">{f.d}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="lp-waveBottom text-[#241257]">
            <Wave />
          </div>
        </section>

        {/* GALERIA */}
        <section id="imagenes" className="lp-section lp-sectionDark">
          <div className="lp-sectionInner">
            <div ref={imagenes.ref} className={cx('lp-reveal', imagenes.visible && 'lp-revealOn')}>
              <div className="lp-sectionHeader">
                <h2 className="lp-h2">Galucho en imagenes</h2>
                <p className="lp-p">Cargalas desde el panel (LandingPage).</p>
              </div>

              {(landing.galeria || []).length === 0 ? (
                <div className="lp-empty">
                  No hay imágenes todavía. Agregá URLs desde el panel.
                </div>
              ) : (
                <div className="lp-gallery">
                  {(landing.galeria || []).slice(0, 12).map((img, idx) => (
                    <div key={idx} className="lp-galleryItem">
                      <img
                        src={img.url}
                        alt={img.alt || `Imagen ${idx + 1}`}
                        className="lp-galleryImg"
                        loading="lazy"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* NOTICIAS */}
        <section className="lp-section lp-sectionPurpleSoft">
          <div className="lp-sectionInner">
            <div ref={noticias.ref} className={cx('lp-reveal', noticias.visible && 'lp-revealOn')}>
              <div className="lp-sectionHeader">
                <h2 className="lp-h2">Noticias</h2>
                <p className="lp-p">Novedades y actualizaciones.</p>
              </div>

              {(landing.noticias || []).length === 0 ? (
                <div className="lp-empty">
                  No hay noticias todavía. Crealas desde el panel.
                </div>
              ) : (
                <div className="lp-newsGrid">
                  {(landing.noticias || []).slice(0, 6).map((n, idx) => (
                    <article key={idx} className="lp-newsCard">
                      <div className="lp-newsTop">
                        <div className="lp-newsTitle">{n.title}</div>
                        {n.date && <div className="lp-newsDate">{n.date}</div>}
                      </div>
                      {n.imageUrl && (
                        <div className="lp-newsImgWrap">
                          <img src={n.imageUrl} alt={n.title} className="lp-newsImg" loading="lazy" />
                        </div>
                      )}
                      {n.body && <div className="lp-newsBody">{n.body}</div>}
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* CONTACTO */}
        <section id="contacto" className="lp-section lp-sectionDark">
          <div className="lp-sectionInner">
            <div ref={contacto.ref} className={cx('lp-reveal', contacto.visible && 'lp-revealOn')}>
              <div className="lp-sectionHeader">
                <h2 className="lp-h2">Contacto Directo Whatsapp</h2>
                <p className="lp-p">
                  {landing.contacto.nombre ? `${landing.contacto.nombre} · ` : ''}
                  {landing.contacto.ciudad}
                </p>
              </div>

              <div className="lp-contactGrid">
                <div className="lp-contactCard">
                  <div className="lp-contactLabel">Teléfono</div>
                  <div className="lp-contactValue">{landing.contacto.telefono || '—'}</div>
                </div>
                <div className="lp-contactCard">
                  <div className="lp-contactLabel">WhatsApp</div>
                  <div className="lp-contactValue">
                    {landing.contacto.whatsapp || (config?.whatsappNumber || '—')}
                  </div>
                </div>
              </div>

              <div className="lp-contactCtas">
                <Link href="/catalog" className="lp-btn lp-btnPrimary">
                  Ir al Catálogo 2025
                </Link>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    const num = (landing.contacto.whatsapp || config?.whatsappNumber || '')
                      .toString()
                      .replace(/[^\d+]/g, '');
                    if (!num) return;
                    const msg = encodeURIComponent('Hola! Quiero consultar por Cuchillos Galucho.');
                    window.open(`https://wa.me/${num}?text=${msg}`, '_blank');
                  }}
                  className="lp-btn lp-btnWhats"
                >
                  Abrir WhatsApp
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Footer estilo template */}
        <footer className="lp-footer">
          <div className="lp-footerInner">
            <div className="lp-footerBrand">{landing.brandName}</div>
            <div className="lp-footerLinks">
              {menu.map((m) =>
                m.isRoute ? (
                  <Link key={m.id} href={m.href} className="lp-footerLink">
                    {m.label}
                  </Link>
                ) : (
                  <a key={m.id} href={m.href} className="lp-footerLink">
                    {m.label}
                  </a>
                )
              )}
            </div>
            <div className="lp-footerCopy">© {new Date().getFullYear()} {landing.brandName}</div>
          </div>
        </footer>

        {/* Scroll to top */}
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className={cx('lp-toTop', showTop && 'lp-toTopOn')}
          aria-label="Volver arriba"
        >
          ↑
        </button>
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
          background: radial-gradient(1200px 800px at 15% 15%, rgba(168, 85, 247, 0.35), transparent 55%),
                      radial-gradient(900px 600px at 80% 35%, rgba(59, 130, 246, 0.22), transparent 55%),
                      radial-gradient(900px 700px at 50% 80%, rgba(34, 197, 94, 0.10), transparent 60%),
                      linear-gradient(180deg, rgba(11,10,26,0.45), rgba(11,10,26,0.82) 55%, rgba(11,10,26,1));
        }
        .lp-bgOverlay2 {
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, rgba(255,255,255,0.04), transparent 35%, rgba(255,255,255,0.03));
          mix-blend-mode: overlay;
          opacity: 0.35;
        }

        .lp-nav {
          position: sticky;
          top: 0;
          z-index: 50;
          backdrop-filter: blur(16px);
          background: rgba(35, 18, 87, 0.55);
          border-bottom: 1px solid rgba(255,255,255,0.10);
        }
        .lp-navInner {
          max-width: 1100px;
          margin: 0 auto;
          padding: 14px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .lp-brand { display: flex; align-items: center; gap: 10px; min-width: 0; }
        .lp-logoMark {
          width: 40px;
          height: 40px;
          border-radius: 999px;
          background: radial-gradient(circle at 30% 30%, rgba(168,85,247,0.9), rgba(59,130,246,0.55));
          box-shadow: 0 10px 30px rgba(0,0,0,0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255,255,255,0.18);
        }
        .lp-logoMark span { font-weight: 900; }
        .lp-brandText { min-width: 0; }
        .lp-brandName { font-weight: 900; letter-spacing: 0.04em; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .lp-brandTag { font-size: 11px; opacity: 0.8; }

        .lp-menu {
          display: none;
          align-items: center;
          gap: 14px;
          font-size: 12px;
          letter-spacing: 0.08em;
          opacity: 0.95;
        }
        .lp-menuItem {
          padding: 10px 10px;
          border-radius: 10px;
          transition: transform 160ms ease, background 160ms ease;
          color: rgba(255,255,255,0.92);
        }
        .lp-menuItem:hover {
          background: rgba(255,255,255,0.10);
          transform: translateY(-1px);
        }
        .lp-navCta { display: flex; align-items: center; }
        .lp-pill {
          padding: 10px 14px;
          border-radius: 999px;
          background: rgba(255,255,255,0.12);
          border: 1px solid rgba(255,255,255,0.18);
          font-weight: 800;
          font-size: 12px;
          transition: background 160ms ease, transform 160ms ease;
        }
        .lp-pill:hover { background: rgba(255,255,255,0.18); transform: translateY(-1px); }

        @media (min-width: 900px) {
          .lp-menu { display: flex; }
        }

        .lp-hero { position: relative; z-index: 1; }
        .lp-heroInner { max-width: 1100px; margin: 0 auto; padding: 54px 16px 28px; }
        .lp-heroGrid { display: grid; grid-template-columns: 1fr; gap: 18px; align-items: start; }
        @media (min-width: 900px) {
          .lp-heroGrid { grid-template-columns: 1.15fr 0.85fr; gap: 22px; }
        }

        .lp-chip {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          border-radius: 999px;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.14);
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.06em;
          width: fit-content;
        }
        .lp-dot {
          width: 10px;
          height: 10px;
          border-radius: 999px;
          background: #fbbf24;
          box-shadow: 0 0 0 6px rgba(251,191,36,0.15);
        }

        .lp-h1 {
          margin-top: 14px;
          font-size: 46px;
          line-height: 1.02;
          font-weight: 1000;
          letter-spacing: -0.02em;
          text-shadow: 0 18px 60px rgba(0,0,0,0.45);
        }
        @media (min-width: 900px) { .lp-h1 { font-size: 56px; } }
        .lp-h1Accent { color: #fbbf24; }
        .lp-sub {
          margin-top: 14px;
          max-width: 52ch;
          color: rgba(255,255,255,0.82);
          line-height: 1.7;
          font-size: 15px;
        }

        .lp-ctas { margin-top: 18px; display: flex; flex-direction: column; gap: 10px; }
        @media (min-width: 540px) { .lp-ctas { flex-direction: row; } }
        .lp-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 12px 16px;
          border-radius: 14px;
          font-weight: 900;
          font-size: 13px;
          letter-spacing: 0.02em;
          transition: transform 160ms ease, filter 160ms ease, background 160ms ease, border-color 160ms ease;
          will-change: transform;
        }
        .lp-btn:hover { transform: translateY(-1px); }
        .lp-btnPrimary {
          background: linear-gradient(90deg, rgba(255,255,255,0.92), rgba(255,255,255,0.88));
          color: #1b133b;
          filter: drop-shadow(0 20px 50px rgba(0,0,0,0.35));
        }
        .lp-btnGhost {
          background: rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.95);
          border: 1px solid rgba(255,255,255,0.14);
        }
        .lp-btnWhats {
          background: linear-gradient(90deg, rgba(16,185,129,0.95), rgba(34,197,94,0.85));
          color: #07110f;
        }

        .lp-kpis { margin-top: 16px; display: grid; grid-template-columns: 1fr; gap: 10px; }
        @media (min-width: 680px) { .lp-kpis { grid-template-columns: repeat(3, 1fr); } }
        .lp-kpiCard {
          padding: 14px 14px;
          border-radius: 16px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.10);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.08);
        }
        .lp-kpiTitle { font-weight: 900; font-size: 13px; }
        .lp-kpiDesc { margin-top: 6px; font-size: 12px; color: rgba(255,255,255,0.74); line-height: 1.5; }

        .lp-heroVisual { display: none; }
        @media (min-width: 900px) { .lp-heroVisual { display: block; } }
        .lp-visualCard {
          position: relative;
          border-radius: 26px;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(35, 18, 87, 0.55);
          box-shadow: 0 40px 120px rgba(0,0,0,0.55);
          padding: 22px;
          min-height: 360px;
        }
        .lp-visualGlow {
          position: absolute;
          inset: -40%;
          background: radial-gradient(circle at 30% 30%, rgba(168,85,247,0.55), transparent 60%),
                      radial-gradient(circle at 70% 60%, rgba(59,130,246,0.30), transparent 55%);
          filter: blur(40px);
          opacity: 0.9;
        }
        .lp-visualWave {
          position: absolute;
          left: -20%;
          right: -20%;
          bottom: -60px;
          height: 220px;
          background: radial-gradient(900px 200px at 40% 10%, rgba(255,255,255,0.14), transparent 60%),
                      linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02));
          transform: rotate(-2deg);
          border-top-left-radius: 999px;
          border-top-right-radius: 999px;
          border: 1px solid rgba(255,255,255,0.10);
        }
        .lp-visualBadge {
          position: relative;
          display: inline-flex;
          padding: 8px 12px;
          border-radius: 999px;
          background: rgba(255,255,255,0.10);
          border: 1px solid rgba(255,255,255,0.16);
          font-weight: 900;
          font-size: 11px;
          letter-spacing: 0.1em;
          z-index: 1;
        }
        .lp-visualTitle {
          position: relative;
          margin-top: 14px;
          font-size: 26px;
          font-weight: 1000;
          z-index: 1;
        }
        .lp-visualText {
          position: relative;
          margin-top: 10px;
          color: rgba(255,255,255,0.78);
          font-size: 13px;
          line-height: 1.6;
          z-index: 1;
        }

        .lp-waveTop, .lp-waveBottom { position: relative; z-index: 2; }
        .lp-waveTop { margin-top: 26px; }

        .lp-section { position: relative; z-index: 2; }
        .lp-sectionInner { max-width: 1100px; margin: 0 auto; padding: 56px 16px; }
        .lp-sectionDark { background: rgba(11,10,26,0.95); }
        .lp-sectionPurple { background: linear-gradient(180deg, rgba(36,18,87,0.95), rgba(71,38,142,0.92)); }
        .lp-sectionPurpleSoft { background: linear-gradient(180deg, rgba(71,38,142,0.88), rgba(36,18,87,0.86)); }

        .lp-sectionHeader { display: flex; flex-direction: column; gap: 10px; }
        .lp-h2 { font-size: 34px; font-weight: 1000; letter-spacing: -0.02em; }
        .lp-p { color: rgba(255,255,255,0.78); line-height: 1.7; max-width: 70ch; }

        .lp-featureGrid { margin-top: 18px; display: grid; grid-template-columns: 1fr; gap: 12px; }
        @media (min-width: 720px) { .lp-featureGrid { grid-template-columns: repeat(4, 1fr); } }
        .lp-featureCard {
          border-radius: 18px;
          padding: 16px;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.12);
          transition: transform 160ms ease, background 160ms ease;
        }
        .lp-featureCard:hover { transform: translateY(-2px); background: rgba(255,255,255,0.10); }
        .lp-featureIcon {
          width: 44px;
          height: 44px;
          border-radius: 999px;
          background: radial-gradient(circle at 30% 30%, rgba(251,191,36,0.85), rgba(168,85,247,0.55));
          border: 1px solid rgba(255,255,255,0.14);
          box-shadow: 0 20px 50px rgba(0,0,0,0.35);
        }
        .lp-featureTitle { margin-top: 10px; font-weight: 1000; font-size: 14px; }
        .lp-featureDesc { margin-top: 6px; font-size: 12px; color: rgba(255,255,255,0.74); line-height: 1.5; }

        .lp-empty {
          margin-top: 14px;
          border-radius: 18px;
          padding: 16px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.10);
          color: rgba(255,255,255,0.75);
        }

        .lp-gallery { margin-top: 16px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
        @media (min-width: 720px) { .lp-gallery { grid-template-columns: repeat(3, 1fr); gap: 12px; } }
        .lp-galleryItem {
          border-radius: 18px;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.10);
          background: rgba(0,0,0,0.25);
          transform: translateZ(0);
        }
        .lp-galleryImg { width: 100%; height: 160px; object-fit: cover; transition: transform 240ms ease; }
        .lp-galleryItem:hover .lp-galleryImg { transform: scale(1.04); }

        .lp-newsGrid { margin-top: 16px; display: grid; grid-template-columns: 1fr; gap: 12px; }
        @media (min-width: 720px) { .lp-newsGrid { grid-template-columns: repeat(3, 1fr); } }
        .lp-newsCard {
          border-radius: 18px;
          padding: 16px;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.12);
          transition: transform 160ms ease, background 160ms ease;
        }
        .lp-newsCard:hover { transform: translateY(-2px); background: rgba(255,255,255,0.10); }
        .lp-newsTop { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }
        .lp-newsTitle { font-weight: 1000; font-size: 14px; }
        .lp-newsDate { font-size: 11px; color: rgba(255,255,255,0.65); }
        .lp-newsImgWrap { margin-top: 10px; border-radius: 14px; overflow: hidden; border: 1px solid rgba(255,255,255,0.10); }
        .lp-newsImg { width: 100%; height: 140px; object-fit: cover; }
        .lp-newsBody { margin-top: 10px; color: rgba(255,255,255,0.78); font-size: 12px; line-height: 1.6; }

        .lp-contactGrid { margin-top: 16px; display: grid; grid-template-columns: 1fr; gap: 12px; }
        @media (min-width: 720px) { .lp-contactGrid { grid-template-columns: repeat(2, 1fr); } }
        .lp-contactCard {
          border-radius: 18px;
          padding: 16px;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.12);
        }
        .lp-contactLabel { font-size: 11px; color: rgba(255,255,255,0.65); letter-spacing: 0.08em; text-transform: uppercase; }
        .lp-contactValue { margin-top: 6px; font-weight: 1000; }
        .lp-contactCtas { margin-top: 14px; display: flex; flex-direction: column; gap: 10px; }
        @media (min-width: 540px) { .lp-contactCtas { flex-direction: row; } }

        .lp-footer {
          position: relative;
          z-index: 2;
          background: rgba(35, 18, 87, 0.65);
          border-top: 1px solid rgba(255,255,255,0.10);
        }
        .lp-footerInner {
          max-width: 1100px;
          margin: 0 auto;
          padding: 24px 16px;
          display: grid;
          gap: 12px;
          justify-items: center;
          text-align: center;
        }
        .lp-footerBrand { font-weight: 1000; letter-spacing: 0.06em; }
        .lp-footerLinks { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; }
        .lp-footerLink { font-size: 12px; color: rgba(255,255,255,0.85); padding: 8px 10px; border-radius: 10px; }
        .lp-footerLink:hover { background: rgba(255,255,255,0.10); }
        .lp-footerCopy { font-size: 12px; color: rgba(255,255,255,0.70); }

        .lp-toTop {
          position: fixed;
          right: 16px;
          bottom: 18px;
          z-index: 60;
          width: 46px;
          height: 46px;
          border-radius: 14px;
          background: rgba(251,191,36,0.95);
          color: #1b133b;
          font-weight: 1000;
          border: none;
          box-shadow: 0 24px 60px rgba(0,0,0,0.45);
          transform: translateY(14px);
          opacity: 0;
          transition: transform 180ms ease, opacity 180ms ease;
        }
        .lp-toTopOn { transform: translateY(0); opacity: 1; }

        .lp-reveal {
          opacity: 0;
          transform: translateY(14px);
          transition: opacity 650ms cubic-bezier(.2,.8,.2,1), transform 650ms cubic-bezier(.2,.8,.2,1);
        }
        .lp-revealOn { opacity: 1; transform: translateY(0); }

        @media (prefers-reduced-motion: reduce) {
          html { scroll-behavior: auto; }
          .lp-btn, .lp-featureCard, .lp-newsCard, .lp-menuItem, .lp-pill { transition: none !important; }
          .lp-reveal { opacity: 1; transform: none; transition: none; }
          .lp-toTop { transition: none; }
        }
      `}</style>
    </>
  );
}



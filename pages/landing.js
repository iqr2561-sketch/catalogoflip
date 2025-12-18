import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';

const DEFAULT_LP = {
  brandName: 'CUCHILLOS GALUCHO',
  tagline: 'Argentina',
  heroTitle: 'Cuchillos Galucho',
  heroSubtitle: 'Calidad, precisión y artesanía. Hecho para durar.',
  ui: {
    logoUrl: '',
    navBgFrom: '#2a175a',
    navBgMid: '#3a1f73',
    navBgTo: '#2a175a',
    navTextColor: '#ffffff',
    navAccentColor: '#f59e0b',
    heroBlurPx: 10,
    heroOverlayOpacity: 0.28,
    heroGridEnabled: true,
    heroGridOpacity: 0.18,
    heroGridSize: 56,
    heroGridSpeedSec: 28,
    heroHeightMinPx: 320,
    heroHeightVh: 62,
    heroHeightMaxPx: 620,
  },
  heroCtas: [
    { label: 'Ver Catálogo 2025', href: '/catalog', primary: true },
    { label: 'Contacto Directo Whatsapp', href: '#contacto', primary: false },
  ],
  quienesSomos: {
    title: 'Quienes Somos',
    body:
      'Somos Cuchillos Galucho: diseño, calidad y un estándar profesional en cada pieza. Nuestra prioridad es que cada producto sea confiable y elegante.',
    imageUrl: '',
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
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState(null);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

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

  useEffect(() => {
    const onScroll = () => {
      // Activa el modo “menu flotante” apenas el usuario empieza a scrollear
      const y = typeof window !== 'undefined' ? window.scrollY : 0;
      setScrolled(y > 12);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    // Si el usuario scrollea, cerramos el menú móvil para evitar superposiciones
    if (scrolled) setMenuOpen(false);
  }, [scrolled]);

  useEffect(() => {
    const checkStandalone = () => {
      const standalone =
        window.matchMedia?.('(display-mode: standalone)')?.matches ||
        window.navigator?.standalone === true;
      setIsStandalone(!!standalone);
    };
    checkStandalone();

    const onBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredInstallPrompt(e);
    };

    const onAppInstalled = () => {
      setDeferredInstallPrompt(null);
      setShowInstallModal(false);
      setIsStandalone(true);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  const canInstall = !!deferredInstallPrompt && !isStandalone;
  const triggerInstall = async () => {
    if (!deferredInstallPrompt) return;
    try {
      await deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
    } finally {
      setDeferredInstallPrompt(null);
      setShowInstallModal(false);
    }
  };

  const landing = useMemo(() => {
    const lp = config?.landingPage || {};
    return {
      ...DEFAULT_LP,
      ...lp,
      ui: { ...DEFAULT_LP.ui, ...(lp.ui || {}) },
      quienesSomos: { ...DEFAULT_LP.quienesSomos, ...(lp.quienesSomos || {}) },
      contacto: { ...DEFAULT_LP.contacto, ...(lp.contacto || {}) },
      noticias: Array.isArray(lp.noticias) ? lp.noticias : DEFAULT_LP.noticias,
      galeria: Array.isArray(lp.galeria) ? lp.galeria : DEFAULT_LP.galeria,
    };
  }, [config]);

  const videoUrl = config?.landingPage?.video?.source ? '/api/landing-video' : null;
  const waHref = useMemo(() => {
    // Si no se configuró WhatsApp en LandingPage, usamos el WhatsApp general del catálogo
    const raw = landing?.contacto?.whatsapp || config?.whatsappNumber || '';
    const digits = String(raw).replace(/[^\d]/g, '');
    return digits ? `https://wa.me/${digits}` : null;
  }, [landing?.contacto?.whatsapp, config?.whatsappNumber]);

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

      <div
        className="lp-root"
        style={{
          '--lp-nav-from': landing.ui.navBgFrom,
          '--lp-nav-mid': landing.ui.navBgMid,
          '--lp-nav-to': landing.ui.navBgTo,
          '--lp-nav-text': landing.ui.navTextColor,
          '--lp-accent': landing.ui.navAccentColor,
          '--lp-hero-blur': `${Number(landing.ui.heroBlurPx || 0)}px`,
          '--lp-hero-overlay-opacity': String(landing.ui.heroOverlayOpacity ?? 0.28),
          '--lp-hero-grid-opacity': String(landing.ui.heroGridOpacity ?? 0.18),
          '--lp-hero-grid-size': `${Number(landing.ui.heroGridSize || 56)}px`,
          '--lp-hero-grid-speed': `${Number(landing.ui.heroGridSpeedSec || 28)}s`,
          '--lp-hero-h-min': `${Number(landing.ui.heroHeightMinPx || 320)}px`,
          '--lp-hero-h-vh': `${Number(landing.ui.heroHeightVh || 62)}vh`,
          '--lp-hero-h-max': `${Number(landing.ui.heroHeightMaxPx || 620)}px`,
        }}
      >
        {/* Navbar estilo template (violeta + ondas) */}
        <header className={cx('lp-topbar', scrolled && 'lp-topbarScrolled')} role="banner">
          <div className="lp-topbarInner">
            <div className="lp-logo" aria-label={landing.brandName}>
              {landing.ui.logoUrl ? (
                <img className="lp-logoImg" src={landing.ui.logoUrl} alt={`${landing.brandName} logo`} />
              ) : (
                <span className="lp-logoMark" aria-hidden="true" />
              )}
              <span className="lp-logoText">{landing.brandName}</span>
            </div>
            <nav className="lp-menu" aria-label="Navegación">
              <a className="lp-menuLink" href="#home">Home</a>
              <a className="lp-menuLink" href="#quienes">Quienes</a>
              <a className="lp-menuLink" href="#contacto">Contacto</a>
              <a className="lp-menuLink" href="/catalog">Catálogo</a>
              {canInstall ? (
                <button type="button" className="lp-installBtn" onClick={() => setShowInstallModal(true)}>
                  Instalar
                </button>
              ) : null}
            </nav>

            <button
              type="button"
              className="lp-menuBtn"
              aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
              aria-expanded={menuOpen ? 'true' : 'false'}
              onClick={() => setMenuOpen((v) => !v)}
            >
              <span className="lp-menuBtnBar" />
              <span className="lp-menuBtnBar" />
              <span className="lp-menuBtnBar" />
            </button>
          </div>

          {/* Drawer móvil (aparece desde un costado con animación suave) */}
          <div className={cx('lp-drawerRoot', menuOpen && 'is-open')} aria-hidden={menuOpen ? 'false' : 'true'}>
            <button
              type="button"
              className="lp-drawerOverlay"
              aria-label="Cerrar menú"
              onClick={() => setMenuOpen(false)}
            />
            <aside className="lp-drawer" aria-label="Menú" role="dialog">
              <div className="lp-drawerHead">
                <div className="lp-drawerTitle">Menú</div>
                <button type="button" className="lp-drawerClose" onClick={() => setMenuOpen(false)} aria-label="Cerrar">
                  ✕
                </button>
              </div>
              <div className="lp-drawerBody">
                <a className="lp-mobileLink" href="#home" onClick={() => setMenuOpen(false)}>Home</a>
                <a className="lp-mobileLink" href="#quienes" onClick={() => setMenuOpen(false)}>Quienes</a>
                <a className="lp-mobileLink" href="#contacto" onClick={() => setMenuOpen(false)}>Contacto</a>
                <a className="lp-mobileLink" href="/catalog" onClick={() => setMenuOpen(false)}>Catálogo</a>

                {canInstall ? (
                  <button
                    type="button"
                    className="lp-mobileInstall"
                    onClick={() => {
                      setMenuOpen(false);
                      setShowInstallModal(true);
                    }}
                  >
                    Instalar app
                  </button>
                ) : null}
              </div>
            </aside>
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
          {landing.ui.heroGridEnabled !== false ? (
            <div className="lp-heroGrid" aria-hidden="true" />
          ) : null}
          <div className="lp-heroWave" aria-hidden="true">
            <svg viewBox="0 0 1440 180" preserveAspectRatio="none">
              <path
                d="M0,124 C180,170 360,190 540,170 C720,150 840,106 1020,106 C1200,106 1320,140 1440,166 L1440,180 L0,180 Z"
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
          <section id="quienes" className="lp-section lp-quienes" aria-label="Quienes somos">
            <div className="lp-sectionInner">
              <div className="lp-quienesCard">
                <div className="lp-quienesGrid">
                  <div>
                    <div className="lp-quienesEyebrow">Nuestra historia</div>
                    <h2 className="lp-h2 lp-h2OnDark">{landing?.quienesSomos?.title || 'Quienes Somos'}</h2>
                    <p className="lp-p lp-pOnDark">{landing?.quienesSomos?.body || ''}</p>
                  </div>
                  {landing?.quienesSomos?.imageUrl ? (
                    <div className="lp-quienesImgWrap" aria-label="Imagen quienes somos">
                      <img className="lp-quienesImg" src={landing.quienesSomos.imageUrl} alt="" />
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="lp-quienesWave" aria-hidden="true">
              <svg viewBox="0 0 1440 140" preserveAspectRatio="none">
                <path
                  d="M0,74 C180,124 320,140 520,128 C760,114 860,60 1040,60 C1220,60 1340,98 1440,120 L1440,140 L0,140 Z"
                  fill="#ffffff"
                />
              </svg>
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

        {/* WhatsApp flotante (solo si hay número configurado) */}
        {waHref && (
          <a
            className="lp-waFloat"
            href={waHref}
            target="_blank"
            rel="noreferrer"
            aria-label="Abrir WhatsApp"
            title="WhatsApp"
          >
            <span className="lp-waLabel">WhatsApp</span>
            <span className="lp-waGlow" aria-hidden="true" />
            <span className="lp-waSpark" aria-hidden="true" />
            <span className="lp-waPulse" aria-hidden="true" />
            <svg className="lp-waIcon" viewBox="0 0 32 32" aria-hidden="true">
              <path
                fill="currentColor"
                d="M19.11 17.53c-.27-.14-1.57-.77-1.81-.86-.24-.09-.42-.14-.6.14-.18.27-.69.86-.84 1.03-.15.18-.31.2-.58.07-.27-.14-1.13-.42-2.15-1.35-.79-.7-1.33-1.57-1.49-1.83-.16-.27-.02-.41.12-.55.12-.12.27-.31.41-.46.14-.15.18-.27.27-.45.09-.18.05-.34-.02-.48-.07-.14-.6-1.45-.82-1.98-.22-.53-.45-.46-.6-.46h-.51c-.18 0-.46.07-.7.34-.24.27-.92.9-.92 2.2 0 1.3.94 2.56 1.07 2.74.13.18 1.85 2.82 4.49 3.95.63.27 1.12.43 1.51.55.63.2 1.21.17 1.66.1.51-.08 1.57-.64 1.79-1.26.22-.62.22-1.15.15-1.26-.06-.11-.24-.18-.51-.32zM16.01 5.33c-5.88 0-10.67 4.79-10.67 10.67 0 1.88.49 3.72 1.42 5.34L5.33 26.67l5.45-1.41c1.56.85 3.32 1.29 5.23 1.29 5.88 0 10.67-4.79 10.67-10.67S21.89 5.33 16.01 5.33zm0 19.43c-1.74 0-3.38-.47-4.82-1.36l-.34-.2-3.23.84.86-3.15-.22-.36a8.56 8.56 0 0 1-1.31-4.65c0-4.72 3.84-8.56 8.56-8.56 4.72 0 8.56 3.84 8.56 8.56 0 4.72-3.84 8.56-8.56 8.56z"
              />
            </svg>
          </a>
        )}

        {/* Modal instalación PWA */}
        {showInstallModal && (
          <div className="lp-modalRoot" role="dialog" aria-modal="true" aria-label="Instalar app">
            <button className="lp-modalOverlay" onClick={() => setShowInstallModal(false)} aria-label="Cerrar" />
            <div className="lp-modal">
              <div className="lp-modalGlow" aria-hidden="true" />
              <div className="lp-modalHead">
                <div className="lp-modalIcon" aria-hidden="true">
                  <span />
                </div>
                <div className="lp-modalTitle">Instalar como app</div>
                <div className="lp-modalSub">Acceso rápido, pantalla completa y mejor experiencia.</div>
              </div>
              <div className="lp-modalActions">
                <button type="button" className="lp-modalBtnGhost" onClick={() => setShowInstallModal(false)}>
                  Ahora no
                </button>
                <button type="button" className="lp-modalBtn" onClick={triggerInstall}>
                  Instalar
                </button>
              </div>
            </div>
          </div>
        )}
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
                      linear-gradient(90deg, var(--lp-nav-from), var(--lp-nav-mid) 45%, var(--lp-nav-to));
          color: var(--lp-nav-text);
          transition: transform 320ms ease, background-color 320ms ease, box-shadow 320ms ease, border-color 320ms ease, backdrop-filter 320ms ease;
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
        /* Al scrollear: baja un poco y se vuelve semitransparente (flotante) */
        .lp-topbarScrolled {
          /* Mantiene el mismo “modo” (sticky), solo se vuelve más flotante y delicado */
          transform: translateY(10px);
          background: rgba(42, 23, 90, 0.42);
          border-bottom: 1px solid rgba(255,255,255,0.10);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          box-shadow: 0 18px 45px rgba(18, 10, 48, 0.14);
        }
        .lp-topbarScrolled .lp-topbarInner {
          padding: 12px 14px;
        }
        .lp-topbarScrolled .lp-topbarWave {
          /* no lo escondemos: que siga el estilo sin “cambio de modo” */
          opacity: 0.35;
        }
        .lp-topbarWave {
          height: 28px;
          overflow: hidden;
        }
        .lp-topbarWave svg { width: 100%; height: 100%; display: block; }

        .lp-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          user-select: none;
        }
        .lp-logoImg {
          width: 34px;
          height: 34px;
          object-fit: contain;
          border-radius: 10px;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.18);
          padding: 3px;
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
          padding: 6px 8px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.14);
          background: rgba(0,0,0,0.10);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }
        .lp-menuBtn {
          display: inline-flex;
          flex-direction: column;
          gap: 5px;
          padding: 10px;
          border-radius: 12px;
          background: rgba(0,0,0,0.12);
          border: 1px solid rgba(255,255,255,0.16);
          color: var(--lp-nav-text);
        }
        .lp-menuBtnBar {
          width: 18px;
          height: 2px;
          background: currentColor;
          opacity: 0.9;
          border-radius: 999px;
        }
        .lp-mobileLink {
          color: var(--lp-nav-text);
          text-decoration: none;
          font-weight: 800;
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(0,0,0,0.10);
        }
        .lp-installBtn {
          margin-left: 8px;
          padding: 8px 12px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.16);
          background: rgba(0,0,0,0.12);
          color: var(--lp-nav-text);
          font-weight: 900;
          font-size: 12px;
          letter-spacing: 0.4px;
          text-transform: uppercase;
        }

        /* Drawer (menú móvil) */
        .lp-drawerRoot {
          position: fixed;
          inset: 0;
          z-index: 90;
          pointer-events: none;
        }
        .lp-drawerOverlay {
          position: absolute;
          inset: 0;
          border: 0;
          background: rgba(0,0,0,0.18);
          opacity: 0;
          transition: opacity 220ms ease;
          pointer-events: none;
        }
        .lp-drawer {
          position: absolute;
          top: 12px;
          right: 12px;
          bottom: 12px;
          width: min(360px, calc(100vw - 24px));
          border-radius: 22px;
          background: rgba(42, 23, 90, 0.58);
          border: 1px solid rgba(255,255,255,0.14);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          box-shadow: 0 30px 80px rgba(0,0,0,0.35);
          transform: translateX(16px);
          opacity: 0;
          transition: transform 240ms ease, opacity 240ms ease;
          pointer-events: none;
          overflow: hidden;
        }
        .lp-drawerHead {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 14px 10px;
          border-bottom: 1px solid rgba(255,255,255,0.10);
          color: var(--lp-nav-text);
        }
        .lp-drawerTitle { font-weight: 950; letter-spacing: 0.2px; }
        .lp-drawerClose {
          width: 36px;
          height: 36px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.14);
          background: rgba(0,0,0,0.12);
          color: var(--lp-nav-text);
          font-weight: 900;
        }
        .lp-drawerBody {
          padding: 12px;
          display: grid;
          gap: 10px;
        }
        .lp-mobileInstall {
          margin-top: 6px;
          padding: 12px 12px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,0.16);
          background: linear-gradient(135deg, rgba(255,255,255,0.10), rgba(0,0,0,0.12));
          color: var(--lp-nav-text);
          font-weight: 950;
        }
        .lp-drawerRoot.is-open { pointer-events: auto; }
        .lp-drawerRoot.is-open .lp-drawerOverlay { opacity: 1; pointer-events: auto; }
        .lp-drawerRoot.is-open .lp-drawer { transform: translateX(0); opacity: 1; pointer-events: auto; }

        /* Modal instalación PWA */
        .lp-modalRoot {
          position: fixed;
          inset: 0;
          z-index: 100;
          display: grid;
          place-items: center;
          padding: 18px;
        }
        .lp-modalOverlay {
          position: absolute;
          inset: 0;
          border: 0;
          background: rgba(0,0,0,0.32);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
        }
        .lp-modal {
          position: relative;
          width: min(520px, 100%);
          border-radius: 26px;
          padding: 18px 18px 16px;
          background:
            radial-gradient(900px 420px at 15% 15%, rgba(255,255,255,0.14), transparent 60%),
            radial-gradient(700px 420px at 85% 85%, rgba(0,0,0,0.18), transparent 60%),
            linear-gradient(135deg, rgba(42, 23, 90, 0.92), rgba(76, 29, 149, 0.92));
          border: 1px solid rgba(255,255,255,0.14);
          color: #fff;
          box-shadow: 0 40px 120px rgba(0,0,0,0.45);
          overflow: hidden;
        }
        .lp-modalGlow {
          position: absolute;
          inset: -20%;
          background:
            radial-gradient(circle at 25% 20%, rgba(245,158,11,0.22), transparent 60%),
            radial-gradient(circle at 70% 55%, rgba(139,92,246,0.22), transparent 60%);
          opacity: 0.9;
          pointer-events: none;
        }
        .lp-modalHead { position: relative; z-index: 1; }
        .lp-modalIcon {
          width: 48px;
          height: 48px;
          border-radius: 18px;
          background: rgba(255,255,255,0.10);
          border: 1px solid rgba(255,255,255,0.16);
          display: grid;
          place-items: center;
          margin-bottom: 10px;
        }
        .lp-modalIcon span {
          width: 22px;
          height: 22px;
          border-radius: 8px;
          background: linear-gradient(135deg, rgba(245,158,11,0.95), rgba(255,255,255,0.20));
          box-shadow: 0 14px 40px rgba(245,158,11,0.20);
        }
        .lp-modalTitle { font-size: 18px; font-weight: 950; letter-spacing: -0.2px; }
        .lp-modalSub { margin-top: 6px; color: rgba(255,255,255,0.86); line-height: 1.55; font-size: 13px; }
        .lp-modalActions {
          position: relative;
          z-index: 1;
          display: flex;
          gap: 10px;
          justify-content: flex-end;
          margin-top: 16px;
        }
        .lp-modalBtn, .lp-modalBtnGhost {
          padding: 10px 14px;
          border-radius: 14px;
          font-weight: 900;
          border: 1px solid rgba(255,255,255,0.18);
        }
        .lp-modalBtnGhost {
          background: rgba(0,0,0,0.14);
          color: rgba(255,255,255,0.92);
        }
        .lp-modalBtn {
          background: linear-gradient(135deg, rgba(245,158,11,0.95), rgba(139,92,246,0.92));
          color: #fff;
          box-shadow: 0 18px 50px rgba(245,158,11,0.18);
        }
        .lp-menuLink {
          color: var(--lp-nav-text);
          text-decoration: none;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.4px;
          text-transform: uppercase;
          opacity: 0.9;
          padding: 8px 10px;
          border-radius: 999px;
          transition: opacity 140ms ease, background 140ms ease, transform 140ms ease;
        }
        .lp-menuLink:hover {
          opacity: 1;
          background: rgba(255,255,255,0.10);
          transform: translateY(-1px);
        }

        /* HERO VIDEO (sin texto) */
        .lp-heroVideo {
          position: relative;
          height: clamp(var(--lp-hero-h-min), var(--lp-hero-h-vh), var(--lp-hero-h-max));
          overflow: hidden;
          background: #0b0a1a;
        }
        .lp-heroVideoEl {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          /* Subimos levemente el encuadre para que el texto del video se vea mejor */
          object-position: center 35%;
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
            radial-gradient(1000px 500px at 18% 22%, rgba(255,255,255,0.06), transparent 64%),
            radial-gradient(900px 520px at 80% 55%, rgba(255,255,255,0.04), transparent 66%),
            linear-gradient(180deg, rgba(0,0,0,0.10), rgba(0,0,0,0.28));
          backdrop-filter: blur(var(--lp-hero-blur));
          -webkit-backdrop-filter: blur(var(--lp-hero-blur));
          opacity: var(--lp-hero-overlay-opacity);
        }
        /* Cuadrícula sutil sobre el hero (sin tapar demasiado) */
        .lp-heroGrid {
          position: absolute;
          inset: 0;
          background:
            linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px);
          background-size: var(--lp-hero-grid-size) var(--lp-hero-grid-size), var(--lp-hero-grid-size) var(--lp-hero-grid-size);
          opacity: var(--lp-hero-grid-opacity);
          mix-blend-mode: overlay;
          pointer-events: none;
          animation: lpHeroGridMove var(--lp-hero-grid-speed) linear infinite;
        }
        @keyframes lpHeroGridMove {
          0% { background-position: 0 0, 0 0; }
          100% { background-position: 200px 140px, 200px 140px; }
        }
        .lp-heroWave {
          position: absolute;
          left: 0;
          right: 0;
          bottom: -14px;
          height: 110px;
        }
        .lp-heroWave svg { width: 100%; height: 100%; display: block; }

        .lp-main { max-width: 1120px; margin: 0 auto; padding: 0 16px 56px; }
        /* Para que el contenido no “salte” cuando el header pasa a fixed */
        .lp-topbar + .lp-heroVideo { scroll-margin-top: 86px; }

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
          background: linear-gradient(135deg, var(--lp-nav-mid), var(--lp-accent));
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
        /* QUIENES destacado (más importante) */
        .lp-quienes {
          position: relative;
          margin-top: 14px;
          padding: 34px 0 0;
          background:
            radial-gradient(900px 520px at 18% 18%, rgba(139, 92, 246, 0.10), transparent 62%),
            radial-gradient(800px 520px at 82% 50%, rgba(245, 158, 11, 0.08), transparent 62%),
            linear-gradient(180deg, #fbfbff, #f6f6ff);
          border-radius: 0;
          overflow: hidden;
        }
        /* Entramado sutil full-width */
        .lp-quienes::after {
          content: "";
          position: absolute;
          inset: 0;
          background:
            linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px),
            radial-gradient(circle at 20% 30%, rgba(139,92,246,0.10), transparent 55%),
            radial-gradient(circle at 80% 55%, rgba(245,158,11,0.07), transparent 58%);
          background-size: 80px 80px, 80px 80px, auto, auto;
          opacity: 0.18;
          pointer-events: none;
        }
        /* patrón sutil tipo “hex” en la esquina, estilo template */
        .lp-quienes::before {
          content: "";
          position: absolute;
          top: -40px;
          right: -40px;
          width: 360px;
          height: 260px;
          background-image:
            radial-gradient(circle at 4px 4px, rgba(0,0,0,0.10) 1.2px, transparent 1.3px),
            linear-gradient(60deg, rgba(0,0,0,0.06) 1px, transparent 1px),
            linear-gradient(-60deg, rgba(0,0,0,0.06) 1px, transparent 1px);
          background-size: 28px 28px, 28px 28px, 28px 28px;
          opacity: 0.10;
          transform: rotate(8deg);
          pointer-events: none;
        }
        .lp-quienesCard {
          border-radius: 26px;
          padding: 22px 18px;
          color: #1a1630;
          background: rgba(255,255,255,0.78);
          border: 1px solid rgba(42, 23, 90, 0.10);
          box-shadow: 0 22px 60px rgba(18, 10, 48, 0.10);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          position: relative;
          z-index: 1;
        }
        .lp-quienesGrid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 14px;
          align-items: center;
        }
        .lp-quienesImgWrap {
          width: 100%;
          aspect-ratio: 16 / 10;
          border-radius: 18px;
          overflow: hidden;
          border: 1px solid rgba(42, 23, 90, 0.10);
          background: rgba(255,255,255,0.65);
        }
        .lp-quienesImg {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .lp-quienesEyebrow {
          display: inline-flex;
          padding: 8px 12px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.6px;
          text-transform: uppercase;
          background: rgba(245,158,11,0.16);
          border: 1px solid rgba(245,158,11,0.30);
          color: rgba(26, 22, 48, 0.92);
        }
        .lp-h2OnDark { color: #24114f; margin-top: 12px; font-size: clamp(22px, 3.2vw, 34px); }
        .lp-pOnDark { color: rgba(35, 25, 72, 0.78); }
        .lp-quienesWave {
          height: 96px;
          margin-top: 18px;
        }
        .lp-quienesWave svg { width: 100%; height: 100%; display: block; }

        /* WhatsApp flotante */
        .lp-waFloat {
          position: fixed;
          right: 18px;
          bottom: 18px;
          width: 56px;
          height: 56px;
          border-radius: 999px;
          display: grid;
          place-items: center;
          color: #ffffff;
          background: linear-gradient(135deg, #22c55e, #16a34a);
          border: 1px solid rgba(255,255,255,0.18);
          box-shadow: 0 18px 50px rgba(0,0,0,0.28);
          text-decoration: none;
          z-index: 80;
          overflow: hidden;
          transition: transform 140ms ease, box-shadow 140ms ease;
        }
        .lp-waLabel {
          position: absolute;
          left: 18px;
          font-weight: 950;
          letter-spacing: 0.3px;
          font-size: 12px;
          opacity: 0;
          transform: translateX(-4px);
          transition: opacity 160ms ease, transform 160ms ease;
          pointer-events: none;
          white-space: nowrap;
        }
        .lp-waFloat:hover {
          width: 140px;
          justify-content: end;
          padding-right: 16px;
        }
        .lp-waFloat:hover .lp-waLabel {
          opacity: 1;
          transform: translateX(0);
        }
        .lp-waFloat:hover {
          transform: translateY(-2px);
          box-shadow: 0 22px 60px rgba(0,0,0,0.32);
        }
        .lp-waIcon { width: 26px; height: 26px; }
        .lp-waPulse {
          position: absolute;
          inset: -6px;
          border-radius: 999px;
          border: 2px solid rgba(255,255,255,0.22);
          opacity: 0;
          animation: lpPulse 2.8s ease-in-out infinite;
        }
        @keyframes lpPulse {
          0% { transform: scale(0.92); opacity: 0; }
          25% { opacity: 0.35; }
          60% { transform: scale(1.08); opacity: 0; }
          100% { transform: scale(1.08); opacity: 0; }
        }
        .lp-waGlow {
          position: absolute;
          inset: -30%;
          background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.40), transparent 55%);
          opacity: 0.45;
        }
        .lp-waSpark {
          position: absolute;
          inset: 0;
          background:
            linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.22) 35%, transparent 70%);
          transform: translateX(-120%);
          animation: lpSpark 2.8s ease-in-out infinite;
          opacity: 0.55;
        }
        @keyframes lpSpark {
          0% { transform: translateX(-120%); }
          55% { transform: translateX(120%); }
          100% { transform: translateX(120%); }
        }

        @media (prefers-reduced-motion: reduce) {
          .lp-waSpark { animation: none; }
          .lp-waPulse { animation: none; }
        }
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
          .lp-menuBtn, .lp-drawerRoot { display: none; }
          .lp-intro { padding: 44px 0 16px; }
          .lp-introGrid { grid-template-columns: 1.2fr 0.8fr; gap: 22px; }
          .lp-contactGrid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .lp-featureCard { padding: 20px; }
          .lp-quienesGrid { grid-template-columns: 1.1fr 0.9fr; gap: 18px; }
        }

        @media (prefers-reduced-motion: reduce) {
          html { scroll-behavior: auto; }
          /* sin animaciones */
        }
      `}</style>
    </>
  );
}



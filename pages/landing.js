import { useEffect, useMemo, useRef, useState } from 'react';
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
    // Más espacio por defecto en la cabecera (se puede ajustar desde el Panel)
    heroHeightMinPx: 340,
    heroHeightVh: 66,
    heroHeightMaxPx: 700,
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
  const topbarRef = useRef(null);

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

  // Calcular altura del navbar automáticamente
  useEffect(() => {
    const el = topbarRef.current;
    if (!el) return;

    const update = () => {
      const h = Math.ceil(el.getBoundingClientRect().height || 0);
      document.documentElement.style.setProperty('--lp-topbar-h', `${h}px`);
    };

    update();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    ro?.observe(el);
    window.addEventListener('resize', update, { passive: true });
    return () => {
      window.removeEventListener('resize', update);
      ro?.disconnect();
    };
  }, []);

  // Control de scroll: navbar fijo que se desliza hacia abajo
  useEffect(() => {
    let lastScrollY = 0;
    let ticking = false;
    
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY || window.pageYOffset;
          // Activa el estado "scrolled" cuando se scrollea más de 12px
          setScrolled(currentScrollY > 12);
          lastScrollY = currentScrollY;
          ticking = false;
        });
        ticking = true;
      }
    };
    
    // Ejecutar una vez al montar
    onScroll();
    
    // Escuchar eventos de scroll
    window.addEventListener('scroll', onScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', onScroll);
    };
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
        <header ref={topbarRef} className={cx('lp-topbar', scrolled && 'lp-topbarScrolled')} role="banner">
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
              <a className="lp-menuLink" href="#home">Inicio</a>
              <a className="lp-menuLink" href="#quienes">Quienes somos</a>
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
                <a className="lp-mobileLink" href="#home" onClick={() => setMenuOpen(false)}>Inicio</a>
                <a className="lp-mobileLink" href="#quienes" onClick={() => setMenuOpen(false)}>Quienes somos</a>
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
                    const isWhatsApp = cta?.href === '#contacto' || cta?.label?.toLowerCase().includes('whatsapp');
                    const href = cta?.href === '#contacto' && waHref ? waHref : (cta?.href || '#');
                    const external = href.startsWith('http');
                    return (
                      <a
                        key={`${cta?.label || 'cta'}-${idx}`}
                        className={cx(
                          'lp-btn', 
                          isPrimary ? 'lp-btnPrimary lp-btnPrimaryMobile' : 
                          isWhatsApp ? 'lp-btnWhatsApp lp-btnWhatsAppMobile' : 
                          'lp-btnGhost'
                        )}
                        href={href}
                        target={external ? '_blank' : undefined}
                        rel={external ? 'noreferrer' : undefined}
                      >
                        {(isPrimary || isWhatsApp) && <span className="lp-btnShimmer" aria-hidden="true" />}
                        <span className="lp-btnContent">
                          {cta?.label || (isPrimary ? 'Ver catálogo' : 'Contactar')}
                        </span>
                        {(isPrimary || isWhatsApp) && (
                          <svg className="lp-btnSparkle" aria-hidden="true" viewBox="0 0 24 24" fill="none">
                            <path d="M12 2L13.5 8.5L20 10L13.5 11.5L12 18L10.5 11.5L4 10L10.5 8.5L12 2Z" fill="currentColor" opacity="0.6"/>
                            <path d="M19 3L19.5 5.5L22 6L19.5 6.5L19 9L18.5 6.5L16 6L18.5 5.5L19 3Z" fill="currentColor" opacity="0.4"/>
                            <path d="M5 15L5.3 16.3L6.6 16.6L5.3 16.9L5 18.2L4.7 16.9L3.4 16.6L4.7 16.3L5 15Z" fill="currentColor" opacity="0.5"/>
                          </svg>
                        )}
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
        :root {
          /* fallback por si falla la medición */
          --lp-topbar-h: 64px;
          --lp-logo-size: 44px;
        }

        /* TOP BAR - Fijo, semitransparente y elegante */
        /* Navbar fijo: altura fija, z-index alto, sin empujar contenido */
        .lp-topbar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 1000;
          width: 100%;
          height: var(--lp-topbar-h);
          max-height: var(--lp-topbar-h);
          overflow: hidden;
          box-sizing: border-box;
          /* Fondo semitransparente con blur elegante */
          background: rgba(42, 23, 90, 0.75);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255,255,255,0.08);
          color: var(--lp-nav-text);
          box-shadow: 0 4px 24px rgba(0,0,0,0.08);
          transition: background 320ms ease, backdrop-filter 320ms ease, box-shadow 320ms ease, border-color 320ms ease, transform 320ms ease;
          transform: translateY(0);
        }
        /* Contenedor interno: flexbox, sin crecimiento */
        .lp-topbarInner {
          width: 100%;
          max-width: 100%;
          height: 100%;
          margin: 0;
          padding: 12px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          box-sizing: border-box;
          overflow: hidden;
        }
        /* Al scrollear: fondo más opaco y sombra más pronunciada */
        .lp-topbarScrolled {
          background: rgba(42, 23, 90, 0.85);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border-bottom: 1px solid rgba(255,255,255,0.12);
          box-shadow: 0 8px 32px rgba(0,0,0,0.12);
        }
        .lp-topbarScrolled .lp-topbarWave {
          opacity: 0.2;
        }
        /* Wave decorativo: posicionado absolutamente, sin afectar layout */
        .lp-topbarWave {
          position: absolute;
          left: 0;
          right: 0;
          bottom: -1px;
          height: 8px;
          max-height: 8px;
          opacity: 0.3;
          pointer-events: none;
          transition: opacity 320ms ease;
          overflow: hidden;
          z-index: 1;
        }
        .lp-topbarWave svg { 
          width: 100%; 
          height: 100%; 
          display: block;
          max-height: 8px;
        }

        .lp-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          user-select: none;
        }
        .lp-logoImg {
          width: var(--lp-logo-size);
          height: var(--lp-logo-size);
          object-fit: contain;
          border-radius: 10px;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.18);
          padding: 3px;
        }
        .lp-logoMark {
          width: var(--lp-logo-size);
          height: var(--lp-logo-size);
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
        /* Control sutil de tamaño del logo - Solo desktop */
        .lp-logoSizeControl,
        .lp-navbarHeightControl {
          display: none;
          align-items: center;
          gap: 4px;
          padding: 4px 6px;
          border-radius: 8px;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.12);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          opacity: 0.6;
          transition: opacity 200ms ease;
        }
        .lp-logoSizeControl:hover,
        .lp-navbarHeightControl:hover {
          opacity: 1;
        }
        .lp-logoSizeBtn {
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          background: rgba(255,255,255,0.10);
          border: 1px solid rgba(255,255,255,0.16);
          color: var(--lp-nav-text);
          cursor: pointer;
          transition: background 140ms ease, transform 140ms ease;
        }
        .lp-logoSizeBtn:hover {
          background: rgba(255,255,255,0.18);
          transform: scale(1.1);
        }
        .lp-logoSizeBtn:active {
          transform: scale(0.95);
        }
        .lp-logoSizeValue {
          font-size: 10px;
          font-weight: 700;
          color: var(--lp-nav-text);
          min-width: 32px;
          text-align: center;
          opacity: 0.85;
        }
        .lp-menu {
          display: none;
          gap: 8px;
          align-items: center;
          padding: 4px;
          border-radius: 12px;
          background: rgba(255,255,255,0.08);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid rgba(255,255,255,0.1);
        }
        .lp-menuBtn {
          display: inline-flex;
          flex-direction: column;
          gap: 5px;
          padding: 10px;
          border-radius: 10px;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.15);
          color: var(--lp-nav-text);
          transition: all 200ms ease;
        }
        .lp-menuBtn:hover {
          background: rgba(255,255,255,0.15);
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
          flex-shrink: 0;
          box-sizing: border-box;
        }
        .lp-installBtn {
          margin-left: 4px;
          padding: 8px 16px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.2);
          background: rgba(255,255,255,0.12);
          color: var(--lp-nav-text);
          font-weight: 700;
          font-size: 12px;
          letter-spacing: 0.3px;
          transition: all 200ms ease;
        }
        .lp-installBtn:hover {
          background: rgba(255,255,255,0.2);
          transform: translateY(-1px);
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
          position: fixed;
          top: 12px;
          right: 12px;
          bottom: 12px;
          width: min(360px, calc(100vw - 24px));
          max-height: calc(100vh - 24px);
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
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
        }
        .lp-drawerHead {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 14px 10px;
          border-bottom: 1px solid rgba(255,255,255,0.10);
          color: var(--lp-nav-text);
          flex-shrink: 0;
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
          display: flex;
          flex-direction: column;
          gap: 10px;
          flex: 1 1 0;
          overflow-y: auto;
          overflow-x: hidden;
          min-height: 0;
          max-height: 100%;
          box-sizing: border-box;
          -webkit-overflow-scrolling: touch;
        }
        .lp-mobileInstall {
          margin-top: 6px;
          padding: 12px 12px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,0.16);
          background: linear-gradient(135deg, rgba(255,255,255,0.10), rgba(0,0,0,0.12));
          color: var(--lp-nav-text);
          font-weight: 950;
          flex-shrink: 0;
          box-sizing: border-box;
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
          font-weight: 600;
          letter-spacing: 0.2px;
          opacity: 0.85;
          padding: 8px 14px;
          border-radius: 8px;
          transition: all 200ms ease;
        }
        .lp-menuLink:hover {
          opacity: 1;
          background: rgba(255,255,255,0.15);
          transform: translateY(-1px);
        }

        /* HERO VIDEO (sin texto) */
        .lp-heroVideo {
          position: relative;
          /* 100vh real (mobile-friendly) */
          height: 100dvh;
          min-height: 100svh;
          /* Compensar navbar fixed sin meter "espacio vacío": el hero sigue midiendo 100vh,
             pero el contenido/video se centra en el área visible (vh - topbar). */
          padding-top: var(--lp-topbar-h);
          box-sizing: border-box;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          background: #0b0a1a;
        }
        /* En móvil: video ocupa todo el marco */
        @media (max-width: 860px) {
          .lp-heroVideo {
            height: 100dvh;
            min-height: 100svh;
          }
        }
        .lp-heroVideoEl {
          position: absolute;
          left: 0;
          right: 0;
          top: var(--lp-topbar-h);
          bottom: 0;
          width: 100%;
          height: calc(100% - var(--lp-topbar-h));
          object-fit: cover;
          /* Centrado real del encuadre */
          object-position: center center;
          filter: saturate(1.1) contrast(1.05);
          transform: scale(1.02);
        }
        .lp-heroFallback {
          position: absolute;
          left: 0;
          right: 0;
          top: var(--lp-topbar-h);
          bottom: 0;
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
          bottom: -1px;
          height: 120px;
          z-index: 3;
          pointer-events: none;
        }
        .lp-heroWave svg { width: 100%; height: 100%; display: block; }

        /* Layout full-width: el contenido ocupa todo el ancho, con padding lateral consistente */
        .lp-main { width: 100%; max-width: none; margin: 0; padding: 0 16px 56px; }
        /* Compensación correcta para anchors con navbar fixed */
        .lp-topbar + .lp-heroVideo { scroll-margin-top: var(--lp-topbar-h); }
        #home, #quienes, #contacto { scroll-margin-top: calc(var(--lp-topbar-h) + 12px); }

        /* INTRO estilo template */
        .lp-intro { padding: 26px 0 10px; }
        .lp-introGrid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 18px;
          align-items: start;
          width: 100%;
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
          text-align: justify;
          text-justify: inter-word;
          hyphens: auto;
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
          position: relative;
          overflow: hidden;
        }
        .lp-btnContent {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .lp-btnShimmer {
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.4),
            transparent
          );
          animation: lpShimmer 3s infinite;
          z-index: 1;
        }
        @keyframes lpShimmer {
          0% { left: -100%; }
          50% { left: 100%; }
          100% { left: 100%; }
        }
        .lp-btnSparkle {
          width: 20px;
          height: 20px;
          position: relative;
          z-index: 2;
          animation: lpSparkle 2s ease-in-out infinite;
          opacity: 0.8;
        }
        @keyframes lpSparkle {
          0%, 100% { 
            transform: scale(1) rotate(0deg);
            opacity: 0.8;
          }
          50% { 
            transform: scale(1.15) rotate(180deg);
            opacity: 1;
          }
        }
        /* Versión móvil mejorada del botón primario */
        @media (max-width: 860px) {
          .lp-ctaRow {
            flex-direction: column;
            gap: 12px;
          }
          .lp-btnPrimaryMobile {
            width: 100%;
            padding: 18px 24px !important;
            font-size: 16px !important;
            font-weight: 800 !important;
            border-radius: 20px !important;
            background: linear-gradient(135deg, #4c1d95, #6d28d9, #7c3aed) !important;
            box-shadow: 
              0 8px 32px rgba(76, 29, 149, 0.35),
              0 0 0 2px rgba(255, 255, 255, 0.1) inset,
              0 4px 16px rgba(124, 58, 237, 0.4) !important;
            border: 2px solid rgba(255, 255, 255, 0.2) !important;
            position: relative;
            overflow: visible;
          }
          /* Botón WhatsApp con mismo efecto pero colores verdes */
          .lp-btnWhatsAppMobile {
            width: 100%;
            padding: 18px 24px !important;
            font-size: 16px !important;
            font-weight: 800 !important;
            border-radius: 20px !important;
            background: linear-gradient(135deg, #25D366, #128C7E, #075E54) !important;
            box-shadow: 
              0 8px 32px rgba(37, 211, 102, 0.35),
              0 0 0 2px rgba(255, 255, 255, 0.1) inset,
              0 4px 16px rgba(37, 211, 102, 0.4) !important;
            border: 2px solid rgba(255, 255, 255, 0.2) !important;
            position: relative;
            overflow: visible;
            color: #fff !important;
          }
          .lp-btnWhatsAppMobile::before {
            content: '';
            position: absolute;
            inset: -2px;
            border-radius: 20px;
            padding: 2px;
            background: linear-gradient(135deg, rgba(255,255,255,0.3), rgba(255,255,255,0.1), rgba(255,255,255,0.3));
            -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
            -webkit-mask-composite: xor;
            mask-composite: exclude;
            animation: lpBorderGlow 2.5s ease-in-out infinite;
            z-index: 0;
          }
          .lp-btnWhatsAppMobile::after {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%);
            animation: lpPulse 3s ease-in-out infinite;
            z-index: 0;
          }
          .lp-btnWhatsAppMobile:hover,
          .lp-btnWhatsAppMobile:active {
            transform: translateY(-2px) scale(1.02) !important;
            box-shadow: 
              0 12px 40px rgba(37, 211, 102, 0.45),
              0 0 0 2px rgba(255, 255, 255, 0.15) inset,
              0 6px 20px rgba(37, 211, 102, 0.5) !important;
          }
          .lp-btnWhatsAppMobile .lp-btnShimmer {
            animation: lpShimmerMobile 2.5s ease-in-out infinite;
          }
          .lp-btnWhatsAppMobile .lp-btnSparkle {
            width: 24px;
            height: 24px;
            animation: lpSparkleMobile 1.8s ease-in-out infinite;
          }
          .lp-btnPrimaryMobile::before {
            content: '';
            position: absolute;
            inset: -2px;
            border-radius: 20px;
            padding: 2px;
            background: linear-gradient(135deg, rgba(255,255,255,0.3), rgba(255,255,255,0.1), rgba(255,255,255,0.3));
            -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
            -webkit-mask-composite: xor;
            mask-composite: exclude;
            animation: lpBorderGlow 2.5s ease-in-out infinite;
            z-index: 0;
          }
          .lp-btnPrimaryMobile::after {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%);
            animation: lpPulse 3s ease-in-out infinite;
            z-index: 0;
          }
          .lp-btnPrimaryMobile:hover,
          .lp-btnPrimaryMobile:active {
            transform: translateY(-2px) scale(1.02) !important;
            box-shadow: 
              0 12px 40px rgba(76, 29, 149, 0.45),
              0 0 0 2px rgba(255, 255, 255, 0.15) inset,
              0 6px 20px rgba(124, 58, 237, 0.5) !important;
          }
          .lp-btnPrimaryMobile .lp-btnShimmer {
            animation: lpShimmerMobile 2.5s ease-in-out infinite;
          }
          .lp-btnPrimaryMobile .lp-btnSparkle {
            width: 24px;
            height: 24px;
            animation: lpSparkleMobile 1.8s ease-in-out infinite;
          }
        }
        @keyframes lpBorderGlow {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        @keyframes lpPulse {
          0%, 100% { 
            transform: scale(0.8);
            opacity: 0;
          }
          50% { 
            transform: scale(1.2);
            opacity: 0.3;
          }
        }
        @keyframes lpShimmerMobile {
          0% { left: -100%; }
          40% { left: 100%; }
          100% { left: 100%; }
        }
        @keyframes lpSparkleMobile {
          0%, 100% { 
            transform: scale(1) rotate(0deg);
            opacity: 0.9;
          }
          25% { 
            transform: scale(1.2) rotate(90deg);
            opacity: 1;
          }
          50% { 
            transform: scale(1.1) rotate(180deg);
            opacity: 0.95;
          }
          75% { 
            transform: scale(1.2) rotate(270deg);
            opacity: 1;
          }
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
          align-items: start;
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
        .lp-pOnDark {
          color: rgba(35, 25, 72, 0.78);
          text-align: justify;
          text-justify: inter-word;
          hyphens: auto;
        }
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
        /* halo moderno (conic-gradient) */
        .lp-waFloat::before {
          content: "";
          position: absolute;
          inset: -22px;
          border-radius: 999px;
          background: conic-gradient(from 0deg, rgba(255,255,255,0.0), rgba(255,255,255,0.22), rgba(255,255,255,0.0));
          opacity: 0.22;
          animation: lpHalo 6s linear infinite;
          pointer-events: none;
        }
        @keyframes lpHalo {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
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
          .lp-waFloat::before { animation: none; }
        }
        .lp-sectionAlt {
          background: radial-gradient(1200px 520px at 15% 10%, rgba(58,31,115,0.10), transparent 60%),
                      radial-gradient(900px 520px at 85% 60%, rgba(139,92,246,0.10), transparent 60%),
                      linear-gradient(180deg, rgba(58,31,115,0.04), rgba(58,31,115,0.02));
          border-radius: 28px;
          padding: 26px 16px;
        }
        .lp-sectionInner { width: 100%; max-width: none; margin: 0; padding: 0 16px; }
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
          text-align: justify;
          text-justify: inter-word;
          hyphens: auto;
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
        /* En mobile, mejoramos el video para que se vea mejor. */
        @media (max-width: 860px) {
          .lp-heroVideoEl {
            height: 60vh;
            min-height: 400px;
            max-height: 500px;
            object-fit: cover;
            object-position: center center;
            transform: none;
          }
        }
        @media (max-width: 520px) {
          .lp-heroVideoEl {
            height: 50vh;
            min-height: 350px;
            max-height: 450px;
            object-fit: cover;
            object-position: center center;
          }
        }
        @media (min-width: 860px) {
          :root { --lp-logo-size: 48px; }
          .lp-menu { display: flex; }
          .lp-menuBtn, .lp-drawerRoot { display: none; }
          .lp-intro { padding: 44px 0 16px; }
          .lp-introGrid { grid-template-columns: 1.2fr 0.8fr; gap: 22px; }
          .lp-contactGrid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .lp-featureCard { padding: 20px; }
          /* Quienes: texto + imagen al costado */
          .lp-quienesGrid { grid-template-columns: 1.2fr 0.8fr; gap: 18px; }
        }

        @media (prefers-reduced-motion: reduce) {
          html { scroll-behavior: auto; }
          /* sin animaciones */
        }
      `}</style>
    </>
  );
}



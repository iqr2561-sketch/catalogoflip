import { useEffect, useMemo, useState } from 'react';
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

function classNames(...xs) {
  return xs.filter(Boolean).join(' ');
}

export default function LandingPage() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState('inicio');

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
    { id: 'inicio', label: 'inicio', href: '#inicio' },
    { id: 'quienes', label: 'Quienes Somos', href: '#quienes' },
    { id: 'imagenes', label: 'Galucho en imagenes', href: '#imagenes' },
    { id: 'catalogo', label: 'CATALOGO 2025', href: '/catalog', isRoute: true },
    { id: 'contacto', label: 'Contacto Directo Whatsapp', href: '#contacto' },
  ];

  return (
    <>
      <Head>
        <title>{landing.brandName} – Landing</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta
          name="description"
          content="Cuchillos Galucho: una carta de presentación moderna, profesional y lista para convertir."
        />
      </Head>

      <div className="min-h-screen bg-[#070A12] text-white">
        {/* Fondo decorativo */}
        <div className="pointer-events-none fixed inset-0 opacity-70">
          <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-gradient-to-br from-cyan-500/30 to-fuchsia-500/10 blur-3xl" />
          <div className="absolute top-1/3 -right-24 h-72 w-72 rounded-full bg-gradient-to-br from-violet-500/25 to-emerald-500/10 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-96 w-96 rounded-full bg-gradient-to-br from-amber-500/10 to-cyan-500/10 blur-3xl" />
        </div>

        {/* Header móvil */}
        <header className="sticky top-0 z-40 backdrop-blur-xl bg-black/30 border-b border-white/10">
          <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center">
                <span className="font-black tracking-tight">G</span>
              </div>
              <div className="leading-tight">
                <div className="text-sm font-extrabold tracking-wide">{landing.brandName}</div>
                <div className="text-[11px] text-white/70">{landing.tagline}</div>
              </div>
            </div>

            <nav className="flex items-center gap-2">
              <a
                href="#contacto"
                className="px-3 py-2 rounded-xl bg-white text-black text-sm font-bold hover:bg-white/90 transition"
              >
                Contacto
              </a>
            </nav>
          </div>

          {/* Menú tipo tabs (mobile-first) */}
          <div className="mx-auto max-w-6xl px-2 pb-3">
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {menu.map((item) =>
                item.isRoute ? (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={classNames(
                      'shrink-0 px-4 py-2 rounded-xl border text-sm font-semibold transition',
                      'border-white/10 bg-white/5 hover:bg-white/10'
                    )}
                  >
                    {item.label}
                  </Link>
                ) : (
                  <a
                    key={item.id}
                    href={item.href}
                    onClick={() => setActive(item.id)}
                    className={classNames(
                      'shrink-0 px-4 py-2 rounded-xl border text-sm font-semibold transition',
                      active === item.id ? 'border-cyan-400/40 bg-cyan-400/10' : 'border-white/10 bg-white/5 hover:bg-white/10'
                    )}
                  >
                    {item.label}
                  </a>
                )
              )}
            </div>
          </div>
        </header>

        {/* Hero */}
        <section id="inicio" className="relative">
          <div className="mx-auto max-w-6xl px-4 pt-10 pb-8">
            <div className="grid grid-cols-1 gap-6">
              <div className="rounded-3xl border border-white/10 bg-white/5 overflow-hidden shadow-[0_0_0_1px_rgba(255,255,255,0.06)]">
                <div className="relative aspect-[9/16] sm:aspect-[16/9] bg-black">
                  {videoUrl ? (
                    <video
                      src={videoUrl}
                      className="absolute inset-0 h-full w-full object-cover"
                      autoPlay
                      muted
                      loop
                      playsInline
                      preload="metadata"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center px-6">
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/70">
                          {loading ? 'Cargando…' : 'Video de portada aún no cargado'}
                        </div>
                        <div className="mt-3 text-sm text-white/60">
                          Sube el video desde el panel (sección “LandingPage”).
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40" />
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/80">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                      {landing.tagline}
                    </div>
                    <h1 className="mt-3 text-4xl md:text-5xl font-black tracking-tight">
                      {landing.heroTitle}
                    </h1>
                    <p className="mt-3 text-white/75 text-base md:text-lg leading-relaxed">
                      {landing.heroSubtitle}
                    </p>

                    <div className="mt-5 flex flex-col sm:flex-row gap-3">
                      {(landing.heroCtas || []).map((cta, idx) => {
                        const isPrimary = !!cta.primary;
                        const common =
                          'w-full sm:w-auto px-5 py-3 rounded-2xl font-bold text-sm transition flex items-center justify-center gap-2';
                        const cls = isPrimary
                          ? 'bg-white text-black hover:bg-white/90'
                          : 'bg-white/5 border border-white/10 text-white hover:bg-white/10';
                        if (cta.href?.startsWith('/')) {
                          return (
                            <Link key={idx} href={cta.href} className={classNames(common, cls)}>
                              {cta.label}
                            </Link>
                          );
                        }
                        return (
                          <a key={idx} href={cta.href} className={classNames(common, cls)}>
                            {cta.label}
                          </a>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { t: 'Diseño premium', d: 'Estética moderna + sensación de calidad.' },
                  { t: 'Experiencia móvil', d: 'Navegación clara, rápida y cómoda.' },
                  { t: 'Catálogo interactivo', d: 'Acceso directo al catálogo 2025.' },
                ].map((c) => (
                  <div
                    key={c.t}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4"
                  >
                    <div className="text-sm font-extrabold">{c.t}</div>
                    <div className="mt-1 text-xs text-white/70 leading-relaxed">{c.d}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Quienes Somos */}
        <section id="quienes" className="mx-auto max-w-6xl px-4 py-10">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-2xl font-black tracking-tight">{landing.quienesSomos.title}</h2>
            <p className="mt-3 text-white/75 leading-relaxed">
              {landing.quienesSomos.body}
            </p>
          </div>
        </section>

        {/* Galería + Noticias */}
        <section id="imagenes" className="mx-auto max-w-6xl px-4 pb-16">
          <div className="grid grid-cols-1 gap-6">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="flex items-end justify-between gap-3">
                <h2 className="text-2xl font-black tracking-tight">Galucho en imagenes</h2>
                <span className="text-xs text-white/60">
                  Gestionable desde el panel
                </span>
              </div>

              {(landing.galeria || []).length === 0 ? (
                <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-6 text-sm text-white/70">
                  Aún no hay imágenes. Súbelas desde el panel (LandingPage).
                </div>
              ) : (
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {(landing.galeria || []).slice(0, 12).map((img, idx) => (
                    <div key={idx} className="rounded-2xl overflow-hidden border border-white/10 bg-black/30">
                      <img
                        src={img.url}
                        alt={img.alt || `Imagen ${idx + 1}`}
                        className="h-40 w-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="flex items-end justify-between gap-3">
                <h2 className="text-2xl font-black tracking-tight">Noticias</h2>
                <span className="text-xs text-white/60">Actualizaciones</span>
              </div>

              {(landing.noticias || []).length === 0 ? (
                <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-6 text-sm text-white/70">
                  Aún no hay noticias. Agrégalas desde el panel (LandingPage).
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {(landing.noticias || []).slice(0, 6).map((n, idx) => (
                    <div key={idx} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="text-sm font-extrabold">{n.title}</div>
                      {n.date && <div className="mt-1 text-xs text-white/60">{n.date}</div>}
                      {n.body && <div className="mt-2 text-sm text-white/75 leading-relaxed">{n.body}</div>}
                      {n.imageUrl && (
                        <div className="mt-3 rounded-xl overflow-hidden border border-white/10">
                          <img src={n.imageUrl} alt={n.title} className="w-full h-44 object-cover" loading="lazy" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div id="contacto" className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-2xl font-black tracking-tight">Contacto Directo Whatsapp</h2>
              <p className="mt-2 text-sm text-white/70">
                {landing.contacto.nombre ? `${landing.contacto.nombre} · ` : ''}
                {landing.contacto.ciudad}
              </p>

              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="text-xs text-white/60">Teléfono</div>
                  <div className="mt-1 font-bold">{landing.contacto.telefono || '—'}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="text-xs text-white/60">WhatsApp</div>
                  <div className="mt-1 font-bold">{landing.contacto.whatsapp || (config?.whatsappNumber || '—')}</div>
                </div>
              </div>

              <div className="mt-5 flex flex-col sm:flex-row gap-3">
                <Link
                  href="/catalog"
                  className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-white text-black font-bold text-sm text-center hover:bg-white/90 transition"
                >
                  Ir al Catálogo 2025
                </Link>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    const num = (landing.contacto.whatsapp || config?.whatsappNumber || '').toString().replace(/[^\d+]/g, '');
                    if (!num) return;
                    const msg = encodeURIComponent('Hola! Quiero consultar por Cuchillos Galucho.');
                    window.open(`https://wa.me/${num}?text=${msg}`, '_blank');
                  }}
                  className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-emerald-500/90 text-black font-bold text-sm text-center hover:bg-emerald-400 transition"
                >
                  Abrir WhatsApp
                </a>
              </div>
            </div>
          </div>
        </section>

        <footer className="border-t border-white/10 bg-black/30">
          <div className="mx-auto max-w-6xl px-4 py-8 text-xs text-white/60">
            <div className="flex items-center justify-between gap-3">
              <span>© {new Date().getFullYear()} {landing.brandName}</span>
              <span className="text-white/40">Landing moderna · Mobile-first</span>
            </div>
          </div>
        </footer>
      </div>
      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </>
  );
}



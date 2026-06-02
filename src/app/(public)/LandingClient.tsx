"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useScroll,
  useSpring,
} from "framer-motion";
import styles from "./landing.module.css";

interface LandingClientProps {
  sections: Record<string, Record<string, unknown>>;
  siteConfig: Record<string, string>;
  featuredProducts: Array<{ id: string; name: string; slug: string; category: string; description: string | null }>;
  testimonials: Array<{ id: string; name: string; content: string; mediaUrl: string | null; mediaType: string | null }>;
  recentPosts: Array<{ id: string; title: string; slug: string; excerpt: string | null; coverImageUrl: string | null; publishedAt: Date | null }>;
}

const A = "/landing-assets";

interface HoneyItem {
  name: string;
  slug: string;
  badge: string;
  badgeIcon: string;
  img: string;
  desc: string;
  tags: string[];
  price: string;
}

interface GalleryItem {
  img: string;
  title: string;
}

interface TestimonialItem {
  quote: string;
  mediaUrl?: string | null;
  mediaType?: string | null;
}

const defaultHoneyProducts: HoneyItem[] = [
  {
    name: "Tulsi Honey",
    slug: "tulsi-honey",
    badge: "Herbal",
    badgeIcon: "eco",
    img: `${A}/images/highres/tulsi-honey.jpeg`,
    desc: "Sourced from sacred Tulsi blossoms. Distinct herbal notes with powerful immunity-boosting properties.",
    tags: ["100% Natural", "Lab Tested", "Raw"],
    price: "₹499",
  },
  {
    name: "Karanj Honey",
    slug: "karanj-honey",
    badge: "Earthy",
    badgeIcon: "forest",
    img: `${A}/images/highres/karang-honey.jpeg`,
    desc: "A unique earthy profile harvested from the Karanj tree. Rare, deeply aromatic, and nutrient-rich.",
    tags: ["No Added Sugar", "Mono Floral"],
    price: "₹549",
  },
  {
    name: "Moringa Honey",
    slug: "moringa-honey",
    badge: "Superfood",
    badgeIcon: "auto_awesome",
    img: `${A}/images/highres/moringa-honey.jpeg`,
    desc: "Rich and robust, collected from the Miracle Tree blossoms. Nature's most potent and nourishing honey.",
    tags: ["Raw", "Unprocessed"],
    price: "₹599",
  },
];

const defaultPromiseCards = [
  { icon: "verified_user", title: "100% Authentic", body: "Directly sourced from trusted traditional beekeepers in untouched natural habitats. No intermediaries, no adulteration." },
  { icon: "spa", title: "Ethically Sourced", body: "Supporting sustainable harvesting that protects local farmers, communities, and bee populations across India's heartland." },
  { icon: "science", title: "Lab Tested", body: "Every batch is verified in certified laboratories to guarantee purity and superior nutritional value." },
];

const defaultFaqs = [
  { question: "Why does my honey look crystallized or solid?", answer: "Crystallization is completely natural and a sign of pure, raw honey. Real honey contains natural sugars that crystallize over time. To soften it, place the jar in warm water for a few minutes." },
  { question: "What does Mono-Floral mean?", answer: "Mono-floral means bees primarily collected nectar from one specific flower such as Tulsi, Karanj, or Moringa. Each honey keeps its own natural taste profile without artificial additions." },
  { question: "What is Bilona Ghee?", answer: "Bilona is the traditional Indian method of making ghee. A2 milk becomes curd, the curd is wooden-churned into butter, and the butter is slow-heated into rich ghee." },
  { question: "Can I get a free sample before ordering?", answer: "Yes. APRAS Naturals offers free samples to selected customers. Use the sample request path and the team will contact you to arrange delivery." },
];

const defaultGallery: GalleryItem[] = [
  { img: `${A}/images/fair.jpeg`, title: "Connecting with customers at local fairs across Jharkhand." },
  { img: `${A}/images/exhibition.jpeg`, title: "Showcasing our full range at regional exhibitions." },
  { img: `${A}/images/recognition.jpeg`, title: "Honoured by VIP recognition at a state-level exhibition." },
];

const defaultTestimonials: TestimonialItem[] = [
  { quote: "The difference in taste is absolutely unbelievable." },
  { quote: "Finally, Ghee that reminds me of home — made the right way." },
  { quote: "My kids love the Karanj honey. Pure, real taste." },
];

const defaultGheeImages = [
  `${A}/images/ghee-group.jpeg`,
  `${A}/images/highres/ghee.jpeg`,
  `${A}/images/highres/ghee-detail.jpeg`,
];

function str(config: Record<string, unknown> | undefined, key: string, fallback: string): string {
  const value = config?.[key];
  return typeof value === "string" && value.trim() ? value : fallback;
}

function stringList(config: Record<string, unknown> | undefined, key: string, fallback: string[]): string[] {
  const value = config?.[key];
  if (!Array.isArray(value)) return fallback;
  const items = value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  return items.length > 0 ? items : fallback;
}

function objectList<T>(config: Record<string, unknown> | undefined, key: string, fallback: T[]): T[] {
  const value = config?.[key];
  return Array.isArray(value) && value.length > 0 ? value as T[] : fallback;
}

const easeOut = [0.16, 1, 0.3, 1] as const;

const revealInitial = { opacity: 0, y: 36, scale: 0.98 };
const revealInView = { opacity: 1, y: 0, scale: 1 };
const revealViewport = { once: true, amount: 0.12, margin: "0px 0px -70px 0px" };

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  style?: React.CSSProperties;
}

function revealTransition(delay = 0) {
  return { duration: 0.72, ease: easeOut, delay };
}

function Reveal({ children, className, delay = 0, style }: RevealProps) {
  return (
    <motion.div
      className={className}
      style={style}
      initial={revealInitial}
      whileInView={revealInView}
      viewport={revealViewport}
      transition={revealTransition(delay)}
    >
      {children}
    </motion.div>
  );
}

function RevealArticle({ children, className, delay = 0, style }: RevealProps) {
  return (
    <motion.article
      className={className}
      style={style}
      initial={revealInitial}
      whileInView={revealInView}
      viewport={revealViewport}
      transition={revealTransition(delay)}
    >
      {children}
    </motion.article>
  );
}

export default function LandingClient({ sections, siteConfig, featuredProducts, testimonials, recentPosts }: LandingClientProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [formSent, setFormSent] = useState(false);
  const [inHero, setInHero] = useState(true);
  const [heroTextVisible, setHeroTextVisible] = useState(false);
  const cinemaRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoDurationRef = useRef<number>(0);

  const { scrollYProgress } = useScroll();
  const pageProgressScale = useSpring(scrollYProgress, { stiffness: 120, damping: 24, mass: 0.35 });
  const cinemaProgress = useMotionValue(0);
  const cinemaTimelineScale = useSpring(cinemaProgress, { stiffness: 140, damping: 28, mass: 0.3 });

  const hero = sections.hero ?? {};
  const marquee = sections.marquee ?? {};
  const promise = sections.promise ?? {};
  const sample = sections.sample ?? {};
  const purity = sections.purity ?? {};
  const productsSection = sections.products ?? {};
  const ghee = sections.ghee ?? {};
  const gallerySection = sections.gallery ?? {};
  const leadership = sections.leadership ?? {};
  const testimonialsSection = sections.testimonials ?? {};
  const howItWorks = sections.how_it_works ?? {};
  const faqSection = sections.faq ?? {};
  const contact = sections.contact ?? {};
  const sitePhone = siteConfig.site_phone || "+919470309006";
  const siteEmail = siteConfig.site_email || "aprasnaturals@gmail.com";
  const siteLogoUrl = siteConfig.site_logo_url || "";
  const siteName = siteConfig.site_name || "APRAS Naturals";
  const productLinks = useMemo(() => new Map(featuredProducts.map((p) => [p.slug, `/shop/${p.slug}`])), [featuredProducts]);
  const heroVideoUrl = str(hero, "videoUrl", `${A}/videos/APRUS.mp4`);
  const honeyItems = objectList<HoneyItem>(productsSection, "items", defaultHoneyProducts);
  const promiseItems = objectList(promise, "cards", defaultPromiseCards);
  const gheeImages = stringList(ghee, "images", defaultGheeImages).slice(0, 3);
  const galleryItems = objectList<GalleryItem>(gallerySection, "items", defaultGallery);
  const testimonialItems = objectList<TestimonialItem>(
    testimonialsSection,
    "items",
    testimonials.length > 0
      ? testimonials.map((item) => ({ quote: item.content, mediaUrl: item.mediaUrl, mediaType: item.mediaType }))
      : defaultTestimonials,
  );
  const faqItems = objectList(faqSection, "items", defaultFaqs);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const cinema = cinemaRef.current;
        const video = videoRef.current;
        if (!cinema) {
          setInHero(true);
          cinemaProgress.set(0);
          return;
        }

        const distance = Math.max(1, cinema.offsetHeight - window.innerHeight);
        const latest = Math.max(0, Math.min(1, (window.scrollY - cinema.offsetTop) / distance));
        cinemaProgress.set(latest);
        setInHero(cinema.getBoundingClientRect().bottom > 96);

        const dur = videoDurationRef.current;
        const hideThreshold = dur > 0 ? 2 / dur : 0.06;
        setHeroTextVisible(latest < hideThreshold);

        if (video && video.readyState >= 2 && isFinite(video.duration)) {
          try {
            video.pause();
            video.currentTime = latest * video.duration;
          } catch {}
        }
      });
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    const timer = window.setTimeout(update, 1000);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [cinemaProgress]);

  useEffect(() => {
    const video = videoRef.current;
    const cinema = cinemaRef.current;
    if (!video || !cinema) return;

    const sizeCinema = () => {
      const dur = isFinite(video.duration) && video.duration > 0 ? video.duration : 30;
      const perSec = window.innerWidth < 720 ? 50 : 65;
      cinema.style.height = `${Math.max(400, Math.min(700, Math.round(dur * perSec)))}vh`;
    };

    const onResize = () => sizeCinema();
    const onMetadata = () => {
      if (isFinite(video.duration) && video.duration > 0) {
        videoDurationRef.current = video.duration;
      }
      sizeCinema();
      try {
        const distance = Math.max(1, cinema.offsetHeight - window.innerHeight);
        const latest = Math.max(0, Math.min(1, (window.scrollY - cinema.offsetTop) / distance));
        cinemaProgress.set(latest);
        video.pause();
        video.currentTime = latest * video.duration;
      } catch {}
    };
    const onPlay = () => video.pause();
    video.addEventListener("loadedmetadata", onMetadata);
    video.addEventListener("canplay", onResize);
    video.addEventListener("play", onPlay);
    window.addEventListener("resize", onResize);
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.autoplay = false;
    video.pause();
    window.setTimeout(sizeCinema, 900);

    return () => {
      video.removeEventListener("loadedmetadata", onMetadata);
      video.removeEventListener("canplay", onResize);
      video.removeEventListener("play", onPlay);
      window.removeEventListener("resize", onResize);
    };
  }, [cinemaProgress]);

  useEffect(() => { setHeroTextVisible(true); }, []);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  function navTo(id: string) {
    setDrawerOpen(false);
    const target = document.querySelector(id);
    if (!target) return;
    window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 76, behavior: "smooth" });
  }

  function submitInquiry(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormSent(true);
  }

  return (
    <div className={styles.landing}>
      <motion.div className={styles.scrollProgress} style={{ scaleX: pageProgressScale }} />

      <nav className={`${styles.nav} ${inHero ? styles.heroNav : styles.scrolled}`}>
        <div className={styles.navLeft}>
          <button className={styles.menuToggle} aria-label="Open menu" onClick={() => setDrawerOpen(true)}>
            <span className="material-icons">menu</span>
          </button>
          <button className={styles.navLogo} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            {siteLogoUrl ? (
              <img src={siteLogoUrl} alt={siteName} className={styles.navLogoImage} />
            ) : (
              <>
                <span className={styles.navLogoIcon}><span className="material-icons">spa</span></span>
                <span>APRAS <span>Naturals</span></span>
              </>
            )}
          </button>
        </div>
        <div className={styles.navLinks}>
          <button onClick={() => navTo("#promise")}>Our Promise</button>
          <button onClick={() => navTo("#honey")}>Honey</button>
          <button onClick={() => navTo("#ghee")}>A2 Ghee</button>
          <button onClick={() => navTo("#gallery")}>Community</button>
          <Link href="/shop" className={styles.navPageLink}>Shop</Link>
          <Link href="/blog" className={styles.navPageLink}>Blog</Link>
        </div>
        <div className={styles.navActions}>
          <Link href="/login" className={styles.navLoginBtn}>Login</Link>
          <button onClick={() => navTo("#contact")} className={styles.navCta}>Contact Us</button>
        </div>
      </nav>

      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              className={styles.drawerOverlay}
              onClick={() => setDrawerOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
            />
            <motion.aside
              className={styles.drawerMenu}
              initial={{ x: "-100%", opacity: 0.96 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "-100%", opacity: 0.96 }}
              transition={{ duration: 0.34, ease: easeOut }}
            >
              <div className={styles.drawerHeader}>
                <span className={styles.navLogo}>
                  {siteLogoUrl ? (
                    <img src={siteLogoUrl} alt={siteName} className={styles.navLogoImage} />
                  ) : (
                    <>
                      <span className={styles.navLogoIcon}><span className="material-icons">spa</span></span>
                      <span>APRAS <span>Naturals</span></span>
                    </>
                  )}
                </span>
                <button className={styles.drawerClose} aria-label="Close menu" onClick={() => setDrawerOpen(false)}>
                  <span className="material-icons">close</span>
                </button>
              </div>
              <div className={styles.drawerLinks}>
                <button onClick={() => navTo("#promise")}>Our Promise</button>
                <button onClick={() => navTo("#honey")}>Honey Collection</button>
                <button onClick={() => navTo("#ghee")}>A2 Bilona Ghee</button>
                <button onClick={() => navTo("#gallery")}>Community</button>
                <Link href="/shop" className={styles.drawerPageLink}>Shop</Link>
                <Link href="/blog" className={styles.drawerPageLink}>Blog</Link>
                <Link href="/login" className={styles.drawerLoginBtn}>Login</Link>
                <button onClick={() => navTo("#contact")} className={styles.drawerCta}>Contact Us</button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <section className={styles.cinemaWrap} ref={cinemaRef}>
        <div className={styles.cinemaStage}>
          <video
            ref={videoRef}
            className={styles.cinemaVideo}
            src={heroVideoUrl}
            muted
            playsInline
            autoPlay={false}
            controls={false}
            preload="auto"
            aria-hidden="true"
          />

          <AnimatePresence>
            {heroTextVisible && (
              <motion.div
                className={styles.heroTextOverlay}
                initial={{ opacity: 0, y: 18, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className={styles.heroTextBox}>
                  <span className={styles.heroTagline}>The Nature&apos;s Gold</span>
                  <p className={styles.heroHeading}>Born From<br />Nature&apos;s Finest</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className={styles.cinemaTimeline}><motion.div className={styles.cinemaTimelineFill} style={{ scaleX: cinemaTimelineScale }} /></div>
          <div className={styles.scrollCue}>Scroll to Explore <span className="material-icons">keyboard_arrow_down</span></div>
        </div>
      </section>

      <div className={styles.marqueeWrap} aria-hidden="true">
        <div className={styles.marqueeTrack}>
          {Array.from({ length: 2 }).flatMap((_, loop) => stringList(marquee, "items", [
            "PURE RAW HONEY", "100% AUTHENTIC", "LAB TESTED PURITY", "NO ADDED SUGAR",
            "MONO FLORAL SOURCED", "A2 BILONA GHEE", "AUTHORIZED BY PRAKVEDAA", "JHARKHAND INDIA",
          ]).map((text, i) => <React.Fragment key={`${loop}-${text}-${i}`}>{text}<span className={styles.marqueeDot}>✦</span></React.Fragment>))}
        </div>
      </div>

      <section className={`${styles.section} ${styles.promiseSection}`} id="promise">
        <div className={styles.container}>
          <Reveal style={{ maxWidth: 680 }}>
            <p className={styles.eyebrow}>{str(promise, "eyebrow", "The APRAS Promise")}</p>
            <h2 className={styles.sectionTitle}>{str(promise, "heading", "Authorized Partner of")} <em>{str(promise, "accent", "Prakvedaa")}</em></h2>
            <p className={styles.sectionLead}>{str(promise, "lead", "At APRAS Naturals, every jar is sourced ethically, prepared traditionally, and delivered with zero compromise.")}</p>
          </Reveal>
          <div className={styles.promiseGrid}>
            {promiseItems.map(({ icon, title, body }, i) => (
              <RevealArticle key={title} className={styles.promiseCard} delay={(i + 1) * 0.1}>
                <div className={styles.promiseIcon}><span className="material-icons">{icon}</span></div>
                <h3>{title}</h3>
                <p>{body}</p>
              </RevealArticle>
            ))}
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.sampleBanner}`}>
        <div className={styles.container}>
          <Reveal className={styles.sampleInner}>
            <p className={styles.eyebrow}>{str(sample, "eyebrow", "Limited Offer")}</p>
            <h2 className={styles.sectionTitle}>{str(sample, "heading", "Try Before You")} <em>{str(sample, "accent", "Trust")}</em></h2>
            <p className={styles.sectionLead}>{str(sample, "lead", "We believe real purity speaks for itself. That's why we offer free samples to select customers.")}</p>
            <div className={styles.sampleBox}>
              <div className={styles.sampleIcon}>🍯</div>
              <div>
                <h3>{str(sample, "boxTitle", "Free Sample Program")}</h3>
                <p>{str(sample, "boxText", "Selected customers receive a complimentary sample of our mono-floral honey. Start with a sample request and we will confirm availability.")}</p>
              </div>
            </div>
            <button type="button" onClick={() => navTo("#contact")} className={styles.sampleCta}><span className="material-icons">redeem</span>{str(sample, "buttonLabel", "Request Free Sample")}</button>
          </Reveal>
        </div>
      </section>

      <section className={`${styles.section} ${styles.puritySection}`}>
        <div className={styles.container}>
          <Reveal className={styles.purityInner}>
            <div className={`${styles.purityImgWrap} ${styles.premiumFrame}`}>
              <img src={str(purity, "imageUrl", `${A}/images/highres/honey-honey.jpeg`)} alt={str(purity, "imageAlt", "Raw mono-floral honey jar")} loading="lazy" />
            </div>
            <div>
              <p className={styles.eyebrow}>{str(purity, "eyebrow", "Not All Honey is Real")}</p>
              <h2 className={styles.sectionTitle}>{str(purity, "heading", "Prakvedaa is the")} <em>{str(purity, "accent", "real one.")}</em></h2>
              <p className={styles.sectionLead}>{str(purity, "lead", "Mono Floral · Raw · Completely Uncompromised")}</p>
              <ul className={styles.purityList}>
                {objectList(purity, "items", [
                  { icon: "close", title: "We Don't Sell", body: "Sugar syrup, flavoured blends, artificial colours, or infused shortcuts." },
                  { icon: "check", title: "What We Offer", body: "Pure mono-floral honey from natural nectar. Not infused. Not heated." },
                  { icon: "info", title: "The Mark of Purity", body: "Real honey crystallizes. If it never does, question it." },
                ]).map((item) => (
                  <li key={item.title}><span><span className="material-icons">{item.icon}</span></span><div><strong>{item.title}</strong><small>{item.body}</small></div></li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </section>

      <section className={`${styles.section} ${styles.honeySection}`} id="honey">
        <div className={styles.container}>
          <Reveal style={{ maxWidth: 600 }}>
            <p className={styles.eyebrow}>{str(productsSection, "eyebrow", "Our Collection")}</p>
            <h2 className={styles.sectionTitle}>{str(productsSection, "heading", "Pure Mono-Floral Honey")}</h2>
            <p className={styles.sectionLead}>{str(productsSection, "lead", "Raw, single-source honeys carefully harvested from nature's finest blossoms. Available in 500g and 1kg.")}</p>
          </Reveal>
          <div className={styles.honeyGrid}>
            {honeyItems.map((product, i) => (
              <RevealArticle key={product.slug} className={styles.honeyCard} delay={(i + 1) * 0.1}>
                <div className={styles.honeyImgBox}>
                  <img src={product.img} alt={product.name} loading="lazy" />
                  <div className={styles.honeyImgGlow} />
                </div>
                <div className={styles.honeyBody}>
                  <div className={styles.honeyBadge}><span className="material-icons">{product.badgeIcon}</span>{product.badge}</div>
                  <h3>{product.name}</h3>
                  <p>{product.desc}</p>
                  <div className={styles.honeyTags}>{product.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
                  <div className={styles.honeyPriceRow}>
                    <div className={styles.honeyPrice}>From <strong>{product.price}</strong><span>/ 500g</span></div>
                    <Link href={productLinks.get(product.slug) || `/shop/${product.slug}`} className={styles.honeyOrderBtn}>Order <span className="material-icons">arrow_forward</span></Link>
                  </div>
                </div>
              </RevealArticle>
            ))}
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.gheeSection}`} id="ghee">
        <div className={styles.container}>
          <div className={styles.gheeInner}>
            <Reveal>
              <p className={`${styles.eyebrow} ${styles.gheeEyebrow}`}>{str(ghee, "eyebrow", "Crafted the Old Way")}</p>
              <h2 className={`${styles.sectionTitle} ${styles.gheeTitle}`}>{str(ghee, "heading", "Prakvedaa A2")}<br />{str(ghee, "headingLine2", "Bilona Ghee")}</h2>
              <p className={styles.gheeSubtitle}>{str(ghee, "subtitle", "This is Ghee — Not Factory Fat.")}</p>
              <p className={styles.gheeDesc}>{str(ghee, "description", "Made from the milk of indigenous Kankrej cows using the ancient Bilona method. Curd → Hand Churned → Slow Heated. No shortcuts.")}</p>
              <Reveal className={styles.gheeDiff} delay={0.2}>
                <h4>{str(ghee, "differenceHeading", "Why it's different")}</h4>
                {stringList(ghee, "differences", ["A2 Milk from Indigenous Kankrej Cows", "Authentic Bilona Method, Not Cream-Based", "Wooden-Churned in Small Batches", "Zero Chemicals. Zero Shortcuts."]).map((item) => (
                  <div key={item} className={styles.gheeDiffItem}><span><span className="material-icons">done</span></span>{item}</div>
                ))}
              </Reveal>
            </Reveal>
            <Reveal className={styles.gheeImgs} delay={0.2}>
              {gheeImages.map((imageUrl, index) => (
                <div key={imageUrl}><img src={imageUrl} alt={`A2 Bilona Ghee ${index + 1}`} loading="lazy" /></div>
              ))}
            </Reveal>
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.gallerySection}`} id="gallery">
        <div className={styles.container}>
          <Reveal style={{ maxWidth: 600 }}>
            <p className={styles.eyebrow}>{str(gallerySection, "eyebrow", "Our Community")}</p>
            <h2 className={styles.sectionTitle}>{str(gallerySection, "heading", "APRAS in the Field")}</h2>
            <p className={styles.sectionLead}>{str(gallerySection, "lead", "Connecting directly with customers at exhibitions, fairs, and community events across India.")}</p>
          </Reveal>
          <div className={styles.galleryGrid}>
            {galleryItems.map((item, i) => (
              <RevealArticle key={item.img} className={styles.galleryCard} delay={(i + 1) * 0.1}>
                <img src={item.img} alt={item.title} loading="lazy" />
                <div className={styles.galleryOverlay}><p>{item.title}</p></div>
                <div className={styles.galleryFrame} />
              </RevealArticle>
            ))}
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.leadershipSection}`}>
        <div className={styles.container}>
          <Reveal className={styles.leadershipInner}>
            <div className={styles.leadershipBadge}><span className="material-icons">workspace_premium</span>{str(leadership, "eyebrow", "Government Recognition")}</div>
            <h2>{str(leadership, "heading", "Honoured by")} <em>{str(leadership, "accent", "Leadership")}</em></h2>
            <p>{str(leadership, "body", "We were privileged to welcome the Health Minister of Jharkhand to our stall. His appreciation strengthens our resolve to bring pure natural products to every Indian home.")}</p>
          </Reveal>
        </div>
      </section>

      <section className={`${styles.section} ${styles.testiSection}`}>
        <div className={styles.container}>
          <Reveal style={{ maxWidth: 600 }}>
            <p className={styles.eyebrow}>{str(testimonialsSection, "eyebrow", "Testimonials")}</p>
            <h2 className={styles.sectionTitle}>{str(testimonialsSection, "heading", "Customer Stories")}</h2>
            <p className={styles.sectionLead}>{str(testimonialsSection, "lead", "Hear from those who have made the switch to real, authentic honey and ghee.")}</p>
          </Reveal>
          <div className={styles.testiGrid}>
            {testimonialItems.map((item, i) => (
              <RevealArticle key={`${item.quote}-${i}`} className={styles.testiCard} delay={(i + 1) * 0.1}>
                {item.mediaUrl ? (
                  item.mediaType === "video" || item.mediaUrl.match(/\.(mp4|webm)$/i) ? (
                    <video src={item.mediaUrl} muted playsInline controls className={styles.testiMedia} />
                  ) : (
                    <img src={item.mediaUrl} alt={item.quote} className={styles.testiMedia} loading="lazy" />
                  )
                ) : (
                  <div className={styles.testiPlay}><span className="material-icons">play_arrow</span></div>
                )}
                <div className={styles.testiLabel}><p>&quot;{item.quote}&quot;</p></div>
              </RevealArticle>
            ))}
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.hiwSection}`}>
        <div className={styles.container}>
          <Reveal style={{ textAlign: "center", maxWidth: 600, margin: "0 auto" }}>
            <p className={styles.eyebrow}>{str(howItWorks, "eyebrow", "Purchase Process")}</p>
            <h2 className={styles.sectionTitle}>{str(howItWorks, "heading", "Simple as Nature Intended")}</h2>
            <p className={styles.sectionLead}>{str(howItWorks, "lead", "Three steps from curiosity to your first spoonful of pure honey.")}</p>
          </Reveal>
          <div className={styles.hiwGrid}>
            <div className={styles.hiwConnector} />
            {objectList(howItWorks, "steps", [
              { num: "1", title: "Browse Collection", body: "Choose from mono-floral honey, A2 Bilona Ghee, or request a free sample." },
              { num: "2", title: "Easy Payment", body: "Pay via UPI/QR and upload payment proof for quick verification." },
              { num: "3", title: "Fast Delivery", body: "We confirm and ship to your doorstep. Fresh, sealed, and certified pure." },
            ]).map(({ num, title, body }, i) => (
              <RevealArticle key={num} className={styles.hiwStep} delay={(i + 1) * 0.1}>
                <div>{num}</div>
                <h3>{title}</h3>
                <p>{body}</p>
              </RevealArticle>
            ))}
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.missionSection}`}>
        <div className={styles.container}>
          <Reveal className={styles.missionInner}>
            <blockquote>{(sections.mission?.quote as string) || "To reconnect people with the pure, untampered gifts of nature, championing traditional methods and authentic sourcing to bring uncompromising wellness to every table."}</blockquote>
            <p>— {str(sections.mission, "attribution", "APRAS Naturals Mission")}</p>
          </Reveal>
        </div>
      </section>

      <section className={`${styles.section} ${styles.faqSection}`}>
        <div className={styles.container}>
          <Reveal style={{ textAlign: "center", maxWidth: 600, margin: "0 auto" }}>
            <p className={styles.eyebrow}>{str(faqSection, "eyebrow", "Got Questions?")}</p>
            <h2 className={styles.sectionTitle}>{str(faqSection, "heading", "Frequently Asked")}</h2>
          </Reveal>
          <div className={styles.faqList}>
            {faqItems.map(({ question, answer }, i) => (
              <RevealArticle key={question} className={`${styles.faqItem} ${openFaq === i ? styles.open : ""}`} delay={i * 0.06}>
                <button className={styles.faqQ} onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  <span><span className="material-icons">add</span></span>
                  {question}
                </button>
                <div className={styles.faqA}><p>{answer}</p></div>
              </RevealArticle>
            ))}
          </div>
        </div>
      </section>

      {recentPosts.length > 0 && (
        <section className={`${styles.section} ${styles.journalSection}`}>
          <div className={styles.container}>
            <Reveal style={{ maxWidth: 600 }}>
              <p className={styles.eyebrow}>Journal</p>
              <h2 className={styles.sectionTitle}>Stories of Purity</h2>
            </Reveal>
            <div className={styles.journalGrid}>
              {recentPosts.slice(0, 3).map((post, i) => (
                <Reveal key={post.id} delay={(i + 1) * 0.1}>
                  <Link href={`/blog/${post.slug}`} className={styles.journalCard}>
                    <h3>{post.title}</h3>
                    {post.excerpt && <p>{post.excerpt}</p>}
                    <span>Read Story →</span>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className={`${styles.section} ${styles.orderSection}`} id="contact">
        <div className={styles.container}>
          <div className={styles.orderInner}>
            <Reveal>
              <p className={styles.eyebrow}>{str(contact, "eyebrow", "Contact Us")}</p>
              <h2 className={styles.sectionTitle}>{str(contact, "heading", "Talk to APRAS Naturals")}</h2>
              <p className={styles.sectionLead}>{str(contact, "lead", "For samples, product questions, partnership enquiries, or support, send us a message and we will respond within 24 hours.")}</p>
            </Reveal>
            <motion.form
              className={styles.orderForm}
              onSubmit={submitInquiry}
              initial={revealInitial}
              whileInView={revealInView}
              viewport={revealViewport}
              transition={revealTransition(0.2)}
            >
              <div className={styles.formRow}>
                <label>First Name<input name="firstName" placeholder="e.g. Rahul" /></label>
                <label>Last Name<input name="lastName" placeholder="e.g. Sharma" /></label>
              </div>
              <label>Phone / WhatsApp<input name="phone" placeholder="+91 XXXXX XXXXX" /></label>
              <label>Enquiry Type
                <select name="enquiryType" defaultValue="General product enquiry">
                  {stringList(contact, "enquiryOptions", [
                    "General product enquiry",
                    "Honey product enquiry",
                    "A2 Bilona Ghee enquiry",
                    "Sample request",
                    "Bulk / wholesale enquiry",
                    "Partnership / distribution enquiry",
                    "Order or delivery support",
                  ]).map((option) => <option key={option}>{option}</option>)}
                </select>
              </label>
              <label>Message<textarea name="message" rows={3} placeholder="Tell us what you need help with." /></label>
              <button type="submit">{formSent ? "Enquiry Received" : "Send Enquiry →"}</button>
              <p>For immediate queries: <a href={`https://wa.me/${sitePhone.replace(/\D/g, "")}`}>WhatsApp {sitePhone}</a></p>
            </motion.form>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerCta}>
          <div>
            <span>Pure naturals, direct from APRAS</span>
            <h2>Need help choosing honey or A2 ghee?</h2>
            <p>Talk to the APRAS team for samples, wholesale enquiries, partnership questions, or product guidance.</p>
          </div>
          <button type="button" onClick={() => navTo("#contact")}>Contact Us</button>
        </div>
        <div className={styles.footerInner}>
          <div>
            <button className={styles.footerLogo} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
              <span className={styles.footerLogoIcon}><span className="material-icons">spa</span></span>
              APRAS Naturals
            </button>
            <p>Authorized partner and CNF of Prakvedaa. Bringing pure, authentic natural products from India&apos;s heartland to your table.</p>
            <div className={styles.footerTrust}>
              <span>Lab tested</span>
              <span>Raw honey</span>
              <span>Bilona ghee</span>
            </div>
          </div>
          <div>
            <h3>Navigation</h3>
            <div className={styles.footerLinks}>
              <button onClick={() => navTo("#promise")}>Our Promise</button>
              <button onClick={() => navTo("#honey")}>Honey Collection</button>
              <button onClick={() => navTo("#ghee")}>A2 Bilona Ghee</button>
              <button onClick={() => navTo("#gallery")}>Community</button>
              <button onClick={() => navTo("#contact")}>Contact Us</button>
            </div>
          </div>
          <div>
            <h3>Contact</h3>
            <p><a href={`mailto:${siteEmail}`}>{siteEmail}</a></p>
            <p><a href={`tel:${sitePhone}`}>{sitePhone}</a></p>
            <p>Ranchi – 834005</p>
            <p>Jharkhand, India</p>
          </div>
        </div>
        <div className={styles.footerBottom}>
          <p>© 2026 APRAS Naturals. All rights reserved.</p>
          <div><span className="material-icons">verified</span>Authorized Prakvedaa Partner</div>
        </div>
      </footer>
    </div>
  );
}

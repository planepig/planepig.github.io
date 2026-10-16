import type { Metadata } from "next";
import "./globals.css";
import Navigation from "@/components/layout/Navigation";
import Footer from "@/components/layout/Footer";
import { ThemeProvider } from "@/components/ui/ThemeProvider";
import { getConfig, type SiteConfig } from "@/lib/config";

function getSiteUrl(url?: string) {
  return (url || "http://localhost:3000").replace(/\/+$/, "");
}

function getSiteTitle(config: SiteConfig) {
  const role = [config.author.title, config.author.institution].filter(Boolean).join(" at ");
  return [config.author.name, role].filter(Boolean).join(" | ");
}

function getBuildDate() {
  return new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
  });
}

export async function generateMetadata(): Promise<Metadata> {
  const config = getConfig();
  const siteUrl = getSiteUrl(config.site.url);
  const title = getSiteTitle(config);

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: title,
      template: `%s | ${config.author.name}`
    },
    description: config.site.description,
    keywords: [config.author.name, config.author.title, config.author.institution].filter(Boolean),
    authors: [{ name: config.author.name }],
    creator: config.author.name,
    publisher: config.author.name,
    alternates: {
      canonical: "/",
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    icons: {
      icon: config.site.favicon,
    },
    openGraph: {
      type: "website",
      locale: "en_US",
      url: siteUrl,
      title,
      description: config.site.description,
      siteName: `${config.author.name}'s Academic Website`,
      images: [
        {
          url: config.author.avatar,
          width: 512,
          height: 512,
          alt: config.author.name,
        },
      ],
    },
    twitter: {
      card: "summary",
      title,
      description: config.site.description,
      images: [config.author.avatar],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const config = getConfig();
  const siteUrl = getSiteUrl(config.site.url);
  const buildDate = getBuildDate();
  const personJsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: config.author.name,
    url: siteUrl,
    image: `${siteUrl}${config.author.avatar}`,
    jobTitle: config.author.title || undefined,
    affiliation: config.author.institution ? {
      "@type": "Organization",
      name: config.author.institution,
    } : undefined,
    email: config.social.email ? `mailto:${config.social.email}` : undefined,
    address: config.social.location,
    sameAs: [
      config.social.google_scholar,
      config.social.github,
      config.social.linkedin,
    ].filter(Boolean),
  };

  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <head>
        <link rel="icon" href={config.site.favicon} />
        {/* Speed up font connections */}
        <link rel="dns-prefetch" href="https://google-fonts.jialeliu.com" />
        <link rel="preconnect" href="https://google-fonts.jialeliu.com" crossOrigin="" />
        {/* Non-blocking Google Fonts: preload + print media swap to avoid render-blocking */}
        <link
          rel="preload"
          as="style"
          href="https://google-fonts.jialeliu.com/css2?family=Inter:wght@300;400;500;600;700&family=Crimson+Text:ital,wght@0,400;0,600;1,400&display=swap"
        />
        <link
          rel="stylesheet"
          id="gfonts-css"
          href="https://google-fonts.jialeliu.com/css2?family=Inter:wght@300;400;500;600;700&family=Crimson+Text:ital,wght@0,400;0,600;1,400&display=swap"
          media="print"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function(){
                var l = document.getElementById('gfonts-css');
                if (!l) return;
                if (l.media !== 'all') {
                  l.addEventListener('load', function(){ try { l.media = 'all'; } catch(e){} });
                }
              })();
            `,
          }}
        />
        <noscript>
          {/* Fallback for no-JS environments */}
          <link
            rel="stylesheet"
            href="https://google-fonts.jialeliu.com/css2?family=Inter:wght@300;400;500;600;700&family=Crimson+Text:ital,wght@0,400;0,600;1,400&display=swap"
          />
        </noscript>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('theme-storage');
                const parsed = theme ? JSON.parse(theme) : null;
                const setting = parsed?.state?.theme || 'system';
                const prefersDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                const effective = setting === 'dark' ? 'dark' : (setting === 'light' ? 'light' : (prefersDark ? 'dark' : 'light'));
                var root = document.documentElement;
                root.classList.add(effective);
                root.setAttribute('data-theme', effective);
              } catch (e) {
                var root = document.documentElement;
                root.classList.add('light');
                root.setAttribute('data-theme', 'light');
              }
            `,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
        />
      </head>
      <body className={`font-sans antialiased`}>
        <ThemeProvider>
          <Navigation
            items={config.navigation}
            siteTitle={config.site.title}
            enableOnePageMode={config.features.enable_one_page_mode}
          />
          <main className="min-h-screen pt-16 lg:pt-20">
            {children}
          </main>
          <Footer lastUpdated={buildDate} />
        </ThemeProvider>
      </body>
    </html>
  );
}

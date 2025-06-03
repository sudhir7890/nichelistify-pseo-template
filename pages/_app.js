// pages/_app.js
import '../styles/globals.css';
import Head from 'next/head';
import Script from 'next/script';

function MyApp({ Component, pageProps }) {
  // 1) AdSense Client ID (client-side)
  const ADSENSE_ID = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;

  // 2) Umami Website ID (client-side)
  const UMAMI_ID = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />

        {/* AdSense Script */}
        {ADSENSE_ID && (
          <script
            data-ad-client={ADSENSE_ID}
            async
            src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"
          ></script>
        )}
      </Head>

      {/* Umami Analytics Script */}
      {UMAMI_ID && (
        <Script
          src="https://stats.usty.me/umami.js"
          data-website-id={UMAMI_ID}
          async
          defer
        />
      )}

      <Component {...pageProps} />
    </>
  );
}

export default MyApp;

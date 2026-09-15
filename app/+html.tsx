import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

const SITE_URL = (process.env.EXPO_PUBLIC_SITE_URL || 'https://dichtbij3d.nl').replace(/\/$/, '');
const SOCIAL_IMAGE_URL = `${SITE_URL}/og-image.png`;
const SITE_TITLE = 'Dichtbij3D - 3D-printen dichtbij huis';
const SITE_DESCRIPTION = 'Hét platform voor 3D-print services, 3D-modellen en printopdrachten bij jou in de buurt. Vind makers of bied jouw 3D-printer aan.';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="nl">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        {/* Primary Meta Tags */}
        <title>{SITE_TITLE}</title>
        <meta name="title" content={SITE_TITLE} />
        <meta name="description" content={SITE_DESCRIPTION} />
        <meta name="theme-color" content="#F26514" />
        <meta name="msapplication-TileColor" content="#F26514" />

        {/* Open Graph / Facebook / WhatsApp / Teams / Snapchat / Discord */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Dichtbij3D" />
        <meta property="og:url" content={SITE_URL} />
        <meta property="og:title" content={SITE_TITLE} />
        <meta property="og:description" content={SITE_DESCRIPTION} />
        <meta property="og:image" content={SOCIAL_IMAGE_URL} />
        <meta property="og:image:secure_url" content={SOCIAL_IMAGE_URL} />
        <meta property="og:image:type" content="image/png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="Dichtbij3D - 3D-printen dichtbij huis" />
        <meta property="og:locale" content="nl_NL" />
        <meta property="og:locale:alternate" content="en_US" />

        {/* Twitter / Discord Embed Cards */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={SITE_URL} />
        <meta name="twitter:title" content={SITE_TITLE} />
        <meta name="twitter:description" content={SITE_DESCRIPTION} />
        <meta name="twitter:image" content={SOCIAL_IMAGE_URL} />
        <meta name="twitter:image:alt" content="Dichtbij3D - 3D-printen dichtbij huis" />

        {/* Links */}
        <link rel="canonical" href={SITE_URL} />
        <link rel="image_src" href={SOCIAL_IMAGE_URL} />
        <link rel="icon" type="image/png" href="/favicon.ico" />

        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}

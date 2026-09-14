import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="nl">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        <title>Dichtbij3D - 3D-printen dichtbij huis</title>
        <meta name="description" content="3D-printen dichtbij huis" />

        {/* Open Graph / Social Media Meta Tags */}
        <meta property="og:title" content="Dichtbij3D" />
        <meta property="og:description" content="3D-printen dichtbij huis" />
        <meta property="og:image" content="/og-image.png" />
        <meta property="og:type" content="website" />
        
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Dichtbij3D" />
        <meta name="twitter:description" content="3D-printen dichtbij huis" />
        <meta name="twitter:image" content="/og-image.png" />

        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}

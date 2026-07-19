import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Calo — Asisten Diet',
    short_name: 'Calo',
    description: 'Catat kalori dengan chat seperti berbicara dengan teman.',
    start_url: '/today',
    display: 'standalone',
    background_color: '#f4f7fb',
    theme_color: '#2B6CB0',
    orientation: 'portrait',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
}

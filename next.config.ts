import type { NextConfig } from "next";
import crypto from 'crypto';

const nonce = (): string => {
  return crypto
  .createHash('sha256')
  .update(crypto.randomUUID())
  .digest('base64')
}
const cspHeader = `
  default-src 'self' https://firestore.googleapis.com;
  script-src 'self' https://identitytoolkit.googleapis.com https://apis.google.com https://apis.google.com/js/api.js https://nebc-online-platform-default-rtdb.firebaseio.com https://s-usc1a-nss-2046.firebaseio.com 'nonce-${nonce}' 'strict-dynamic' https: 'unsafe-inline';
  script-src-elem 'self' https://identitytoolkit.googleapis.com  https://apis.google.com https://apis.google.com/js/api.js https://nebc-online-platform-default-rtdb.firebaseio.com https://s-usc1a-nss-2046.firebaseio.com 'strict-dynamic' 'nonce-${nonce}';
  font-src 'self' https://the-ninth-nebc-online-platform.vercel.app; 
  style-src 'self' 'unsafe-inline';
  img-src 'self' https://lh3.googleusercontent.com data:; 
  connect-src 'self' https://securetoken.googleapis.com https://identitytoolkit.googleapis.com https://firestore.googleapis.com wss://s-usc1a-nss-2046.firebaseio.com https://apis.google.com;
  object-src 'none'; 
  frame-ancestors 'none';
  frame-src 'self' https://identitytoolkit.googleapis.com https://nebc-online-platform.firebaseapp.com/;
  base-uri 'self' wss://s-usc1a-nss-2046.firebaseio.com;
  form-action 'none';
  require-trusted-types-for 'script'
`

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/*'
      },
    ],
  },
  eslint: {
    ignoreDuringBuilds: true
  }, typescript: {
    ignoreBuildErrors: true,
  }, async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
          {
            key: 'Content-Security-Policy',
            value: cspHeader.replace(/\n/g, ''),
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
        ],
      },
    ]
  },
};

export default {nextConfig, nonce};
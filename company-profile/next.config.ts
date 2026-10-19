import type {NextConfig} from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
const config: NextConfig = {
  poweredByHeader: false,
  async headers() {return [{source: '/:path*', headers: [
    {key:'Strict-Transport-Security',value:'max-age=31536000'},
    {key:'X-Content-Type-Options',value:'nosniff'},
    {key:'X-Frame-Options',value:'DENY'},
    {key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},
    {key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=(), payment=()'},
  ]}];},
};
export default createNextIntlPlugin('./src/i18n/request.ts')(config);

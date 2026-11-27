import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental:{serverActions:{bodySizeLimit: "4mb"}},
  async headers(){
    return [
      {source:'/:path*',headers:[
        {key:'X-Content-Type-Options',value:'nosniff'},
        {key:'X-Frame-Options',value:'DENY'},
        {key:'Content-Security-Policy',value:"frame-ancestors 'none'; base-uri 'self'; object-src 'none'"},
        {key:'Referrer-Policy',value:'no-referrer'},
      ]},
      // All application pages can contain session-specific navigation, even /.
      // Keep immutable Next assets cacheable. Do not rely on this as authorization.
      {source:'/((?!_next/static|_next/image|favicon.ico).*)',headers:[
        {key:'Cache-Control',value:'private, no-store, max-age=0, must-revalidate'},
      ]},
      // Exact, public branding files only; personalized pages remain private/no-store.
      {source:'/brand/:asset(sestocontinente-mark.png|sestocontinente-logo.png|nereia-logo.png|favicon.png)',headers:[
        {key:'Cache-Control',value:'public, max-age=86400, must-revalidate'},
      ]},
    ];
  },
};
export default nextConfig;

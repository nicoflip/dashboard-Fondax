/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@xyflow/react',
      '@fullcalendar/core',
      '@fullcalendar/daygrid',
      '@fullcalendar/interaction',
      '@fullcalendar/react',
      '@tiptap/react',
      '@tiptap/starter-kit',
      'date-fns',
    ],
  },
}

module.exports = nextConfig

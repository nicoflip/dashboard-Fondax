const fs = require('fs')

// Align process.cwd() with the native filesystem casing on Windows (D:\Donnees\bureau vs D:\Donnees\Bureau)
// to prevent Webpack from loading duplicate module instances with mismatched case paths.
try {
  const realCwd = fs.realpathSync.native(process.cwd())
  if (process.cwd() !== realCwd) {
    process.chdir(realCwd)
  }
} catch (e) {}

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

/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: [
    'localhost',
    '127.0.0.1',
    '192.168.0.11',
    '49.249.179.244',
    '*.trycloudflare.com',
    '*.ngrok-free.app'
  ]
};

export default nextConfig;

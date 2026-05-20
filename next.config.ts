import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "yt-search",
    "@distube/ytdl-core",
    "ffmpeg-static",
    "fluent-ffmpeg",
    "yt-dlp-exec"
  ],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
      },
      {
        protocol: 'https',
        hostname: 'yt3.ggpht.com',
      },
      {
        protocol: 'https',
        hostname: '**.googleusercontent.com',
      },
    ],
  },
};

export default nextConfig;

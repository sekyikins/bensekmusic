import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "yt-search",
    "cheerio",
    "dasu",
    "boolstring",
    "human-time",
    "jsonpath-plus",
    "minimist",
    "async.parallellimit",
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

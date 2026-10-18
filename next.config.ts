import type { NextConfig } from "next";

import("@opennextjs/cloudflare").then((module) => module.initOpenNextCloudflareForDev());

const nextConfig: NextConfig = {};

export default nextConfig;
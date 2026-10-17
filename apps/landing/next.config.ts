import path from "node:path"
import { loadEnvConfig } from "@next/env"
import type { NextConfig } from "next"

// Single env file at the repo root (see /.env.example).
loadEnvConfig(path.resolve(process.cwd(), "../.."))

const nextConfig: NextConfig = {
    reactStrictMode: true,
}

export default nextConfig

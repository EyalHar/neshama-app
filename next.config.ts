import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets a phone or another computer on the home network use the dev server (http://192.168.1.x:3000);
  // without it Next blocks its dev resources for any host but localhost and the page isn't interactive
  allowedDevOrigins: ["192.168.1.*"],
};

export default nextConfig;

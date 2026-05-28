"use client";

import dynamicImport from "next/dynamic";

const Terminal = dynamicImport(() => import("@/components/Terminal"), { ssr: false });

export default function ClassicPage() {
  return <Terminal />;
}

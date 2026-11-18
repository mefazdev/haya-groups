"use client";

import dynamic from "next/dynamic";

// Estimates live in localStorage, so the tool only renders in the browser.
const EstimatesApp = dynamic(() => import("./EstimatesApp"), {
  ssr: false,
  loading: () => <div className="min-h-screen bg-[#0a0a0a]" />,
});

export default EstimatesApp;

import { Suspense } from "react";

import { BeebliothecaApp } from "../../experimental/beebliotheca/App";

const BeebliothecaPreview = () => {
  return (
    <div className="min-h-screen font-inter bg-black text-white">
      <Suspense fallback={<div className="p-10 text-center">Loading preview…</div>}>
        <BeebliothecaApp />
      </Suspense>
    </div>
  );
};

export default BeebliothecaPreview;

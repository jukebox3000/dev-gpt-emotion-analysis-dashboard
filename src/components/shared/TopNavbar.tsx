'use client';

export default function TopNavbar() {
  return (
    <div className="sticky top-0 z-50 border-b border-indigo-100/40 bg-indigo-50/10 backdrop-blur-lg">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-slate-900 px-3 py-1 text-sm font-semibold text-white shadow-sm">
            EmoGPT
          </div>
          <div className="text-sm text-slate-500 font-medium">Developer-ChatGPT Interaction Analysis Dashboard</div>
        </div>
      </div>
    </div>
  );
}

export default function CalendrierLoading() {
  return (
    <div className="h-[600px] flex items-center justify-center bg-slate-50/50 rounded-xl border border-slate-200 text-slate-500 font-medium">
      <div className="flex items-center gap-2">
        <span className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        Chargement du calendrier...
      </div>
    </div>
  )
}

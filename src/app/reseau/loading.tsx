export default function ReseauLoading() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="flex items-center gap-2 text-slate-500">
        <span className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        Chargement du réseau...
      </div>
    </div>
  )
}

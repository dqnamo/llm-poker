export default function Button({children, onClick}: {children: React.ReactNode, onClick: () => void}) {
  return (
    <button onClick={onClick} className="bg-neutral-950 border border-neutral-900 text-neutral-200 px-4 py-2 text-xs font-semibold">
      {children}
    </button>
  )
}
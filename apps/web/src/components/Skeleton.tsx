function Line({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
}

export function SkeletonJobCard() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <Line className="h-5 w-5 rounded" />
            <Line className="h-3 w-20" />
          </div>
          <Line className="h-4 w-2/3" />
          <Line className="h-3 w-1/2" />
          <Line className="h-3 w-24" />
        </div>
        <Line className="h-6 w-16 rounded-full shrink-0" />
      </div>
    </div>
  )
}

export function SkeletonJobList() {
  return (
    <div className="space-y-3">
      <SkeletonJobCard />
      <SkeletonJobCard />
      <SkeletonJobCard />
    </div>
  )
}

export function SkeletonConversationRow() {
  return (
    <div className="flex items-center gap-3 p-4 border-b border-gray-100">
      <div className="animate-pulse bg-gray-200 rounded-full w-10 h-10 shrink-0" />
      <div className="flex-1 space-y-2">
        <Line className="h-3.5 w-1/3" />
        <Line className="h-3 w-2/3" />
      </div>
      <Line className="h-3 w-10 shrink-0" />
    </div>
  )
}

export function SkeletonInbox() {
  return (
    <div>
      <SkeletonConversationRow />
      <SkeletonConversationRow />
      <SkeletonConversationRow />
      <SkeletonConversationRow />
    </div>
  )
}

import { Skeleton } from "@/components/ui/skeleton";

export default function TournamentDetailLoading() {
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-8 w-52" />
            <Skeleton className="h-4 w-36" />
          </div>
          <Skeleton className="h-8 w-20 rounded-full" />
        </div>
        {/* Tabs */}
        <div className="flex gap-1 border-b pb-0">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-20 rounded-none" />
          ))}
        </div>
      </div>
      {/* Content */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
      <Skeleton className="h-32 rounded-xl" />
    </div>
  );
}

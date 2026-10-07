import { LoaderCircle } from "lucide-react";

export default function AccountLoading() {
  return (
    <div className="grid min-h-[50vh] place-items-center text-brand-600" role="status" aria-label="Loading">
      <LoaderCircle className="size-9 animate-spin" />
    </div>
  );
}

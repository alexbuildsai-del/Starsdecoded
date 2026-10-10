import { Skeleton } from "@/ds/atoms/Skeleton";

export default function SkeletonExample() {
  return (
    <div className="grid gap-8 bg-[#06080C] p-6">
      <Skeleton caption="Still writing this chapter" />
      <Skeleton lines={4} caption="Still writing this chapter" />
    </div>
  );
}

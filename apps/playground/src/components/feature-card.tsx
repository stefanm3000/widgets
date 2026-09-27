interface FeatureCardProps {
  number: string;
  title: string;
}

export function FeatureCard({ number, title }: FeatureCardProps) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white/45 p-4 backdrop-blur-sm">
      <span className="text-[10px] font-bold text-[#8a8e84]">{number}</span>
      <p className="mt-4 text-sm font-semibold tracking-[-0.01em]">{title}</p>
    </div>
  );
}

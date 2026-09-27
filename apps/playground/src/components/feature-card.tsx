import { Card, CardContent } from "./ui/card";

interface FeatureCardProps {
  number: string;
  title: string;
}

export function FeatureCard({ number, title }: FeatureCardProps) {
  return (
    <Card className="rounded-2xl bg-white/45 shadow-none backdrop-blur-sm">
      <CardContent className="p-4">
        <span className="text-[10px] font-bold text-[#8a8e84]">{number}</span>
        <p className="mt-4 text-sm font-semibold tracking-[-0.01em]">{title}</p>
      </CardContent>
    </Card>
  );
}

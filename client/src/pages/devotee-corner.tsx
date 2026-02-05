import { SERVICES } from "@/lib/constants";
import ServiceCard from "@/components/service-card";

export default function DevoteeCorner() {
  const resources = SERVICES.filter(s => s.isExternal);

  return (
    <div className="px-4 py-8 pb-24 space-y-6">
      <div className="space-y-2 px-2">
        <h1 className="text-2xl font-serif font-bold">Devotee Corner</h1>
        <p className="text-muted-foreground">Access spiritual resources and materials</p>
      </div>

      <div className="grid gap-4">
        {resources.map((resource) => (
          <ServiceCard key={resource.id} {...resource} />
        ))}
        
        {/* Additional Placeholder Content */}
        <div className="p-6 bg-secondary/5 rounded-xl border border-secondary/10 text-center space-y-3 mt-4">
          <h3 className="font-serif font-bold text-lg text-secondary">Guruparampara</h3>
          <p className="text-sm text-muted-foreground">Learn about the lineage of Jagadgurus</p>
          <button className="text-sm font-medium text-primary underline">Read More</button>
        </div>
      </div>
    </div>
  );
}

import { Package, Boxes, PackageCheck } from "lucide-react";

const StatsSection = () => {
  const stats = [
    {
      icon: Package,
      value: "9,000+",
      label: "SKUs",
    },
    {
      icon: Boxes,
      value: "150K+",
      label: "Items in Stock",
    },
    {
      icon: PackageCheck,
      value: "Furnish More.",
      label: "Spend Less.",
    },
  ];

  return (
    <section className="bg-muted/50 border-y border-border">
      <div className="container mx-auto px-4 py-4 md:py-5">
        <div className="grid grid-cols-3 gap-1 sm:gap-4 md:gap-8 max-w-5xl mx-auto">
          {stats.map((stat, index) => (
            <div 
              key={index} 
              className="flex min-w-0 flex-col items-center justify-center gap-1 text-center sm:flex-row sm:gap-2 sm:text-left md:gap-4"
            >
              <div className="p-1.5 sm:p-2 md:p-3 rounded-full bg-accent/10 shrink-0">
                <stat.icon className="h-5 w-5 sm:h-6 sm:w-6 md:h-10 md:w-10 text-accent" />
              </div>
              <div className="flex flex-col">
                <span className="text-base sm:text-2xl md:text-3xl font-semibold text-foreground leading-none">
                  {stat.value}
                </span>
                <span className="text-[10px] leading-tight sm:text-sm md:text-base text-muted-foreground font-medium">
                  {stat.label}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;

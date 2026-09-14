import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, Minus } from "lucide-react";
import { toast } from "sonner";
import { useBuildOrder, OrderItem } from "@/contexts/BuildOrderContext";

interface Props {
  item: Omit<OrderItem, "quantity">;
}

export default function AddToOrderButton({ item }: Props) {
  const { addItem } = useBuildOrder();
  const [open, setOpen] = useState(false);
  const [qtyInput, setQtyInput] = useState("1");
  const max = Math.max(1, item.unitsAvailable || 1);

  const resolveQty = () => {
    const parsed = parseInt(qtyInput, 10);
    if (Number.isNaN(parsed) || parsed < 1) return 1;
    return Math.min(parsed, max);
  };

  const step = (delta: number) => {
    setQtyInput(String(Math.max(1, Math.min(max, resolveQty() + delta))));
  };

  const handleAdd = () => {
    const quantity = resolveQty();
    addItem(item, quantity);
    toast.success(`${quantity} × ${item.productName} added to your request`);
    setOpen(false);
  };

  const currentQty = resolveQty();

  return (
    <Popover open={open} onOpenChange={(next) => { if (next) setQtyInput("1"); setOpen(next); }}>
      <PopoverTrigger asChild>
        <Button className="mt-auto w-full bg-accent text-accent-foreground hover:bg-accent/90 font-semibold">
          <Plus className="h-4 w-4 mr-1.5" /> Add to Request
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="end">
        <p className="text-sm font-semibold mb-2">Quantity</p>
        <div className="flex items-center justify-center gap-2 mb-1">
          <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={() => step(-1)} disabled={currentQty <= 1}>
            <Minus className="h-4 w-4" />
          </Button>
          <Input
            type="text"
            inputMode="numeric"
            value={qtyInput}
            onChange={(event) => setQtyInput(event.target.value.replace(/[^\d]/g, ""))}
            onBlur={() => setQtyInput(String(resolveQty()))}
            onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); setQtyInput(String(resolveQty())); } }}
            className="h-9 w-16 text-center"
          />
          <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={() => step(1)} disabled={currentQty >= max}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground text-center mb-3">{max} available</p>
        <Button type="button" onClick={handleAdd} className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-semibold">
          Add to Request
        </Button>
      </PopoverContent>
    </Popover>
  );
}
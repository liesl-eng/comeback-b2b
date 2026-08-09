import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Plus, Minus, Check, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useBuildOrder, OrderItem } from "@/contexts/BuildOrderContext";
import { cn } from "@/lib/utils";

interface Props {
  item: Omit<OrderItem, "quantity">;
}

interface SpaceRowProps {
  id: string;
  name: string;
  count: number;
  active: boolean;
  onSelect: () => void;
}

function SpaceRow({ id, name, count, active, onSelect }: SpaceRowProps) {
  const { renameSpace } = useBuildOrder();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (!editing) setDraft(name); }, [name, editing]);
  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const commit = () => {
    if (draft.trim()) renameSpace(id, draft.trim());
    setEditing(false);
  };
  const cancel = () => { setDraft(name); setEditing(false); };

  if (editing) {
    return (
      <div
        className="w-full flex items-center gap-1 px-2 py-1 rounded border border-accent bg-accent"
        onClick={(e) => e.stopPropagation()}
      >
        <Input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); commit(); }
            if (e.key === "Escape") { e.preventDefault(); cancel(); }
          }}
          onClick={(e) => e.stopPropagation()}
          className="h-7 text-sm flex-1 bg-background"
        />
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-accent-foreground hover:bg-accent-foreground/10"
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); commit(); }}
        >
          <Check className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "w-full flex items-center gap-1 rounded border transition-colors",
        active
          ? "border-accent bg-accent text-accent-foreground"
          : "border-input bg-background text-foreground hover:bg-muted",
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex-1 min-w-0 text-left text-sm px-2 py-1.5 flex items-center justify-between"
      >
        <span className="truncate font-medium">{name}</span>
        <span className={cn("text-xs ml-2", active ? "text-accent-foreground/80" : "text-muted-foreground")}>{count}</span>
      </button>
      {active && (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-7 w-7 mr-1 text-accent-foreground hover:bg-accent-foreground/10 hover:text-accent-foreground"
          title="Rename collection"
          onClick={(e) => { e.stopPropagation(); setEditing(true); }}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}

export default function AddToOrderButton({ item }: Props) {
  const { state, addItem, addSpace } = useBuildOrder();
  const [open, setOpen] = useState(false);
  const [qtyInput, setQtyInput] = useState("1");
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);

  const max = Math.max(1, item.unitsAvailable || 1);

  const resolveQty = () => {
    const parsed = parseInt(qtyInput, 10);
    if (isNaN(parsed) || parsed < 1) return 1;
    if (parsed > max) return max;
    return parsed;
  };

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setQtyInput("1");
      setSelectedSpaceId(state.spaces.length === 1 ? state.spaces[0].id : null);
    }
    setOpen(next);
  };

  const handleBlurQty = () => {
    setQtyInput(String(resolveQty()));
  };

  const step = (delta: number) => {
    const n = resolveQty() + delta;
    const clamped = Math.max(1, Math.min(max, n));
    setQtyInput(String(clamped));
  };

  const handleNewSpace = () => {
    const id = addSpace();
    setSelectedSpaceId(id);
  };

  const handleAdd = () => {
    if (!selectedSpaceId) return;
    const finalQty = resolveQty();
    setQtyInput(String(finalQty));
    const sp = state.spaces.find((s) => s.id === selectedSpaceId);
    const name = sp?.name ?? "collection";
    addItem(selectedSpaceId, item, finalQty);
    toast.success(`${finalQty} × ${item.productName} added to ${name}`);
    setOpen(false);
  };

  const currentQty = resolveQty();

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button className="mt-auto w-full bg-accent text-accent-foreground hover:bg-accent/90 font-semibold">
          <Plus className="h-4 w-4 mr-1.5" /> Add to Order Request
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="end">
        {/* Quantity */}
        <p className="text-sm font-semibold mb-2">Quantity</p>
        <div className="flex items-center justify-center gap-2 mb-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={() => step(-1)}
            disabled={currentQty <= 1}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Input
            type="text"
            inputMode="numeric"
            value={qtyInput}
            onChange={(e) => setQtyInput(e.target.value.replace(/[^\d]/g, ""))}
            onBlur={handleBlurQty}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleBlurQty(); } }}
            className="h-9 w-16 text-center"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={() => step(1)}
            disabled={currentQty >= max}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground text-center mb-3">{max} available</p>

        {/* Space picker */}
        <p className="text-sm font-semibold mb-2">Add to Collection</p>
        <div className="space-y-1 max-h-44 overflow-y-auto mb-2">
          {state.spaces.map((s) => (
            <SpaceRow
              key={s.id}
              id={s.id}
              name={s.name}
              count={s.items.length}
              active={s.id === selectedSpaceId}
              onSelect={() => setSelectedSpaceId(s.id)}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={handleNewSpace}
          className="w-full text-left text-sm px-2 py-1.5 mb-3 rounded hover:bg-muted text-accent font-semibold flex items-center gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" /> New Collection
        </button>

        <Button
          type="button"
          onClick={handleAdd}
          disabled={!selectedSpaceId}
          className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-semibold"
        >
          Add to Order Request
        </Button>
      </PopoverContent>
    </Popover>
  );
}

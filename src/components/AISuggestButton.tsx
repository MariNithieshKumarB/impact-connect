import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { getAISuggestions } from "@/lib/ai-suggest.functions";
import { toast } from "sonner";

type Field = Parameters<typeof getAISuggestions>[0]["data"]["field"];

interface Props {
  field: Field;
  context?: string;
  role?: "volunteer" | "ngo";
  mode?: "append-csv" | "replace-text" | "pick";
  currentValue?: string;
  onApply: (value: string) => void;
  label?: string;
}

export function AISuggestButton({ field, context, role, mode = "append-csv", currentValue = "", onApply, label = "AI suggest" }: Props) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const call = useServerFn(getAISuggestions);

  const fetchIt = async () => {
    setLoading(true);
    try {
      const res = await call({ data: { field, context, role } });
      const list = res.items ?? [];
      if (!list.length) { toast.info("No suggestions returned. Try adding more context."); return; }
      if (mode === "replace-text") { onApply(list[0]); toast.success("Applied AI suggestion"); return; }
      setItems(list); setOpen(true);
    } catch (e: any) {
      toast.error(e?.message ?? "AI request failed");
    } finally { setLoading(false); }
  };

  const pick = (v: string) => {
    if (mode === "pick") { onApply(v); setOpen(false); return; }
    const parts = currentValue.split(",").map((s) => s.trim()).filter(Boolean);
    if (!parts.includes(v)) parts.push(v);
    onApply(parts.join(", "));
  };

  return (
    <div className="space-y-2">
      <Button type="button" size="sm" variant="outline" onClick={fetchIt} disabled={loading}
        className="border-primary/40 text-primary hover:bg-primary/10">
        {loading ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-2 h-3.5 w-3.5" />}
        {label}
      </Button>
      {open && items.length > 0 && (
        <div className="flex flex-wrap gap-1.5 rounded-md border border-primary/20 bg-primary/5 p-2">
          {items.map((it) => (
            <Badge key={it} onClick={() => pick(it)}
              className="cursor-pointer bg-primary/15 text-foreground hover:bg-primary/30">
              + {it}
            </Badge>
          ))}
          <Button type="button" size="sm" variant="ghost" className="ml-auto h-6 text-xs" onClick={() => setOpen(false)}>Close</Button>
        </div>
      )}
    </div>
  );
}

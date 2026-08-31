"use client";

import { useState } from "react";
import { toast } from "sonner";
import { generateRosterAccess } from "@/lib/actions/roster-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, RefreshCw, Link2, Eye, EyeOff } from "lucide-react";

export function RosterAccessPanel({ teamId, token, pin }: {
  teamId: string;
  token: string | null;
  pin: string | null;
}) {
  const [current, setCurrent] = useState({ token, pin });
  const [loading, setLoading] = useState(false);
  const [showPin, setShowPin] = useState(false);

  const generate = async () => {
    setLoading(true);
    const res = await generateRosterAccess(teamId);
    setLoading(false);
    if (!res.success) { toast.error(res.error ?? "Error"); return; }
    if (!res.data) { toast.error("Error"); return; }
    setCurrent({ token: res.data.token, pin: res.data.pin });
    setShowPin(true);
    toast.success("Acceso generado. Comparte el link y el PIN con el delegado.");
  };

  const link = current.token
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/nomina/${current.token}`
    : null;

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Link2 className="size-4" /> Acceso de delegado / capitán
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          Genera un link + PIN de 4 dígitos para que el delegado cargue la nómina desde su celular, sin necesidad de login.
        </p>

        {link ? (
          <div className="flex flex-col gap-3">
            {/* Link */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Link para compartir</Label>
              <div className="flex gap-2">
                <Input value={link} readOnly className="text-xs font-mono" />
                <Button variant="outline" size="icon" onClick={() => copy(link, "Link")}>
                  <Copy className="size-4" />
                </Button>
              </div>
            </div>

            {/* PIN */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">PIN de acceso</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    value={showPin ? (current.pin ?? "") : "••••"}
                    readOnly
                    className="font-mono text-lg tracking-[0.5em]"
                  />
                </div>
                <Button variant="outline" size="icon" onClick={() => setShowPin((v) => !v)}>
                  {showPin ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </Button>
                <Button variant="outline" size="icon" onClick={() => copy(current.pin ?? "", "PIN")}>
                  <Copy className="size-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Comparte el PIN de forma separada al link (por WhatsApp, llamada, etc.)
              </p>
            </div>

            <Button variant="outline" size="sm" className="w-fit" onClick={generate} disabled={loading}>
              <RefreshCw className="size-3" /> {loading ? "Regenerando…" : "Regenerar acceso"}
            </Button>
          </div>
        ) : (
          <Button onClick={generate} disabled={loading}>
            <Link2 className="size-4" /> {loading ? "Generando…" : "Generar acceso para delegado"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

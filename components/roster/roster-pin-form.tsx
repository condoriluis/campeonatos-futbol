"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { verifyRosterPin } from "@/lib/actions/roster-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield } from "lucide-react";

export function RosterPinForm({ token, teamName, tournament, category }: {
  token: string;
  teamName: string;
  tournament: string;
  category: string;
}) {
  const router = useRouter();
  const [pin, setPin] = useState(["", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const refs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  const handleDigit = (idx: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...pin];
    next[idx] = val.slice(-1);
    setPin(next);
    if (val && idx < 3) refs[idx + 1].current?.focus();
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !pin[idx] && idx > 0) {
      refs[idx - 1].current?.focus();
    }
    if (e.key === "Enter") submit();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
    if (text.length === 4) {
      setPin(text.split(""));
      refs[3].current?.focus();
    }
    e.preventDefault();
  };

  const submit = async () => {
    const code = pin.join("");
    if (code.length < 4) { toast.error("Ingresa el PIN de 4 dígitos"); return; }
    setLoading(true);
    const res = await verifyRosterPin(token, code);
    setLoading(false);
    if (!res.success) {
      toast.error(res.error ?? "PIN incorrecto");
      setPin(["", "", "", ""]);
      refs[0].current?.focus();
      return;
    }
    toast.success("¡Acceso concedido!");
    router.refresh();
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center p-4">
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-primary/10">
            <Shield className="size-7 text-primary" />
          </div>
          <CardTitle className="text-xl">Acceso de Delegado</CardTitle>
          <CardDescription className="space-y-0.5">
            <span className="block font-medium text-foreground">{teamName}</span>
            <span className="block text-xs">{tournament} · {category}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6">
          <p className="text-sm text-muted-foreground text-center">
            Ingresa el PIN de 4 dígitos que te proporcionó el organizador
          </p>

          {/* PIN inputs */}
          <div className="flex gap-3">
            {pin.map((digit, i) => (
              <input
                key={i}
                ref={refs[i]}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigit(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                onPaste={i === 0 ? handlePaste : undefined}
                className="size-14 rounded-xl border-2 border-input bg-background text-center text-2xl font-bold tracking-widest outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                autoFocus={i === 0}
              />
            ))}
          </div>

          <Button
            className="w-full"
            size="lg"
            onClick={submit}
            disabled={loading || pin.some((d) => !d)}
          >
            {loading ? "Verificando…" : "Ingresar"}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Tienes máximo 5 intentos cada 10 minutos.<br />
            Si perdiste el PIN, contacta al organizador.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

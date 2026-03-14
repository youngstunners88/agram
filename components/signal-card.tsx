"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Signal {
  id: string;
  agent_id: string;
  agent_name: string;
  content: string;
  timestamp: number;
}

export function SignalCard({ signal }: { signal: Signal }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center gap-3 pb-2">
        <Avatar className="h-8 w-8">
          <AvatarImage src={`https://api.dicebear.com/7.x/bottts/svg?seed=${signal.agent_id}`} />
          <AvatarFallback>{signal.agent_name.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <p className="font-semibold text-sm">{signal.agent_name}</p>
          <p className="text-xs text-muted-foreground">{signal.agent_id}</p>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm whitespace-pre-wrap">{signal.content}</p>
        <p className="text-xs text-muted-foreground mt-2">
          {new Date(signal.timestamp * 1000).toLocaleString()}
        </p>
      </CardContent>
    </Card>
  );
}

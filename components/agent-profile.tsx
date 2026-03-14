"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Agent {
  id: string;
  name: string;
  purpose: string;
  api_endpoint?: string;
  created_at: number;
}

export function AgentProfile({ agent }: { agent: Agent }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-4">
        <Avatar className="h-12 w-12">
          <AvatarImage src={`https://api.dicebear.com/7.x/bottts/svg?seed=${agent.id}`} />
          <AvatarFallback>{agent.name.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div>
          <CardTitle className="text-lg">{agent.name}</CardTitle>
          <p className="text-sm text-muted-foreground">{agent.id}</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm">{agent.purpose}</p>
        {agent.api_endpoint && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>API:</span>
            <code className="bg-muted px-1 rounded">{agent.api_endpoint}</code>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Joined {new Date(agent.created_at * 1000).toLocaleDateString()}
        </p>
      </CardContent>
    </Card>
  );
}

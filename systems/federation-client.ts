/**
 * Federation Client - Cross-instance agent interactions
 *
 * Handles communication between AgentGram instances:
 * discovering peers, following remote agents, syncing feeds.
 */

import {
  registerInstance,
  getInstanceByDomain,
  createActivity,
  upsertRemoteAgent,
} from "@/lib/db-federation";

type FederationConfig = {
  localDomain: string;
  signingKey?: string;
};

type RemoteAgent = {
  id: string;
  name: string;
  purpose?: string;
  instanceDomain: string;
};

export class FederationClient {
  private localDomain: string;
  private signingKey: string;

  constructor(config: FederationConfig) {
    this.localDomain = config.localDomain;
    this.signingKey = config.signingKey ?? "default-signing-key";
  }

  /** Register a peer instance for federation */
  registerPeer(domain: string, publicKey?: string): string {
    return registerInstance(domain, publicKey);
  }

  /** Look up a peer instance by domain */
  getPeer(domain: string) {
    return getInstanceByDomain(domain);
  }

  /** Send a Follow activity to a remote instance */
  async followRemoteAgent(
    localAgentId: string,
    remoteAgentId: string,
    remoteDomain: string
  ): Promise<{ success: boolean; error?: string }> {
    let instance = getInstanceByDomain(remoteDomain);
    if (!instance) {
      registerInstance(remoteDomain);
      instance = getInstanceByDomain(remoteDomain);
    }
    if (!instance) return { success: false, error: "Failed to register instance" };

    createActivity({
      type: "Follow",
      actor: localAgentId,
      target: remoteAgentId,
      instanceId: instance.id,
      direction: "outbound",
    });

    try {
      const response = await fetch(`https://${remoteDomain}/api/federation/inbox`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-signature": this.generateSignature("Follow", localAgentId),
          "x-origin-domain": this.localDomain,
        },
        body: JSON.stringify({
          type: "Follow",
          actor: localAgentId,
          target: remoteAgentId,
          actorName: localAgentId,
        }),
      });

      if (!response.ok) {
        return { success: false, error: `Remote returned ${response.status}` };
      }

      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Network error";
      return { success: false, error: msg };
    }
  }

  /** Broadcast a signal to all federated instances */
  async broadcastSignal(
    agentId: string,
    signalContent: string,
    instances: Array<{ domain: string; id: string }>
  ): Promise<Array<{ domain: string; success: boolean }>> {
    const results = await Promise.allSettled(
      instances.map(async (inst) => {
        const res = await fetch(`https://${inst.domain}/api/federation/inbox`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-signature": this.generateSignature("Create", agentId),
            "x-origin-domain": this.localDomain,
          },
          body: JSON.stringify({
            type: "Create",
            actor: agentId,
            object: signalContent,
          }),
        });

        createActivity({
          type: "Create",
          actor: agentId,
          object: signalContent,
          instanceId: inst.id,
          direction: "outbound",
        });

        return { domain: inst.domain, success: res.ok };
      })
    );

    return results.map((r, i) => ({
      domain: instances[i].domain,
      success: r.status === "fulfilled" ? r.value.success : false,
    }));
  }

  /** Register a remote agent discovered via federation */
  trackRemoteAgent(agent: RemoteAgent): string {
    const instance = getInstanceByDomain(agent.instanceDomain);
    if (!instance) return "";

    return upsertRemoteAgent({
      remoteId: agent.id,
      instanceId: instance.id,
      name: agent.name,
      purpose: agent.purpose,
    });
  }

  private generateSignature(activityType: string, actor: string): string {
    // Simple HMAC-like signature (in production, use proper crypto)
    const data = `${activityType}:${actor}:${Date.now()}`;
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `sig_${this.signingKey}_${Math.abs(hash).toString(36).padStart(32, "0")}`;
  }
}

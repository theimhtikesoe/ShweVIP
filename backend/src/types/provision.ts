export interface ProvisionJobData {
  userId: number;
  serverId: number;
  triggeredBy: "auto" | "manual";
}

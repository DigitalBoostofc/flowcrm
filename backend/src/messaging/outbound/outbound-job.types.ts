/**
 * Job payload for QUEUE_OUTBOUND. Carries everything the processor needs to
 * call channels.send without depending on request CLS context — the worker
 * runs detached from the original HTTP request.
 */
export interface OutboundMessageJob {
  workspaceId: string;
  userId?: string | null;
  channelConfigId: string;
  to: string;
  body: string;
  /** Free-form context that helps tracing failed jobs (e.g. 'otp:signup_verify'). */
  reason?: string;
}

export const OUTBOUND_JOB_NAME = 'send-message';

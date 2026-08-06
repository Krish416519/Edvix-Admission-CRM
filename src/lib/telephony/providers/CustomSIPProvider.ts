import { CallConfig, TelephonyProviderInterface } from '../provider';

export class CustomSIPProvider implements TelephonyProviderInterface {
  private config: Record<string, any> = {};

  async initialize(config: Record<string, any>): Promise<void> {
    this.config = config;
    console.log('[CustomSIPProvider] Initialized with config', Object.keys(config));
    // In production: Load sip.js or jssip with WebSocket config
  }

  async makeCall(params: CallConfig): Promise<{ providerCallId: string; status: string }> {
    console.log(`[CustomSIPProvider] Dialing ${params.to} via SIP...`);
    return {
      providerCallId: `sip-${Date.now()}`,
      status: 'initiated'
    };
  }

  async answerCall(providerCallId: string): Promise<void> {
    console.log(`[CustomSIPProvider] Answering call ${providerCallId}...`);
  }

  async endCall(providerCallId: string): Promise<void> {
    console.log(`[CustomSIPProvider] Ending call ${providerCallId}...`);
  }

  async mute(providerCallId: string, isMuted: boolean): Promise<void> {
    console.log(`[CustomSIPProvider] Muting ${providerCallId}: ${isMuted}`);
  }

  async hold(providerCallId: string, isHold: boolean): Promise<void> {
    console.log(`[CustomSIPProvider] Holding ${providerCallId}: ${isHold}`);
  }

  async transfer(providerCallId: string, transferTo: string): Promise<void> {
    console.log(`[CustomSIPProvider] Transferring ${providerCallId} to ${transferTo}`);
  }

  async getRecordingUrl(providerCallId: string): Promise<string | null> {
    console.log(`[CustomSIPProvider] Fetching recording for ${providerCallId}`);
    return null;
  }

  async conference(providerCallId: string, participants: string[]): Promise<void> {
    console.log(`[CustomSIPProvider] Conference ${providerCallId} with`, participants);
  }

  destroy(): void {
    console.log('[CustomSIPProvider] Destroyed');
  }
}

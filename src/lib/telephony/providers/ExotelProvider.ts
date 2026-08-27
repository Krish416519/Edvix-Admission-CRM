import { CallConfig, TelephonyProviderInterface } from '../provider';

export class ExotelProvider implements TelephonyProviderInterface {
  private config: Record<string, any> = {};

  async initialize(config: Record<string, any>): Promise<void> {
    this.config = config;
    console.log('[ExotelProvider] Initialized with config', Object.keys(config));
    // In production: Configure Exotel API credentials (api_key, api_token, subdomain)
  }

  async makeCall(params: CallConfig): Promise<{ providerCallId: string; status: string }> {
    console.log(`[ExotelProvider] Dialing ${params.to} (via PSTN)...`);
    // Exotel connects agent phone first, then user phone via REST API
    return {
      providerCallId: `exo-${Date.now()}`,
      status: 'initiated'
    };
  }

  async answerCall(providerCallId: string): Promise<void> {
    console.log(`[ExotelProvider] PSTN calls are answered on the phone device ${providerCallId}`);
  }

  async endCall(providerCallId: string): Promise<void> {
    console.log(`[ExotelProvider] Hanging up call ${providerCallId} via API...`);
  }

  async mute(_providerCallId: string, _isMuted: boolean): Promise<void> {
    console.log(`[ExotelProvider] Mute not directly supported via PSTN API`);
  }

  async hold(providerCallId: string, isHold: boolean): Promise<void> {
    console.log(`[ExotelProvider] Hold ${providerCallId}: ${isHold}`);
  }

  async transfer(providerCallId: string, transferTo: string): Promise<void> {
    console.log(`[ExotelProvider] Transferring ${providerCallId} to ${transferTo}`);
  }

  async getRecordingUrl(providerCallId: string): Promise<string | null> {
    console.log(`[ExotelProvider] Fetching recording for ${providerCallId}`);
    // In production: GET /v1/Accounts/{sid}/Calls/{callSid}/Recordings
    return null;
  }

  async conference(providerCallId: string, participants: string[]): Promise<void> {
    console.log(`[ExotelProvider] Conference ${providerCallId} with`, participants);
  }

  destroy(): void {
    console.log('[ExotelProvider] Destroyed');
  }
}

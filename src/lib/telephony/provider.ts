export interface CallConfig {
  to: string;
  from?: string; // Optional, defaults to provider config
  leadId: string;
  counselorId: string;
  counselorPhone?: string;
}

export interface TelephonyProviderInterface {
  /** Initialize the provider SDK/Client */
  initialize(config: Record<string, any>): Promise<void>;
  
  /** Make an outbound call */
  makeCall(params: CallConfig): Promise<{ providerCallId: string; status: string }>;
  
  /** Answer an incoming call */
  answerCall(providerCallId: string): Promise<void>;
  
  /** End the active call */
  endCall(providerCallId: string): Promise<void>;
  
  /** Mute or unmute the microphone */
  mute(providerCallId: string, isMuted: boolean): Promise<void>;
  
  /** Put the call on hold */
  hold(providerCallId: string, isHold: boolean): Promise<void>;
  
  /** Transfer the call to another number */
  transfer(providerCallId: string, transferTo: string): Promise<void>;

  /** Get the recording URL for a completed call */
  getRecordingUrl(providerCallId: string): Promise<string | null>;

  /** Join a conference call (future-ready) */
  conference(providerCallId: string, participants: string[]): Promise<void>;
  
  /** Destroy the client/provider instance */
  destroy(): void;
}

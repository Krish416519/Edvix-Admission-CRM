import { TelephonyProviderInterface } from './provider';
import { TwilioProvider } from './providers/TwilioProvider';
import { ExotelProvider } from './providers/ExotelProvider';
import { KnowlarityProvider } from './providers/KnowlarityProvider';
import { MyOperatorProvider } from './providers/MyOperatorProvider';
import { CloudTalkProvider } from './providers/CloudTalkProvider';
import { CustomSIPProvider } from './providers/CustomSIPProvider';
import { TelephonyProviderType } from '../../types/telephony';

export const createTelephonyProvider = (type: TelephonyProviderType): TelephonyProviderInterface => {
  switch (type) {
    case 'Twilio':
      return new TwilioProvider();
    case 'Exotel':
      return new ExotelProvider();
    case 'Knowlarity':
      return new KnowlarityProvider();
    case 'MyOperator':
      return new MyOperatorProvider();
    case 'CloudTalk':
      return new CloudTalkProvider();
    case 'CustomSIP':
      return new CustomSIPProvider();
    default:
      console.warn(`[ProviderFactory] Unknown provider type: ${type}. Defaulting to CustomSIP.`);
      return new CustomSIPProvider();
  }
};

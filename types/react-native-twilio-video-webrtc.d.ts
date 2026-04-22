declare module 'react-native-twilio-video-webrtc' {
  import * as React from 'react';
  import { ViewProps } from 'react-native';

  export interface TwilioVideoConnectParams {
    accessToken: string;
    roomName: string;
    enableAudio?: boolean;
    enableVideo?: boolean;
  }

  export interface TrackIdentifier {
    participantSid: string;
    videoTrackSid: string;
  }

  export interface TwilioVideoProps {
    onRoomDidConnect?: (event?: { roomName?: string }) => void;
    onRoomDidDisconnect?: (event?: { roomName?: string; error?: Error }) => void;
    onRoomDidFailToConnect?: (event?: { roomName?: string; error?: Error }) => void;
    onParticipantAddedVideoTrack?: (event: { participantSid: string; trackSid: string }) => void;
    onParticipantRemovedVideoTrack?: (event: { participantSid: string; trackSid: string }) => void;
  }

  export class TwilioVideo extends React.Component<TwilioVideoProps> {
    connect(params: TwilioVideoConnectParams): void;
    disconnect(): void;
    setLocalAudioEnabled(enabled: boolean): Promise<boolean>;
    setLocalVideoEnabled(enabled: boolean): Promise<boolean>;
    flipCamera(): void;
  }

  export class TwilioVideoLocalView extends React.Component<ViewProps & { enabled?: boolean }> {}
  export class TwilioVideoParticipantView extends React.Component<ViewProps & { trackIdentifier: TrackIdentifier }> {}
}

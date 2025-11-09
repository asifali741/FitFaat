declare module '@zegocloud/zego-uikit-prebuilt-call-rn' {
  import { ComponentType } from 'react';

  export interface ZegoCallConfig {
    onCallEnd?: () => void;
    bottomMenuBarConfig?: {
      buttons?: string[];
    };
    turnOnCameraWhenJoining?: boolean;
    turnOnMicrophoneWhenJoining?: boolean;
    useSpeakerWhenJoining?: boolean;
    layout?: {
      mode?: string;
      config?: {
        switchLargeOrSmallViewByClick?: boolean;
      };
    };
  }

  export interface ZegoUIKitPrebuiltCallProps {
    appID: number;
    appSign: string;
    userID: string;
    userName: string;
    callID: string;
    config?: ZegoCallConfig;
  }

  export const ONE_ON_ONE_VIDEO_CALL_CONFIG: ZegoCallConfig;
  export const ZegoUIKitPrebuiltCall: ComponentType<ZegoUIKitPrebuiltCallProps>;
}

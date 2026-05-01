/**
 * ZegoCallProvider - Lightweight replacement for GlobalCallContext
 * 
 * With ZegoCloud, all call signaling is handled by the SDK itself.
 * No custom socket events needed for video call invitations.
 * This provider is kept as a wrapper for future extensibility.
 */
import React, { createContext, useContext } from 'react';

interface ZegoCallContextType {
  // Reserved for future use (e.g., call history, active call state)
}

const ZegoCallContext = createContext<ZegoCallContextType>({});

export const useZegoCall = () => {
  return useContext(ZegoCallContext);
};

export const ZegoCallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ZegoCallContext.Provider value={{}}>
      {children}
    </ZegoCallContext.Provider>
  );
};

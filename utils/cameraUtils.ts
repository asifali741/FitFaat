import { Alert } from 'react-native';

// Store the Zego engine instance globally
let zegoEngineInstance: any = null;
let currentCameraPosition: 'front' | 'back' = 'front';

export const initializeZegoEngine = (engine: any) => {
  zegoEngineInstance = engine;
  console.log('Zego engine initialized for camera utils');
};

export const getCameraPosition = () => currentCameraPosition;

export const getZegoEngineInstance = () => zegoEngineInstance;

export const switchCameraPosition = async (): Promise<boolean> => {
  try {
    const newPosition = currentCameraPosition === 'front' ? 'back' : 'front';
    const useFront = newPosition === 'front';
    
    console.log(`Attempting to switch camera from ${currentCameraPosition} to ${newPosition}`);
    
    // Try using the stored engine instance
    if (zegoEngineInstance) {
      if (typeof zegoEngineInstance.useFrontCamera === 'function') {
        await zegoEngineInstance.useFrontCamera(useFront);
        currentCameraPosition = newPosition;
        console.log(`Camera successfully switched to ${newPosition} using stored engine`);
        return true;
      }
      
      if (typeof zegoEngineInstance.switchCamera === 'function') {
        await zegoEngineInstance.switchCamera();
        currentCameraPosition = newPosition;
        console.log(`Camera successfully switched using switchCamera method`);
        return true;
      }
    }
    
    // Try accessing through window object (for web)
    if (typeof window !== 'undefined' && (window as any).ZegoExpressEngine) {
      const engine = (window as any).ZegoExpressEngine;
      if (engine.useFrontCamera) {
        await engine.useFrontCamera(useFront);
        currentCameraPosition = newPosition;
        console.log(`Camera switched using window.ZegoExpressEngine`);
        return true;
      }
    }
    
    // Try through require (dynamic import)
    try {
      const ZegoModule = require('@zegocloud/zego-express-engine-reactnative');
      if (ZegoModule && ZegoModule.default) {
        const engine = ZegoModule.default;
        if (engine.useFrontCamera) {
          await engine.useFrontCamera(useFront);
          currentCameraPosition = newPosition;
          console.log(`Camera switched using dynamic import`);
          return true;
        }
      }
    } catch (e) {
      console.log('Could not dynamically import Zego module');
    }
    
    // Update position even if we couldn't switch (for UI consistency)
    currentCameraPosition = newPosition;
    console.warn('Camera position updated in state only, actual switch may not have occurred');
    return false;
    
  } catch (error) {
    console.error('Error switching camera:', error);
    return false;
  }
};

// Helper to get Zego engine from the call component
export const extractZegoEngine = (zegoCallRef: any) => {
  if (!zegoCallRef?.current) return null;
  
  // Try different paths to access the engine
  const possiblePaths = [
    zegoCallRef.current.engine,
    zegoCallRef.current._engine,
    zegoCallRef.current.zegoEngine,
    zegoCallRef.current._zegoEngine,
    zegoCallRef.current.getEngine?.(),
    zegoCallRef.current._internalEngine,
  ];
  
  for (const engine of possiblePaths) {
    if (engine && typeof engine.useFrontCamera === 'function') {
      console.log('Found Zego engine through ref exploration');
      initializeZegoEngine(engine);
      return engine;
    }
  }
  
  return null;
};
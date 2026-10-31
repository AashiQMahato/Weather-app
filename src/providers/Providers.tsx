'use client';

import { MotionConfig } from 'motion/react';
import { PreferencesProvider } from './PreferencesProvider';
import { ToastProvider } from './ToastProvider';
import { WeatherProvider } from './WeatherProvider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={{ ease: [0.22, 1, 0.36, 1] }}>
      <PreferencesProvider>
        <WeatherProvider>
          <ToastProvider>{children}</ToastProvider>
        </WeatherProvider>
      </PreferencesProvider>
    </MotionConfig>
  );
}

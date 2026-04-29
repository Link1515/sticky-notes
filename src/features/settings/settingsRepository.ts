import { disable, enable, isEnabled } from '@tauri-apps/plugin-autostart';

export const readLaunchAtStartup = () => isEnabled();

export const writeLaunchAtStartup = async (enabled: boolean) => {
  if (enabled) {
    await enable();
    return;
  }

  await disable();
};

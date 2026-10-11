type Shape = ImportMetaEnv & {
  readonly VITE_API_MODE?: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_AGH_SETTINGS_URL?: string;
  readonly VITE_FLAG_DEMO_TOOLS?: string;
};

export const metaEnv: Shape = import.meta.env as Shape;

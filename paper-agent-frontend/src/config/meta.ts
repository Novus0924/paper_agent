type Shape = ImportMetaEnv & {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_AGH_SETTINGS_URL?: string;
};

export const metaEnv: Shape = import.meta.env as Shape;

/** How product features are grouped on the products page. Order here is display order. */
export const FEATURE_GROUP_IDS = ['cleaning', 'care', 'everyday'] as const;

export type FeatureGroupId = (typeof FEATURE_GROUP_IDS)[number];

export const FEATURE_GROUP_LABELS = {
  cleaning: { label: 'Cleaning', labelHi: 'सफ़ाई' },
  care: { label: 'Fabric care', labelHi: 'देखभाल' },
  everyday: { label: 'Everyday use', labelHi: 'सुविधा' },
} as const satisfies Record<FeatureGroupId, { label: string; labelHi: string }>;

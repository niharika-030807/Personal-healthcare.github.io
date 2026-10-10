import React from 'react';
import { AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const DisclaimerBanner: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-xs text-amber-900 flex items-center justify-center gap-2">
      <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
      <p className="max-w-6xl text-center leading-normal text-[11px] font-medium">
        {t('disclaimer')}
      </p>
    </div>
  );
};

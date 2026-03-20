import { useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { normalizeLanguage } from '../i18n';

export const useCurrentLanguage = () => {
  const { userProfile } = useAppContext();

  return useMemo(() => {
    return normalizeLanguage(userProfile?.settings?.language);
  }, [userProfile?.settings?.language]);
};

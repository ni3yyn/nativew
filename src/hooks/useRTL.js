import { useMemo } from 'react';
import { useCurrentLanguage } from './useCurrentLanguage';

export const useRTL = () => {
    const language = useCurrentLanguage();
    const isRTL = language === 'ar';

    return useMemo(() => ({
        isRTL,
        flexDirection: isRTL ? 'row-reverse' : 'row',
        textAlign: isRTL ? 'right' : 'left',
        flexStart: isRTL ? 'flex-end' : 'flex-start',
        flexEnd: isRTL ? 'flex-start' : 'flex-end',
        alignSelf: isRTL ? 'flex-end' : 'flex-start',
    }), [isRTL]);
};

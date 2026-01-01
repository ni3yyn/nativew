import { COLORS } from './theme';

export const CATEGORIES = [
    { 
        id: 'review', 
        label: 'تجارب حقيقية', 
        icon: 'star', 
        color: COLORS.accentGreen, 
        desc: 'شاركي رأيكِ في المنتجات بناءً على تحليلها.' 
    },
    { 
        id: 'journey', 
        label: 'رحلة البشرة', 
        icon: 'hourglass-half', 
        color: COLORS.gold, 
        desc: 'وثّقي تطور بشرتكِ أو شعركِ مع الصور.' 
    },
    { 
        id: 'qa', 
        label: 'سؤال وجواب', 
        icon: 'question-circle', 
        color: COLORS.blue, 
        desc: 'اطلبي المساعدة من المجتمع والخبراء.' 
    },
    { 
        id: 'routine_rate', 
        label: 'تقييم روتيني', 
        icon: 'clipboard-list', 
        color: COLORS.purple, 
        desc: 'اعرضي روتينكِ واحصلي على نصائح.' 
    } 
];
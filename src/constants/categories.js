// src/constants/categories.js

export const CATEGORIES = [
    {
        id: 'leaderboard',
        labelKey: 'leaderboard_category_label',
        icon: 'trophy',
        colorKey: 'gold',
        descKey: 'leaderboard_category_desc',
        isAction: true,
        action: 'leaderboard',
    },
    {
        id: 'review',
        labelKey: 'community_cat_review',
        icon: 'star',
        colorKey: 'accentGreen',
        descKey: 'community_cat_review_desc',
        isPostType: true,
    },
    {
        id: 'journey',
        labelKey: 'community_cat_journey',
        icon: 'hourglass-half',
        colorKey: 'gold',
        descKey: 'community_cat_journey_desc',
        isPostType: true,
    },
    {
        id: 'qa',
        labelKey: 'community_cat_qa',
        icon: 'question-circle',
        colorKey: 'blue',
        descKey: 'community_cat_qa_desc',
        isPostType: true,
    },
    {
        id: 'tips',
        labelKey: 'community_cat_tips',
        icon: 'headphones',
        colorKey: 'success',
        descKey: 'community_cat_tips_desc',
        isPostType: true,
    },
];

// Helper for modals / post creation so 'leaderboard' isn't selectable as a post type
export const POST_CATEGORIES = CATEGORIES.filter(c => c.isPostType);
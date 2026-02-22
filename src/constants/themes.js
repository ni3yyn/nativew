export const THEMES = {
  original: {
    id: 'original',
    name: 'Original',
    colors: {
      background: '#1A2D27',
      card: '#253D34',
      border: 'rgba(90, 156, 132, 0.25)',
      accentGreen: '#5A9C84', // Used as primary accent
      accentGlow: 'rgba(90, 156, 132, 0.4)',
      primary: '#A3E4D7',
      textPrimary: '#F1F3F2',
      textSecondary: '#A3B1AC',
      textOnAccent: '#1A2D27',
      success: '#10B981',
      danger: '#ef4444',
      warning: '#f59e0b',
      info: '#3b82f6',
      gold: '#F59E0B',
      blue: '#3B82F6',
      purple: '#8B5CF6',
      textDim: '#6B7C76',
      inputBg: 'rgba(0,0,0,0.2)',
      // Status bar style
      statusBar: 'light', 
      gradients: {
          primary: ['#1A2D27', '#253D34']
      }
    }
  },
  baby_pink: {
    id: 'baby_pink',
    label: 'وردي لطيف (Kawaii)',
    colors: {
        background: '#FFF5F8', // Very soft, clean strawberry milk background
        card: '#FFFFFF', // Pure white cards for modern crispness
        border: '#FDE2E8', // Soft pastel pink border
        textDim: '#CDBECA', // Muted mauve for subtle elements
        accentGreen: '#FF7DA5', // Vibrant, cute pastel pink (Main Accent)
        accentGlow: 'rgba(255, 125, 165, 0.3)',
        primary: '#FFD6E0', // Lighter complementary pink for highlights
        textPrimary: '#4A353B', // Deep cocoa brown (softer & cuter than black)
        textSecondary: '#9A7D84', // Dusty rose-brown for secondary text
        textOnAccent: '#FFFFFF',
        danger: '#FF4B4B', // Bright, punchy red
        warning: '#FFB042', // Cute sunny orange
        info: '#5AC8FA', // Soft sky blue
        success: '#34C759', // Clean apple green
        gold: '#FFD60A', // Vibrant gold
        blue: '#5AC8FA',
        purple: '#C084FC', // Pastel purple
        inputBg: 'rgba(255, 125, 165, 0.06)' // Very subtle pink tint for inputs
    }
},
clinical_blue: {
    id: 'clinical_blue',
    label: 'طبي حديث (أزرق)',
    colors: {
        background: '#F4F7FB', // Sleek, modern tech-slate background
        card: '#FFFFFF', // Pure white cards for a clinical, clean look
        border: 'rgba(59, 130, 246, 0.15)', // Glassy, subtle blue border
        textDim: '#94A3B8', // Tailwind Slate-400
        accentGreen: '#2563EB', // Trustworthy, sharp medical blue (Main Accent)
        accentGlow: 'rgba(37, 99, 235, 0.25)',
        primary: '#DBEAFE', // Very light ice-blue for highlights
        textPrimary: '#0F172A', // Dark sleek slate for high contrast reading
        textSecondary: '#475569', // Medium slate
        textOnAccent: '#FFFFFF',
        danger: '#EF4444', 
        warning: '#F59E0B',
        info: '#06B6D4', // Medical cyan
        success: '#10B981', // Clinical mint/emerald green
        gold: '#F59E0B',
        blue: '#2563EB',
        purple: '#8B5CF6',
        inputBg: 'rgba(37, 99, 235, 0.04)' // Nearly invisible icy input background
    }

  }
};

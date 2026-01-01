import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export const COLORS = {
  background: '#1A2D27',
  card: '#253D34',
  border: 'rgba(90, 156, 132, 0.25)',
  accentGreen: '#5A9C84',
  primary: '#A3E4D7',
  textPrimary: '#F1F3F2',
  textSecondary: '#A3B1AC',
  textOnAccent: '#1A2D27',
  danger: '#ef4444', 
  gold: '#F59E0B',
  blue: '#3B82F6',
  purple: '#8B5CF6',
  textDim: '#6B7C76',
  inputBg: 'rgba(0,0,0,0.2)'
};

export const SIZES = {
    width,
    height,
    padding: 20,
    borderRadius: 12
};
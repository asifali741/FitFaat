import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';

// Header dimensions - consistent across all screens
export const HEADER_PADDING_HORIZONTAL = wp(5);
export const HEADER_PADDING_VERTICAL = hp(1.2);
export const HEADER_HEIGHT = hp(1.2) * 2 + 24 + 16; // paddingVertical * 2 + icon size + extra space

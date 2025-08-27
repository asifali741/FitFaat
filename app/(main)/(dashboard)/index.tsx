import { ScreenSceneWrapper } from '@/components/common/ScreenTiltAnimation';
import { Topbar } from '@/components/common/TopBar';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { DayPlan } from './DayPlan';

export default function App() {
  const { width, height } =  useWindowDimensions();
  const dynamicStyles = {
    FullScreen: 
    {
      width: width,
      height: height,
    }
  };
  console.log("Width: "+width + " Height: "+ height);
  return (
    <ScreenSceneWrapper>
    <View style={[dynamicStyles.FullScreen]}>
      <Topbar/>
      <DayPlan/>
    </View>
    </ScreenSceneWrapper>
  );
}
//useEffect(()=>{

//},[])
const styles = StyleSheet.create({
  
});

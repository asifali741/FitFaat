import { ScreenSceneWrapper } from '@/components/common/ScreenTiltAnimation';
import { Topbar } from '@/components/common/TopBar';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import DayPlan from './DayPlan';
//import { DetailsDay } from './DetailsDay';
//import { DetailsTest } from './DetailsTest';
//import { ProgressTracker } from './circle';

export default function App() {
  const { width, height } =  useWindowDimensions();
  const dynamicStyles = {
    FullScreen: 
    {
      width: width,
      height: height,
    }
  };
  const temp = {
    radius: 50,
    progress: 60
  }
  console.log("Width: "+width + " Height: "+ height);
  return (
    <ScreenSceneWrapper>
    <View style={[dynamicStyles.FullScreen]}>
      <Topbar/>
      <DayPlan/>
      {
      //<DetailsDay/>
      //<DetailsTest/>
        //<ProgressTracker Props={temp} />
      }     
    </View>
    </ScreenSceneWrapper>
  );
}
//useEffect(()=>{

//},[])
const styles = StyleSheet.create({
  
});

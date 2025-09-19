import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import UploadScreen from "./src/screens/UploadScreen";
import FeedScreen from "./src/screens/FeedScreen";

const Stack = createNativeStackNavigator(); //store an stack navigator object into Stack 

export default function App() {
    return (
        <NavigationContainer> 
            <Stack.Navigator screenOptions={{ headerTitle: "Quiz Reels"}}>
                <Stack.Screen name="Upload" component={UploadScreen} />
                <Stack.Screen name="Feed" component={FeedScreen} />
            </Stack.Navigator>
        </NavigationContainer>
    );
}
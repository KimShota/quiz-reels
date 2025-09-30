import { useEffect, useState, useMemo, useCallback, useRef } from "react"; 
import { 
    View, 
    FlatList,
    ActivityIndicator,
    Dimensions, 
    Platform,
    StatusBar,
} from "react-native"; 
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase"; 
import MCQCard from "../components/MCQCard";

// Duolingo-inspired color palette
const colors = {
    background: '#f8fdf9', // Light green-tinted background
    foreground: '#1a1f2e', // Deep navy for text
    primary: '#58cc02', // Duolingo green
    secondary: '#ff9600', // Warm orange accent
    accent: '#1cb0f6', // Bright blue accent
    muted: '#f0f9f1', // Very light green
    mutedForeground: '#6b7280',
    card: '#ffffff',
    border: '#e8f5e8',
    destructive: '#dc2626', // Friendly red
};

const PAGE = 8; // each request will return 8 quizzes 

//main function
export default function FeedScreen({ navigation }: any) {
    const insets = useSafeAreaInsets(); 
    const win = Dimensions.get("window"); // get the dimensions of your device

    // Use full screen height for true full-screen experience like Instagram Reels
    const ITEM_HEIGHT = useMemo(
        () => win.height, 
        [win.height]
    ); 

    const [items, setItems] = useState<any[]>([]); // start with an empty array 
    const [from, setFrom] = useState(0); // begin loading from the first question 
    const [loading, setLoading] = useState(false); // check if loading is happening
    const [end, setEnd] = useState(false); // check if it is the end of the quiz table 
    
    // load function to fetch MCQs from the database 
    const load = useCallback(async () => {
        if (loading || end) return; 
        setLoading(true); 
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            console.log('No authenticated user found');
            setLoading(false);
            return;
        }

        const to = from + PAGE - 1; 
        
        //Fetch MCQs generated only by the user with the matching user_id 
        const { data, error } = await supabase 
            .from("mcqs")
            .select(`
                *,
                files!inner(
                    user_id
                )
            `)
            .eq("files.user_id", user.id) //only look at the current user 
            .order("created_at", { ascending: false })
            .range(from, to); 

        if (error) { //If there is an error, log it 
            console.error(error); 
        } else {
            setItems((cur) => [...cur, ...(data ?? [])]); //add new ones to the current list of quizzes
            if (!data || data.length < PAGE) setEnd(true); // if there are no more quizzes, set the end to true 
            setFrom((f) => f + PAGE); // increment the from by the page size to fetch the next quizzes
        }
        setLoading(false); // set loading to false 
    }, [from, loading, end]); 

    // load the quizzes when the component mounts 
    useEffect(() => {
        load(); 
    }, [load]); 

    const renderItem = useCallback(
        ({ item }: { item: any }) => (
            // Each item takes full screen height with no additional containers
            <MCQCard 
                item={item} 
                cardHeight={ITEM_HEIGHT}
                navigation={navigation}
                safeAreaInsets={insets} // Pass safe area insets to MCQCard
                colors={colors}
            />
        ), 
        [ITEM_HEIGHT, navigation, insets]
    ); 

    // extract the key (unique id) from the item 
    const keyExtractor = useCallback((it: any) => it.id, []); 

    // manually calculate the item layout for perfect snapping
    const getItemLayout = useCallback(
        (_: any, index: number) => ({
            length: ITEM_HEIGHT, 
            offset: ITEM_HEIGHT * index, 
            index, 
        }), 
        [ITEM_HEIGHT]
    ); 

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <StatusBar 
                barStyle="dark-content" 
                backgroundColor={colors.background}
                translucent={false}
            />
            <FlatList
                data={items}
                keyExtractor={keyExtractor}
                renderItem={renderItem}
                getItemLayout={getItemLayout}
                pagingEnabled={true} //each quiz takes up one full screen
                snapToInterval={ITEM_HEIGHT} //each snap lands at the top of the card 
                snapToAlignment="start" //the card's top edge line should align with the top of the screen
                decelerationRate={Platform.OS === "ios" ? 0.99 : 0.98} //controls how fast the scroll slows down after you swipe 
                showsVerticalScrollIndicator={false} //hid the scroll bar on the side 
                scrollEventThrottle={16} //control the speed of onScroll() reacting
                onEndReached={load} // Load more questions when near the end
                onEndReachedThreshold={0.7}
                removeClippedSubviews={true} // Performance optimization
                windowSize={3} // Keep only 3 screens in memory
                initialNumToRender={1} // Render only 1 question initially
                maxToRenderPerBatch={2} // Batch render 2 more as you scroll
                contentContainerStyle={{
                    flexGrow: 1, // Allow content to grow but no extra padding
                }}
                style={{ flex: 1 }} // Ensure FlatList takes full height
                bounces={false} // Disable bounce for more native feel
                overScrollMode="never" // Android: prevent over-scroll glow
                disableIntervalMomentum={true} // Prevent momentum from skipping items
                disableScrollViewPanResponder={false} // Allow pan gestures
                scrollEnabled={true} // Ensure scrolling is enabled
            />
            {loading && (
                <View style={{
                    position: "absolute",
                    top: insets.top + 60, // Position below status bar
                    right: 20,
                    backgroundColor: colors.card,
                    borderRadius: 20,
                    padding: 12,
                    shadowColor: colors.primary,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    elevation: 4,
                    zIndex: 1000, // Ensure loading indicator is on top
                }}>
                    <ActivityIndicator size="small" color={colors.primary} />
                </View>
            )}
        </View>
    ); 
}
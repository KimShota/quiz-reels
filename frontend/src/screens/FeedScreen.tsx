import { useEffect, useState, useMemo, useCallback } from   "react"; 
import { 
    View, 
    FlatList,
    ActivityIndicator,
    Dimensions, 
    Platform, 
} from "react-native"; 
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase"; 
import MCQCard from "../components/MCQCard";
import { isEnabled } from "react-native/Libraries/Performance/Systrace";

const PAGE = 8; //each request will return 8 quizzes 

export default function FeedScreen() {
    const insets = useSafeAreaInsets(); 
    const win = Dimensions.get("window"); //get the dimensions of your device

    //calculate the height of the item 
    const ITEM_HEIGHT = useMemo(
        () => win.height - insets.top -insets.bottom, 
        [win.height, insets.top, insets.bottom]
    ); 

    const [items, setItems] = useState<any[]>([]); //start with an emmpty array 
    const [from, setFrom] = useState(0); //begin loading from the first question 
    const [loading, setLoading] = useState(false); //check if loading is happening
    const [end, setEnd] = useState(false); //check if it is the end of the quiz table 
    
    //load function to fetch MCQs from the database 
    const load = useCallback(async () => {
        if (loading || end) return; 
        setLoading(true); 
        const to = from + PAGE - 1; 
        const { data, error } = await supabase //get quizzes from the database 
            .from("mcqs")
            .select("*") //select all the columns 
            .order("created_at", { ascending: false })
            .range(from, to); 

        if (error){ //if there is an error, log it 
            console.error(error); 
        } else {
            setItems((cur) => [...cur, ...(data ?? [])]); //add new ones to the current list of quizzes
            if (!data || data.length < PAGE) setEnd(true); //if there are no more quizzes, set the end to true 
            setFrom((f) => f + PAGE); //increment the from by the page size to fetch the next quizzes
        }
        setLoading(false); //set loading to false 
    }, [from, loading, end]); 

    //load the quizzes when the component mounts 
    useEffect(() => {
        load(); 
    }, [load]); 

    const renderItem = useCallback(
        ({ item }: { item: any }) => (
            <View style={{ height: ITEM_HEIGHT }}>
                <MCQCard item={item} cardHeight={ITEM_HEIGHT} />
            </View>
        ), 
        [ITEM_HEIGHT]
    ); 

    //extract the key (unique id) from the item 
    const keyExtractor = useCallback((it: any) => it.id, []); 

    //manually calculate the item layout
    const getItemLayout = useCallback(
        (_: any, index:number) => ({
            length: ITEM_HEIGHT, 
            offset: ITEM_HEIGHT * index, 
            index, 
        }), 
        [ITEM_HEIGHT]
    ); 

    return (
        <View style={{ flex: 1, backgroundColor: "black" }}>
            <FlatList
                data={items}
                keyExtractor={keyExtractor}
                renderItem={renderItem}
                getItemLayout={getItemLayout}
                pagingEnabled 
                snapToInterval={ITEM_HEIGHT} //each swipe will snap to the height of the item 
                snapToAlignment="start" //snap to the start of the item 
                decelerationRate={Platform.OS === "ios" ? "fast" : 0.99}
                showsVerticalScrollIndicator={false} //hid the scroll bar
                onEndReached={load} //load more questions when near the end of the quiz 
                onEndReachedThreshold={0.7}
                removeClippedSubviews
                windowSize={3}
                initialNumToRender={1} //render only 1 question first
                maxToRenderPerBatch={2} //keep preparing 2 more questions as you scroll
                contentContainerStyle={{
                    paddingTop: insets.top, //avoid notch at the top
                    paddingBottom: insets.bottom, //avoid home bar at the bottom 
                }}
            />
            {loading && (
                <ActivityIndicator style={{ position: "absolute", top: 16, right: 16 }} />
            )}
        </View>
    ); 
}
import { useEffect, useState, useCallback } from   "react"; 
import { View, FlatList, RefreshControl, ActivityIndicator } from "react-native"; 
import { supabase } from "../lib/supabase"; 
import MCQCard from "../components/MCQCard";

const PAGE = 8; //each request will return 8 quizzes 

export default function FeedScreen() {
    const [items, setItems] = useState<any[]>([]); //start with an emmpty array 
    const [from, setFrom] = useState(0); 
    const [loading, setLoading] = useState(false); 
    const [refreshing, setRefreshing] = useState(false); 
    const [end, setEnd] = useState(false); //end of the quiz table 
    
    //load function to fetch MCQs from the database 
    const load = useCallback(async () => {
        if (loading || end) return; 
        setLoading(true); 
        const to = from + PAGE - 1; 
        const { data, error } = await supabase 
            .from("mcqs")
            .select("*") //select all the columns 
            .order("created_at", { ascending: false })
            .range(from, to); 
        if (error){
            console.error(error); 
        } else {
            setItems((cur) => [...cur, ...(data ?? [])]); //combine the current one with the new ones too
            if (!data || data.length < PAGE) setEnd(true); 
            setFrom((f) => f + PAGE); 
        }
        setLoading(false); 
    }, [from, loading, end]); 

    //reset everything when reloading 
    const reload = useCallback(async () => {
        setRefreshing(true); 
        setItems([]); 
        setFrom(0); 
        setEnd(false); 
        setRefreshing(false); 
    }, []); 


    //function to run load 
    useEffect(() => {
        load(); 
    }, [load]); 

    return (
        <View style={{ flex: 1, backgroundColor: "black" }}>
            <FlatList
                data={items}
                keyExtractor={(it) => it.id}
                renderItem={({ item }) => <MCQCard item={item} />}
                onEndReached={() => load()}
                onEndReachedThreshold={0.6} //how far from the bottom user must scroll 
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={reload} />
                }
                pagingEnabled
                showsVerticalScrollIndicator={false}
            />
            {loading && <ActivityIndicator style={{ position: "absolute", top: 16, right: 16}} />}
        </View>
    ); 
}
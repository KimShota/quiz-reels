import { useState } from "react"; 
import { View, Text, Pressable } from "react-native"; 

export default function MCQCard ({ item }: any) {
    const [selected, setSelected] = useState<number | null>(null);
    const isAnswered = selected !== null; //check if user already chose answer 


    return (
        <View style={{ height: 680, justifyContent: "center", padding: 16 }}>
            <Text style={{ fontSize: 20, fontWeight: "700", marginBottom: 12, color: "white"}}>
                {item.question}
            </Text>

            {/* Loop over each option */}
            {item.options.map((opt: string, idx: number) => {
                const correct = idx === item.answer_index;   //store true if option is correct
                const picked = idx === selected;  //store true if user has selected
                //nested tenary operator
                const bg = !isAnswered
                    ? "#222"
                    : picked && correct
                    ? "#1e7d4d"
                    : picked && !correct
                    ? "#8b1c1c"
                    : correct
                    ? "#1e7d4d"
                    : "#333"; 
                
                return (
                    <Pressable
                        key={idx}
                        onPress={() => !isAnswered && setSelected(idx)}
                        style={{
                            backgroundColor: bg, 
                            padding: 14, 
                            borderRadius: 10, 
                            marginBottom: 10,
                        }}
                    >
                        <Text style={{color: "white", fontSize: 16}}>{opt}</Text>
                    </Pressable>
                );
            })}
        </View>
    );

}
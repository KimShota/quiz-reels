import { useState } from "react"; 
import { View, Text, Pressable } from "react-native"; 

type Props = {
    item: {
        id: string; 
        question: string; 
        options: string[];  
        answer_index: number; 
    }; 
    cardHeight: number; 
}; 

export default function MCQCard ({ item, cardHeight }: Props) {
    const [selected, setSelected] = useState<number | null>(null);
    const isAnswered = selected !== null; //check if user already chose answer 

    return (
        <View
            style={{
                height: cardHeight, 
                paddingHorizontal: 16, 
                paddingVertical: 20, 
                justifyContent: "space-between",
            }}
        > 
            <View style={{ flexShrink: 0 }}>
                <Text
                    numberOfLines={4} //max 4 lines of text, otherwise display ...
                    style={{ color: "white", fontSize: 22, fontWeight: "700" }}
                >
                    {item.question} {/* Display the questions */}
                </Text>
            </View>

            <View style={{ gap: 10 }}>
                {item.options.map((opt, idx) => {
                    const correct = idx === item.answer_index; 
                    const picked = idx === selected; 
                    const bg = !isAnswered
                        ? "#262626"
                        : picked && correct
                        ? "#168a57"
                        : picked && !correct
                        ? "#8a1f2a"
                        : correct
                        ? "#168a57"
                        : "#333"; 

                    return (
                        <Pressable
                            key={idx}
                            onPress={() => !isAnswered && setSelected(idx)}
                            style={{
                                backgroundColor: bg, 
                                padding: 14, 
                                borderRadius: 12,
                                borderWidth: 1, 
                                borderColor: "#444", 
                            }}
                        >
                            <Text style={{ color: "white", fontSize: 16}}>{opt}</Text>
                        </Pressable>
                    ); 
                })}
            </View>
            <View style={{ height: 8 }} />

        </View>
    ); 
} 
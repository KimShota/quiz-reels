import { useState } from "react"; 
import { View, Text, Pressable, StyleSheet } from "react-native"; 
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

type Props = {
    item: {
        id: string; 
        question: string; 
        options: string[];  
        answer_index: number; 
    }; 
    cardHeight: number;
    navigation?: any;
    safeAreaInsets?: {
        top: number;
        bottom: number;
        left: number;
        right: number;
    };
    colors?: {
        background: string;
        foreground: string;
        primary: string;
        secondary: string;
        accent: string;
        muted: string;
        mutedForeground: string;
        card: string;
        border: string;
        destructive: string;
    };
}; 

export default function MCQCard({ item, cardHeight, navigation, safeAreaInsets, colors }: Props) {
    const [selected, setSelected] = useState<number | null>(null);
    const isAnswered = selected !== null; // check if user already chose answer 

    // Default colors if not provided
    const defaultColors = {
        background: '#f8fdf9',
        foreground: '#1a1f2e',
        primary: '#58cc02',
        secondary: '#ff9600',
        accent: '#1cb0f6',
        muted: '#f0f9f1',
        mutedForeground: '#6b7280',
        card: '#ffffff',
        border: '#e8f5e8',
        destructive: '#dc2626',
    };

    const theme = colors || defaultColors;
    const insets = safeAreaInsets || { top: 0, bottom: 0, left: 0, right: 0 };

    const getOptionStyle = (optionIndex: number) => {
        const correct = optionIndex === item.answer_index; //correct option 
        const picked = optionIndex === selected; //chosen option 

        //default color if not chosen yet
        if (!isAnswered) {
            return {
                backgroundColor: theme.card,
                borderColor: theme.border,
                borderWidth: 2,
            };
        }

        //make the button green when it is correct
        if (correct) {
            return {
                backgroundColor: theme.primary,
                borderColor: theme.primary,
                borderWidth: 2,
                transform: [{ scale: 1.02 }],
            };
        }

        //make the button red 
        if (picked && !correct) {
            return {
                backgroundColor: theme.destructive,
                borderColor: theme.destructive,
                borderWidth: 2,
            };
        }

        return {
            backgroundColor: theme.muted,
            borderColor: theme.border,
            borderWidth: 2,
            opacity: 0.6,
        };
    };

    const getOptionTextStyle = (optionIndex: number) => {
        const correct = optionIndex === item.answer_index;
        const picked = optionIndex === selected;

        if (!isAnswered) {
            return { color: theme.foreground };
        }

        if (correct || (picked && !correct)) {
            return { color: '#ffffff' };
        }

        return { color: theme.mutedForeground };
    };

    return (
        <View style={[
            styles.container, 
            { 
                height: cardHeight, 
                backgroundColor: theme.background,
                paddingTop: insets.top,
                paddingBottom: insets.bottom,
            }
        ]}>

            {/* Header */}
            <View style={styles.header}>
                <Pressable 
                    style={[styles.backButton, { backgroundColor: theme.card, borderColor: theme.border }]}
                    onPress={() => navigation?.goBack()}
                >
                    <Ionicons name="chevron-back" size={24} color={theme.foreground} />
                </Pressable>
                <View style={styles.spacer} />
            </View>

            {/* Main Content - This takes the remaining space */}
            <View style={styles.mainContent}>
                {/* Question */}
                <View style={styles.questionContainer}>
                    <Text style={[styles.questionText, { color: theme.foreground }]}>
                        {item.question}
                    </Text>
                    
                    {/* Explanation (shown after answering) */}
                    {/* {isAnswered && (
                        <View style={[styles.explanationContainer, { 
                            backgroundColor: `${theme.accent}1A`, 
                            borderColor: `${theme.accent}4D` 
                        }]}>
                            <View style={styles.explanationHeader}>
                                <Ionicons name="flash" size={20} color={theme.accent} />
                                <Text style={[styles.explanationTitle, { color: theme.accent }]}>
                                    Explanation
                                </Text>
                            </View>
                            <Text style={[styles.explanationText, { color: theme.foreground }]}>
                                {selected === item.answer_index 
                                    ? "Great job! You got it right! 🎉" 
                                    : "Don't worry, keep practicing! The correct answer is highlighted in green. 💪"
                                }
                            </Text>
                        </View>
                    )} */}
                </View>

                {/* Options */}
                <View style={styles.optionsContainer}>
                    {item.options.map((opt, idx) => {
                        const optionStyle = getOptionStyle(idx);
                        const textStyle = getOptionTextStyle(idx);

                        return (
                            <Pressable
                                key={idx}
                                onPress={() => !isAnswered && setSelected(idx)}
                                style={[styles.optionButton, optionStyle]}
                                disabled={isAnswered}
                            >
                                <Text style={[styles.optionText, textStyle]}>
                                    {opt}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>
            </View>
        </View>
    ); 
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 24,
        // No justifyContent here - let children define their own spacing
    },
    statusBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
    },
    statusLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    time: {
        fontSize: 18,
        fontWeight: '900',
    },
    moon: {
        fontSize: 12,
    },
    statusRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    signalBars: {
        flexDirection: 'row',
        gap: 1,
        marginRight: 8,
    },
    signalBar: {
        width: 3,
        height: 12,
        borderRadius: 2,
    },
    statusIcon: {
        marginLeft: 4,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
    },
    backButton: {
        padding: 12,
        borderRadius: 50,
        borderWidth: 2,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '900',
    },
    spacer: {
        width: 48,
    },
    progressContainer: {
        width: '100%',
        height: 12,
        borderRadius: 6,
        marginVertical: 16,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        width: '60%',
        borderRadius: 6,
    },
    mainContent: {
        flex: 1, // This takes all remaining space
        justifyContent: 'flex-start', // Start from top instead of center
        paddingVertical: 20,
    },
    questionContainer: {
        alignItems: 'center',
        marginBottom: 60, // Increased margin to push question higher
    },
    questionText: {
        fontSize: 28,
        fontWeight: '900',
        textAlign: 'center',
        lineHeight: 36,
        marginBottom: 16,
        paddingHorizontal: 8,
    },
    explanationContainer: {
        borderRadius: 16,
        borderWidth: 2,
        padding: 20,
        marginTop: 24,
        width: '100%',
    },
    explanationHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    explanationTitle: {
        fontWeight: 'bold',
        fontSize: 16,
    },
    explanationText: {
        fontSize: 14,
        lineHeight: 20,
    },
    optionsContainer: {
        gap: 30, //gap between each option 
    },
    optionButton: {
        padding: 24, // Slightly reduced padding
        borderRadius: 16,
        alignItems: 'flex-start',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    optionText: {
        fontSize: 18,
        fontWeight: 'bold',
        lineHeight: 24,
    },
    bottomIndicator: {
        alignItems: 'center',
        paddingVertical: 16,
    },
    indicatorGradient: {
        width: 128,
        height: 4,
        borderRadius: 2,
    },
});
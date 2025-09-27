import { useState } from "react";
import { View, Text, Button, Alert, ActivityIndicator, TouchableOpacity, SafeAreaView, StatusBar, StyleSheet, Modal, Animated } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "../lib/supabase";
import { LinearGradient } from "expo-linear-gradient"; 
import { Ionicons } from '@expo/vector-icons'; 

//Color theme 
const colors = {
    background: '#f8fdf9', //light green-tinted background color
    foreground: '#1a1f2e', //deep navy for text 
    primary: '#58cc02', // Duolingo kinda green
    secondary: '#ff9600', // Warm orange accent
    accent: '#1cb0f6', // Bright blue accent
    muted: '#f0f9f1', // Very light green
    mutedForeground: '#6b7280',
    card: '#ffffff',
    border: '#e8f5e8',
}

//URL to supabase edge function
const function_url = "/functions/v1/generate-mcqs"; 

export default function UploadScreen({ navigation }: any ){
    const [loading, setLoading] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false); 

    async function loadPdf(){
        const result = await DocumentPicker.getDocumentAsync({
            type: ["application/pdf"], 
            multiple: false, 
            copyToCacheDirectory: true, //stores files into app's cache folder 
        }); 
        if(result.canceled || !result.assets?.[0]) return; 
        await handleUpload(result.assets[0].uri, "application/pdf"); 
    }

    async function loadImage(){
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync(); 
        if (status !== "granted"){
            Alert.alert("Permission Required", "We need media permissions"); 
            return; 
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images, 
            base64: false, 
            quality: 0.7, // Reduced quality to 70% for smaller file size
            allowsEditing: false,
        }); 
        if (result.canceled || !result.assets?.[0]) return; 
        
        // Get proper MIME type from file extension
        const uri = result.assets[0].uri;
        const fileExt = uri.split(".").pop()?.toLowerCase();
        let mimeType = "image/jpeg"; // default
        
        switch (fileExt) {
            case "jpg":
            case "jpeg":
                mimeType = "image/jpeg";
                break;
            case "png":
                mimeType = "image/png";
                break;
            case "gif":
                mimeType = "image/gif";
                break;
            case "webp":
                mimeType = "image/webp";
                break;
        }
        
        await handleUpload(uri, mimeType); 
    }


    async function handleUpload(uri: string, mime: string){
        try {
            setLoading(true); //set loading state to true 

        //creates a filename and path
        const fileExt = uri.split(".").pop() ?? "bin"; //take pdf at the last
        const fileName = `${Date.now()}.${fileExt}`; 
        const filePath = `upload/${fileName}`; 

        const file = await fetch(uri); //ask the server to get the file path data
        const arrayBuffer = await file.arrayBuffer(); //take the raw bits of filepath
        const uint8Array = new Uint8Array(arrayBuffer); //makes an array where each element consists of 8 bits


        //store the file path into the upload folder inside storage 
        const { error: upErr } = await supabase.storage 
            .from("study") //go to the study storage 
            .upload(filePath, uint8Array, { //inside the upload folder 
                contentType: mime, 
                upsert: false, //prohibit from overwriting 
            }); 
        
        if (upErr) throw upErr; 

        const { data: pub } = supabase.storage.from("study").getPublicUrl(filePath); //stores an object that contains url
        const publicUrl = pub?.publicUrl; //store the public url 
        if (!publicUrl) throw new Error("Public URL is not created"); 

        //return an object with only the row you inserted the path and url into
        const { data: files, error: fErr } = await supabase 
            .from("files")
            .insert([{ 
                storage_path: filePath, 
                public_url: publicUrl, 
                mime_type: mime,
            }])
            .select()
            .limit(1)

        if (fErr) throw fErr; 
        const fileRow = files![0]; 

        const baseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!; //get supabase public url 
        const fnRes = await fetch(`${baseUrl}${function_url}`, {
            method: "POST", 
            headers: {
                "Content-Type": "application/json", 
                apikey:  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!, //anon key (public api key to access database with RLS)
                Authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!}`,
            },
            body: JSON.stringify({ file_id: fileRow.id }),
        }); 

        if (!fnRes.ok){
            throw new Error(await fnRes.text()); 
        }

        setShowSuccessModal(true);
        } catch (e: any) {
            let errorMessage = e.message ?? String(e);
            
            // Parse Gemini API errors for better user experience
            if (errorMessage.includes("503") || errorMessage.includes("UNAVAILABLE")) {
                errorMessage = "The AI service is temporarily unavailable. Please try again in a few minutes.";
            } else if (errorMessage.includes("400") || errorMessage.includes("INVALID_ARGUMENT")) {
                errorMessage = "The file format is not supported. Please try a different file.";
            } else if (errorMessage.includes("403") || errorMessage.includes("PERMISSION_DENIED")) {
                errorMessage = "Access denied. Please check your API configuration.";
            } else if (errorMessage.includes("File too large")) {
                errorMessage = "The image file is too large. Please compress it or use a smaller image.";
            } else if (errorMessage.includes("413") || errorMessage.includes("PAYLOAD_TOO_LARGE")) {
                errorMessage = "The image file is too large. Please compress it or use a smaller image.";
            } else if (errorMessage.includes("429") || errorMessage.includes("QUOTA_EXCEEDED")) {
                errorMessage = "API quota exceeded. Please try again later.";
            }
            
            Alert.alert("Upload Error", errorMessage); 
        } finally {
            setLoading(false); //set loading to false no matter what
        }
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
            
            {/* Header with back button and sparkles */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Edu-Shorts</Text>
                <Ionicons name="sparkles" size={24} color={colors.secondary} />
            </View>

            {/* Main Content */}
            <View style={styles.mainContent}>
                {/* Hero Section */}
                <View style={styles.heroSection}>
                    <LinearGradient
                        colors={[colors.primary, colors.accent]}
                        style={styles.iconContainer}
                    >
                        <Ionicons name="scan" size={48} color="white" />
                    </LinearGradient>
                    <Text style={styles.heroTitle}>Upload your materials!</Text>
                    <Text style={styles.heroSubtitle}>
                        Choose your materials and let's get started! 🚀
                    </Text>
                </View>

                {/* Upload Cards */}
                <View style={styles.cardsContainer}>
                    <TouchableOpacity
                        style={[styles.card, styles.pdfCard]}
                        onPress={loadPdf}
                        activeOpacity={0.95}
                        disabled={loading}
                    >
                        <LinearGradient
                            colors={[colors.primary, colors.primary + 'CC']}
                            style={styles.cardIcon}
                        >
                            <Ionicons name="document-text" size={36} color="white" />
                        </LinearGradient>
                        <View style={styles.cardContent}>
                            <Text style={styles.cardTitle}>PDF Document</Text>
                            <Text style={styles.cardSubtitle}>Scan text and extract data ✨</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.card, styles.imageCard]}
                        onPress={loadImage}
                        activeOpacity={0.95}
                        disabled={loading}
                    >
                        <LinearGradient
                            colors={[colors.secondary, colors.secondary + 'CC']}
                            style={styles.cardIcon}
                        >
                            <Ionicons name="image" size={36} color="white" />
                        </LinearGradient>
                        <View style={styles.cardContent}>
                            <Text style={styles.cardTitle}>Image File</Text>
                            <Text style={styles.cardSubtitle}>Process visual content 📸</Text>
                        </View>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Loading Overlay */}
            {loading && (
                <View style={styles.loadingOverlay}>
                    <View style={styles.loadingCard}>
                        <ActivityIndicator size="large" color={colors.primary} />
                        <Text style={styles.loadingText}>Processing...</Text>
                    </View>
                </View>
            )}

            {/* Success Modal */}
            <Modal
                visible={showSuccessModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowSuccessModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.successModal}>
                        <View style={styles.successIconContainer}>
                            <Ionicons name="checkmark-circle" size={80} color={colors.primary} />
                        </View>
                        
                        <Text style={styles.successTitle}>MCQs are Ready! 🎉</Text>
                        <Text style={styles.successMessage}>
                            Your MCQs have been generated successfully! Ready to practice?
                        </Text>
                        
                        <TouchableOpacity
                            style={styles.practiceButton}
                            onPress={() => {
                                setShowSuccessModal(false);
                                navigation.navigate("Feed");
                            }}
                        >
                            <LinearGradient
                                colors={[colors.primary, colors.accent]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.practiceButtonGradient}
                            >
                                <Ionicons name="bulb" size={24} color="white" />
                                <Text style={styles.practiceButtonText}>Practice MCQs</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    ); 
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingVertical: 20,
        backgroundColor: `${colors.primary}08`,
    },
    backButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: `${colors.primary}15`,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        paddingLeft: 120, //bring the title to the center 
        color: colors.foreground,
    },
    mainContent: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 32,
    },
    heroSection: {
        alignItems: 'center',
        marginBottom: 32,
    },
    iconContainer: {
        width: 96,
        height: 96,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 8,
    },
    heroTitle: {
        fontSize: 28,
        fontWeight: '900',
        color: colors.foreground,
        textAlign: 'center',
        marginBottom: 16,
        lineHeight: 34,
    },
    heroSubtitle: {
        fontSize: 16,
        color: colors.mutedForeground,
        textAlign: 'center',
        fontWeight: '500',
        paddingHorizontal: 8,
        lineHeight: 24,
    },
    cardsContainer: {
        gap: 20,
        marginBottom: 24,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 28,
        borderRadius: 24,
        borderWidth: 2,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 4,
    },
    pdfCard: {
        backgroundColor: colors.card,
        borderColor: `${colors.primary}33`,
        shadowColor: colors.primary,
    },
    imageCard: {
        backgroundColor: colors.card,
        borderColor: `${colors.secondary}33`,
        shadowColor: colors.secondary,
    },
    cardIcon: {
        width: 72,
        height: 72,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 20,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
    cardContent: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 20,
        fontWeight: '900',
        color: colors.foreground,
        marginBottom: 4,
    },
    cardSubtitle: {
        fontSize: 14,
        color: colors.mutedForeground,
        fontWeight: '500',
    },
    actionButtons: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 16,
        paddingTop: 16,
    },
    actionButton: {
        paddingVertical: 12,
        paddingHorizontal: 32,
        borderRadius: 20,
        borderWidth: 1,
    },
    accentButton: {
        backgroundColor: `${colors.accent}1A`,
        borderColor: `${colors.accent}4D`,
    },
    primaryButton: {
        backgroundColor: `${colors.primary}1A`,
        borderColor: `${colors.primary}4D`,
    },
    actionButtonText: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingCard: {
        backgroundColor: colors.card,
        padding: 32,
        borderRadius: 20,
        alignItems: 'center',
        gap: 16,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 8,
    },
    loadingText: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.foreground,
    },
    bottomIndicator: {
        alignItems: 'center',
        paddingBottom: 16,
    },
    indicatorGradient: {
        width: 144,
        height: 6,
        borderRadius: 3,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    successModal: {
        backgroundColor: colors.card,
        borderRadius: 24,
        padding: 32,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 16,
        maxWidth: 320,
        width: '100%',
    },
    successIconContainer: {
        marginBottom: 24,
    },
    successTitle: {
        fontSize: 25,
        fontWeight: '900',
        color: colors.foreground,
        marginBottom: 16,
        textAlign: 'center',
    },
    successMessage: {
        fontSize: 16,
        color: colors.mutedForeground,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 32,
    },
    practiceButton: {
        width: '100%',
        borderRadius: 16,
        overflow: 'hidden',
    },
    practiceButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 24,
        gap: 8,
    },
    practiceButtonText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: 'white',
    },
});
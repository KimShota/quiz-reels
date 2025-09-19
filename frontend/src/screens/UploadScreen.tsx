import { useState } from "react";
import { View, Text, Button, Alert, ActivityIndicator } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "../lib/supabase";

// Edge Function endpoint (relative to your Supabase URL)
const FUNCTION_URL = "/functions/v1/generate-mcqs";

export default function UploadScreen({ navigation }: any) {
    const [loading, setLoading] = useState(false);

  // function to load pdf
    async function pickPdf() {
        const res = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf"],
        multiple: false,
        copyToCacheDirectory: true,
        });
        if (res.canceled || !res.assets?.[0]) return;
        await handleUpload(res.assets[0].uri, "application/pdf");
    }

  // function to load image
    async function pickImage() {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
        Alert.alert("Permission required", "We need media permissions.");
        return;
        }
        const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        base64: false,
        quality: 0.9,
        });
        if (res.canceled || !res.assets?.[0]) return;
        await handleUpload(res.assets[0].uri, "image/*");
    }

    async function handleUpload(uri: string, mime: string) {
        try {
            setLoading(true);

            // 1) Prepare filename & path
            const fileExt = uri.split(".").pop() ?? "bin";
            const fileName = `${Date.now()}.${fileExt}`;
            const filePath = `uploads/${fileName}`;

            // 2) Convert local file URI to ArrayBuffer (works in React Native)
            const file = await fetch(uri);
            const arrayBuffer = await file.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);

            // 3) Upload file to Supabase storage
            const { error: upErr } = await supabase.storage
            .from("study")
            .upload(filePath, uint8Array, {
                contentType: mime,
                upsert: false,
            });

            if (upErr) throw upErr;

            // 4) Get public URL
            const { data: pub } = supabase.storage.from("study").getPublicUrl(filePath);
            const publicUrl = pub?.publicUrl;
            if (!publicUrl) throw new Error("No public URL created");

            // 5) Insert into files table
            const { data: files, error: fErr } = await supabase
            .from("files")
            .insert([{ storage_path: filePath, public_url: publicUrl }])
            .select()
            .limit(1);

            if (fErr) throw fErr;
            const fileRow = files![0];

            // 6) Call the Edge Function
            const baseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
            const fnRes = await fetch(`${baseUrl}${FUNCTION_URL}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!, // anon key
                Authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!}`, // also an
            },
            body: JSON.stringify({ file_id: fileRow.id }),
            });

            if (!fnRes.ok) {
            throw new Error(await fnRes.text());
            }

            Alert.alert("Uploaded!", "MCQ generation started. Go to the Feed.");
            navigation.navigate("Feed");
        } catch (e: any) {
            Alert.alert("Upload Error", e.message ?? String(e));
        } finally {
            setLoading(false);
        }
    }


    return (
        <View style={{ flex: 1, padding: 20, justifyContent: "center" }}>
        <Text style={{ fontSize: 22, fontWeight: "600", textAlign: "center" }}>
            Upload study materials!
        </Text>
        <View style={{ marginVertical: 8 }}>
            <Button title="Pick PDF" onPress={pickPdf} />
        </View>
        <View style={{ marginVertical: 8 }}>
            <Button title="Pick Image" onPress={pickImage} />
        </View>
        {loading && <ActivityIndicator style={{ marginVertical: 8 }} />}
        <View style={{ marginVertical: 8 }}>
            <Button title="Go to Feed" onPress={() => navigation.navigate("Feed")} />
        </View>
        </View>
    );
}

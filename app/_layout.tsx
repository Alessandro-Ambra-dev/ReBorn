import { useEffect } from "react";
import { Stack, useRouter } from "expo-router";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { StatusBar } from "expo-status-bar";

const APP_BG = "#0f172a";

function RootLayoutNav() {
  const { session, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.replace("/(auth)/login");
    } else {
      router.replace("/(tabs)");
    }
  }, [session, loading]);

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: APP_BG } }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="light" backgroundColor={APP_BG} translucent={false} />
      <RootLayoutNav />
    </AuthProvider>
  );
}

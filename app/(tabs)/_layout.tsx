import { Image, View } from "react-native";
import { Tabs } from "expo-router";

const TAB_ICON_SIZE = 45;
const APP_BG = "#0f172a";
const SURFACE = "#1e293b";
const ACTIVE_TINT = "#22c55e";

function TabIcon(props: { source: any; focused: boolean; iconScale?: number }) {
  const { source, focused, iconScale = 1 } = props;
  return (
    <View
      style={{
        padding: focused ? 8 : 4,
        borderRadius: 999,
        backgroundColor: focused ? "rgba(34,197,94,0.15)" : "transparent",
        shadowColor: focused ? ACTIVE_TINT : "transparent",
        shadowOpacity: focused ? 0.7 : 0,
        shadowRadius: focused ? 12 : 0,
        shadowOffset: { width: 0, height: 0 },
        elevation: focused ? 10 : 0,
        transform: [{ scale: focused ? 1.05 : 1 }],
      }}
    >
      <Image
        source={source}
        style={{
          width: TAB_ICON_SIZE * iconScale,
          height: TAB_ICON_SIZE * iconScale,
          tintColor: ACTIVE_TINT,
          opacity: focused ? 1 : 0.7,
        }}
        resizeMode="contain"
      />
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: APP_BG },
        headerTintColor: "#f8fafc",
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: APP_BG,
          borderTopColor: SURFACE,
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: ACTIVE_TINT,
        tabBarInactiveTintColor: "#475569",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} iconScale={0.9} source={require("@/assets/images/home_reborn.png")} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Esplora",
          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              source={require("@/assets/images/esplora_reborn.png")}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="foods"
        options={{
          title: "Cibi",
          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              source={require("@/assets/images/cibi_reborn.png")}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profilo",
          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              source={require("@/assets/images/profilo_reborn.png")}
            />
          ),
        }}
      />
    </Tabs>
  );
}

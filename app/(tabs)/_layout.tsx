import { Image } from "react-native";
import { Tabs } from "expo-router";

const TAB_ICON_SIZE = 60;

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#2563eb",
        headerShown: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: () => (
            <Image
              source={require("@/assets/images/tab_home_reborn.png")}
              style={{ width: TAB_ICON_SIZE, height: TAB_ICON_SIZE }}
              resizeMode="contain"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Esplora",
          tabBarIcon: () => (
            <Image
              source={require("@/assets/images/tab_esplora_reborn.png")}
              style={{ width: TAB_ICON_SIZE, height: TAB_ICON_SIZE }}
              resizeMode="contain"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profilo",
          tabBarIcon: () => (
            <Image
              source={require("@/assets/images/tab_profilo_reborn.png")}
              style={{ width: TAB_ICON_SIZE, height: TAB_ICON_SIZE }}
              resizeMode="contain"
            />
          ),
        }}
      />
    </Tabs>
  );
}

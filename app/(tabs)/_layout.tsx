import { Tabs } from "expo-router";
import React from "react";
import { Image, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        lazy: true,
        tabBarActiveTintColor: "#FFE29A",
        tabBarInactiveTintColor: "rgba(231,220,190,0.58)",
        tabBarStyle: {
          backgroundColor: "#07131F",
          borderTopWidth: 1,
          borderTopColor: "#D9A83E",
          height: 70 + insets.bottom,
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 10),
        },
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => (
            <Image
              source={require("../../assets/icons/home.png")}
              style={{ width: 56, height: 56, tintColor: color }}
              resizeMode="contain"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Map",
          tabBarIcon: ({ color }) => (
            <Image
              source={require("../../assets/icons/explore.png")}
              style={{ width: 56, height: 56, tintColor: color }}
              resizeMode="contain"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="spot"
        options={{
          title: "Spot",
          tabBarButton: (props) => (
            <Pressable
              onPress={props.onPress}
              onLongPress={props.onLongPress}
              accessibilityState={props.accessibilityState}
              accessibilityLabel={props.accessibilityLabel}
              testID={props.testID}
              style={{
                flex: 1,
                top: -26,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Image
                source={require("../../assets/icons/spot.png")}
                style={{ width: 92, height: 92 }}
                resizeMode="contain"
              />
            </Pressable>
          ),
        }}
      />
      <Tabs.Screen
        name="favourites"
        options={{
          title: "Favourites",
          tabBarIcon: ({ color }) => (
            <Image
              source={require("../../assets/icons/favourites.png")}
              style={{ width: 56, height: 56, tintColor: color }}
              resizeMode="contain"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: "Account",
          tabBarIcon: ({ color }) => (
            <Image
              source={require("../../assets/icons/account.png")}
              style={{ width: 56, height: 56, tintColor: color }}
              resizeMode="contain"
            />
          ),
        }}
      />
    </Tabs>
  );
}

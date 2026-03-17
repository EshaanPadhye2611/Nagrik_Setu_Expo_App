import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { LocationProvider } from "../context/locationcontext";

export default function RootLayout() {
  return (
    <LocationProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </LocationProvider>
  );
}
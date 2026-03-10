import { Slot } from 'expo-router';
import React from 'react';

// Render nested routes without the default bottom Tabs bar.
export default function TabLayout() {
  return <Slot />;
}

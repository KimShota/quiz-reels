import React from 'react';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { SubscriptionProvider } from './src/contexts/SubscriptionContext';
import AuthScreen from './src/screens/AuthScreen';
import AppNavigator from "./AppNavigator";

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return null; // You can add a loading screen here
  }

  if (!user) {
    return <AuthScreen />;
  }

  return <AppNavigator />;
}

export default function App() {
  return (
    <AuthProvider>
      <SubscriptionProvider>
        <AppContent />
      </SubscriptionProvider>
    </AuthProvider>
  );
}

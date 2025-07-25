import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthProvider } from './src/context/AuthContext';
import { SessionProvider } from './src/context/SessionContext';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import CompleteProfileScreen from './src/screens/CompleteProfileScreen';
import TakeInspectionScreen from './src/screens/TakeInspectionScreen';
import InspectionReportScreen from './src/screens/InspectionReportScreen';
import InspectionSummaryScreen from './src/screens/InspectionSummaryScreen';
import InspectionSummaryPendingScreen from './src/screens/InspectionSummaryPendingScreen';
import PruebaScreen from './src/screens/PruebaScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <AuthProvider>
      <SessionProvider>
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName="Login"
            screenOptions={{
              headerShown: false,
              cardStyle: { backgroundColor: '#FFA500' }
            }}
          >
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="CompleteProfile" component={CompleteProfileScreen} />
            <Stack.Screen name="TakeInspection" component={TakeInspectionScreen} />
            <Stack.Screen name="InspectionReport" component={InspectionReportScreen} />
            <Stack.Screen name="InspectionSummary" component={InspectionSummaryScreen} />
            <Stack.Screen name="InspectionSummaryPending" component={InspectionSummaryPendingScreen} />
            <Stack.Screen name="Prueba" component={PruebaScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </SessionProvider>
    </AuthProvider>
  );
}

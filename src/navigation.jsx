import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from './screens/LoginScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';
import RegisterScreen from './screens/RegisterScreen';
import HomeScreen from './screens/HomeScreen';
import InspectionSummaryPendingScreen from './screens/InspectionSummaryPendingScreen';
import InspectionReportScreen from './screens/InspectionReportScreen';
import TakeInspectionScreen from './screens/TakeInspectionScreen';
import ProfileScreen from './screens/ProfileScreen';
import { Asset } from 'expo-asset';

const Stack = createStackNavigator();

const AppNavigator = () => {
    return (
        <Stack.Navigator
            initialRouteName="Login"
            screenOptions={{
                headerShown: false,
                cardStyle: { backgroundColor: '#FFA500' }
            }}
        >
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="InspectionSummaryPending" component={InspectionSummaryPendingScreen} />
            <Stack.Screen name="InspectionReport" component={InspectionReportScreen} />
            <Stack.Screen name="TakeInspection" component={TakeInspectionScreen} />
        </Stack.Navigator>
    );
};

export default AppNavigator;

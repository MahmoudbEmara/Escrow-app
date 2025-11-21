import React, { useContext } from 'react';
import { Redirect } from 'expo-router';
import { AuthContext } from '../src/context/AuthContext';

export default function Index() {
  const { state } = useContext(AuthContext);
  if (state.isLoading) return null;
  return state.userToken ? <Redirect href="/(app)/home" /> : <Redirect href="/(auth)/getting-started" />;
}



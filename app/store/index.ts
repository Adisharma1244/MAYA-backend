/**
 * store/index.ts
 * Redux store with redux-persist
 *
 * Install:
 *   expo install @react-native-async-storage/async-storage
 *   npm install @reduxjs/toolkit react-redux redux-persist
 */

import { configureStore, combineReducers } from '@reduxjs/toolkit';
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';

import chatReducer from './chatSlice';
import genderReducer from './genderSlice';

const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['chat', 'gender'], // both slices persisted
};

const rootReducer = combineReducers({
  chat: chatReducer,
  gender: genderReducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: {
        // Required for redux-persist actions
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;
/**
 * store/genderSlice.ts
 * Stores the user's gender selection — persisted via redux-persist
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Gender } from './chatSlice';

interface GenderState {
  selected: Gender | null; // null = not yet chosen
}

const initialState: GenderState = {
  selected: null,
};

const genderSlice = createSlice({
  name: 'gender',
  initialState,
  reducers: {
    setGender(state, action: PayloadAction<Gender>) {
      state.selected = action.payload;
    },
    resetGender(state) {
      state.selected = null;
    },
  },
});

export const { setGender, resetGender } = genderSlice.actions;
export default genderSlice.reducer;
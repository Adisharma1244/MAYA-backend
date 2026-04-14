/**
 * store/chatSlice.ts
 * Separate chat histories for Maya (male) and Yash (female)
 * LIFO order (newest first), capped at MAX_MESSAGES each
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type Message = {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: number;
};

export type Gender = 'male' | 'female';

interface ChatState {
  male: Message[];   // Maya's chat history
  female: Message[]; // Yash's chat history
}

const MAX_MESSAGES = 20;

const initialState: ChatState = {
  male: [],
  female: [],
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    /** Add a message to the correct gender's chat (LIFO — prepend) */
    addMessage(
      state,
      action: PayloadAction<{ gender: Gender; message: Message }>
    ) {
      const { gender, message } = action.payload;
      state[gender].unshift(message); // newest first
      // Keep capped
      if (state[gender].length > MAX_MESSAGES) {
        state[gender] = state[gender].slice(0, MAX_MESSAGES);
      }
    },

    /** Clear all messages for one gender (e.g. "Clear Chat" button) */
    clearChat(state, action: PayloadAction<Gender>) {
      state[action.payload] = [];
    },

    /** Clear everything */
    clearAll(state) {
      state.male = [];
      state.female = [];
    },
  },
});

export const { addMessage, clearChat, clearAll } = chatSlice.actions;
export default chatSlice.reducer;
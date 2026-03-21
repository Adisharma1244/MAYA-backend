import { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';

type Message = {
  id: string;
  text: string;
  sender: 'user' | 'bot';
};

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      text: input,
      sender: 'user'
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');

    try {
      const response = await fetch('http://192.168.1.5:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input })
      });

      const data = await response.json();

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: data?.reply || "No response",
        sender: 'bot'
      };

      setMessages((prev) => [...prev, botMsg]);

      // auto scroll
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);

    } catch (err) {
      const errorMsg: Message = {
        id: (Date.now() + 2).toString(),
        text: "Server down hai 😭",
        sender: 'bot'
      };

      setMessages((prev) => [...prev, errorMsg]);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >

        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => console.log("Menu clicked")}>
            <Text style={styles.menu}>☰</Text>
          </TouchableOpacity>
          <Text style={styles.title}>MAYA</Text>
        </View>

        {/* CHAT */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 10 }}
          renderItem={({ item }) => (
            <View
              style={[
                styles.message,
                item.sender === 'user' ? styles.userMsg : styles.botMsg
              ]}
            >
              <Text style={styles.msgText}>{item.text}</Text>
            </View>
          )}
        />

        {/* INPUT */}
        <View style={styles.inputContainer}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ask Maya..."
            placeholderTextColor="#aaa"
            style={styles.input}
          />

          <TouchableOpacity onPress={sendMessage}>
            <Text style={styles.send}>➤</Text>
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111'
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15
  },

  menu: {
    color: 'white',
    fontSize: 26,
    marginRight: 15
  },

  title: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold'
  },

  message: {
    padding: 12,
    marginVertical: 5,
    borderRadius: 12,
    maxWidth: '75%'
  },

  userMsg: {
    backgroundColor: '#4CAF50',
    alignSelf: 'flex-end'
  },

  botMsg: {
    backgroundColor: '#333',
    alignSelf: 'flex-start'
  },

  msgText: {
    color: 'white'
  },

  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 0.5,
    borderColor: '#333'
  },

  input: {
    flex: 1,
    backgroundColor: '#222',
    color: 'white',
    padding: 12,
    borderRadius: 20
  },

  send: {
    color: 'white',
    fontSize: 22,
    marginLeft: 10,
    alignSelf: 'center'
  }
});
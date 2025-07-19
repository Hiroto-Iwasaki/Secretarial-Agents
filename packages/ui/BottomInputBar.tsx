import React from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

export const BottomInputBar = ({
  value,
  onChangeText,
  onSend,
  onVoiceInput,
  onFileInput,
  placeholder = 'メッセージを入力...'
}: {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onVoiceInput: () => void;
  onFileInput: () => void;
  placeholder?: string;
}) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={onVoiceInput} style={styles.iconButton}>
        <Ionicons name="mic" size={24} color="#555" />
      </TouchableOpacity>
      <TouchableOpacity onPress={onFileInput} style={styles.iconButton}>
        <MaterialIcons name="attach-file" size={24} color="#555" />
      </TouchableOpacity>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#aaa"
      />
      <TouchableOpacity onPress={onSend} style={styles.sendButton}>
        <Ionicons name="send" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#f8f8f8',
    borderTopWidth: 1,
    borderColor: '#e0e0e0',
  },
  iconButton: {
    padding: 6,
    marginRight: 2,
  },
  input: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 16,
    marginHorizontal: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  sendButton: {
    backgroundColor: '#2196f3',
    borderRadius: 20,
    padding: 8,
    marginLeft: 2,
  },
});

export default BottomInputBar;

import React, { useState } from 'react';
import { FlatList, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors } from '../constants/colors';

type PickerItem = { label: string; value: string };

type Props = {
  value: string;
  onValueChange: (value: string) => void;
  items: PickerItem[];
};

export function Picker({ value, onValueChange, items }: Props) {
  const [open, setOpen] = useState(false);
  const selectedLabel = items.find((i) => i.value === value)?.label || items[0]?.label || '';

  if (Platform.OS === 'web') {
    return (
      <View style={styles.webContainer}>
        <select
          value={value}
          onChange={(e: any) => onValueChange(e.target.value)}
          style={{
            width: '100%',
            backgroundColor: 'rgba(2,44,34,0.6)',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 16,
            padding: '14px 16px',
            fontSize: 14,
            outline: 'none',
            appearance: 'none' as any,
          }}
        >
          {items.map((item) => (
            <option key={item.value} value={item.value} style={{ backgroundColor: '#022c22', color: '#fff' }}>
              {item.label}
            </option>
          ))}
        </select>
      </View>
    );
  }

  return (
    <View>
      <Pressable style={styles.trigger} onPress={() => setOpen(true)}>
        <Text style={[styles.triggerText, !value && styles.triggerPlaceholder]} numberOfLines={1}>
          {selectedLabel}
        </Text>
        <Text style={styles.caret}>▾</Text>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <View style={styles.modal}>
            <FlatList
              data={items}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <Pressable
                  style={[styles.option, item.value === value && styles.optionActive]}
                  onPress={() => { onValueChange(item.value); setOpen(false); }}
                >
                  <Text style={[styles.optionText, item.value === value && styles.optionTextActive]}>
                    {item.label}
                  </Text>
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  webContainer: {},
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.white20,
    backgroundColor: 'rgba(2,44,34,0.6)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  triggerText: { color: '#fff', fontSize: 14, flex: 1 },
  triggerPlaceholder: { color: Colors.white40 },
  caret: { color: Colors.white50, fontSize: 14, marginLeft: 8 },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  modal: {
    backgroundColor: Colors.background,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.white20,
    maxHeight: 400,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
  },
  option: { paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.white10 },
  optionActive: { backgroundColor: Colors.white10 },
  optionText: { color: Colors.white80, fontSize: 15 },
  optionTextActive: { color: Colors.accent, fontWeight: '600' },
});

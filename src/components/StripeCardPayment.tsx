import { Text, View } from 'react-native';

/** Native: card checkout runs on web; see StripeCardPayment.web.tsx */
export function StripeCardPayment(_props: {
  reservationId: string;
  accessToken: string;
  onPaid: () => void;
  onDismiss: () => void;
  labels: {
    title: string;
    pay: string;
    paying: string;
    dismiss: string;
    success: string;
    errorPrefix: string;
    nativeHint: string;
  };
}) {
  return (
    <View style={{ paddingVertical: 12 }}>
      <Text style={{ color: '#f9fafb', marginBottom: 8 }}>{_props.labels.title}</Text>
      <Text style={{ color: 'rgba(249,250,251,0.75)', fontSize: 14 }}>{_props.labels.nativeHint}</Text>
    </View>
  );
}

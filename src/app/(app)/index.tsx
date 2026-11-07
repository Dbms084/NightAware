import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { useAuth } from '@/features/auth/providers/AuthProvider';

type TravelMode = 'Walking' | 'Cycling' | 'Driving';

const ORANGE = '#ff9400';
const times = ['Tonight, 22:10', 'Tonight, 22:30', 'Tomorrow, 06:30'];

type IconName = 'home' | 'account' | 'start' | 'walk' | 'bike' | 'car' | 'clock' | 'chevron' | 'moon' | 'routes' | 'info';

function Icon({ name, color = ORANGE, size = 24 }: { name: IconName; color?: string; size?: number }) {
  const u = size / 24;
  const line = (width: number, height: number, left: number, top: number, rotate = 0) => (
    <View style={{ position: 'absolute', width: width * u, height: height * u, left: left * u, top: top * u, borderRadius: 3 * u, backgroundColor: color, transform: [{ rotate: `${rotate}deg` }] }} />
  );
  const circle = (diameter: number, left: number, top: number, filled = false) => (
    <View style={{ position: 'absolute', width: diameter * u, height: diameter * u, left: left * u, top: top * u, borderRadius: diameter * u, borderWidth: filled ? 0 : 1.8 * u, borderColor: color, backgroundColor: filled ? color : 'transparent' }} />
  );

  let drawing;
  switch (name) {
    case 'home':
      drawing = <>{line(12, 2, 6, 4, 45)}{line(12, 2, 6, 4, -45)}<View style={{ position: 'absolute', left: 5 * u, top: 9 * u, width: 14 * u, height: 12 * u, borderColor: color, borderWidth: 1.8 * u, borderTopWidth: 0, borderBottomLeftRadius: 2 * u, borderBottomRightRadius: 2 * u }} />{line(2, 6, 11, 15)}</>;
      break;
    case 'account':
      drawing = <>{circle(22, 1, 1)}{circle(6, 9, 5)}<View style={{ position: 'absolute', left: 5 * u, top: 13 * u, width: 14 * u, height: 7 * u, borderColor: color, borderWidth: 1.6 * u, borderBottomWidth: 0, borderTopLeftRadius: 9 * u, borderTopRightRadius: 9 * u }} /></>;
      break;
    case 'start':
      drawing = <>{circle(20, 2, 2)}{circle(5, 9.5, 9.5, true)}</>;
      break;
    case 'walk':
      drawing = <>{circle(4, 10, 1, true)}{line(2, 8, 11, 6, 8)}{line(8, 1.7, 7, 9, -28)}{line(8, 1.7, 11, 9, 28)}{line(8, 1.7, 7, 14, 43)}{line(8, 1.7, 11, 14, -43)}</>;
      break;
    case 'bike':
      drawing = <>{circle(8, 1, 13)}{circle(8, 15, 13)}{line(8, 1.6, 6, 13, -55)}{line(8, 1.6, 9, 10, 45)}{line(8, 1.6, 10, 13, -55)}{line(5, 1.6, 13, 10, 0)}{line(4, 1.5, 5, 9, -20)}</>;
      break;
    case 'car':
      drawing = <>{line(15, 7, 4.5, 8, 0)}<View style={{ position: 'absolute', left: 6 * u, top: 4 * u, width: 12 * u, height: 7 * u, borderWidth: 1.6 * u, borderColor: color, borderTopLeftRadius: 5 * u, borderTopRightRadius: 5 * u }} />{line(18, 1.8, 3, 12)}{circle(4, 5, 16, true)}{circle(4, 15, 16, true)}</>;
      break;
    case 'clock':
      drawing = <>{circle(21, 1.5, 1.5)}{line(2, 7, 11, 5)}{line(2, 6, 11, 10)}</>;
      break;
    case 'chevron':
      drawing = <>{line(9, 1.8, 5, 10, 45)}{line(9, 1.8, 11, 10, -45)}</>;
      break;
    case 'moon':
      drawing = <Text style={{ color, fontSize: size * 0.9, lineHeight: size, includeFontPadding: false }}>☾</Text>;
      break;
    case 'routes':
      drawing = <>{circle(6, 1, 2)}{circle(6, 17, 2)}{circle(6, 9, 16)}{line(10, 1.8, 6, 4, 0)}{line(10, 1.8, 9, 14, -45)}{line(10, 1.8, 9, 8, 45)}</>;
      break;
    case 'info':
      drawing = <>{circle(22, 1, 1)}<Text style={{ position: 'absolute', left: 9 * u, top: 1 * u, color, fontSize: size * 0.75, fontWeight: '600', lineHeight: size, includeFontPadding: false }}>i</Text></>;
      break;
  }

  return <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>{drawing}</View>;
}

function DemoMap() {
  return (
    <View className="h-[210px] overflow-hidden rounded-t-[28px] bg-[#0b1014]">
      {[
        ['-10deg', '12%', '110%'], ['8deg', '37%', '120%'], ['-5deg', '63%', '110%'],
        ['14deg', '82%', '120%'], ['90deg', '15%', '120%'], ['90deg', '48%', '120%'], ['90deg', '77%', '120%'],
      ].map(([rotation, top, width], index) => (
        <View key={index} className="absolute h-[11px] rounded-sm bg-[#20282e]" style={{ top: `${top}`, width: `${width}`, left: index < 4 ? '-5%' : `${index * 18 - 40}%`, transform: [{ rotate: `${rotation}` }] }} />
      ))}
      <View className="absolute left-[23%] top-[64%] h-[5px] w-[54%] bg-[#46545e]" style={{ transform: [{ rotate: '-13deg' }] }} />
      <View className="absolute left-[24%] top-[48%] h-[5px] w-[43%] bg-[#ff9400]" />
      <View className="absolute left-[24%] top-[48%] h-[70px] w-[5px] bg-[#ff9400]" style={{ transform: [{ rotate: '0deg' }] }} />
      <View className="absolute left-[65%] top-[32%] h-[40px] w-[5px] bg-[#ff9400]" style={{ transform: [{ rotate: '-25deg' }] }} />
      <View className="absolute left-[22%] top-[65%] h-6 w-6 items-center justify-center rounded-full border-[3px] border-[#ff9400] bg-[#f7f7f5]"><View className="h-2 w-2 rounded-full bg-[#ff9400]" /></View>
      <View className="absolute left-[69%] top-[25%] h-11 w-11 items-center justify-center rounded-full bg-[#ff9400]"><Icon name="home" color="#111418" size={22} /></View>
      <Text className="absolute bottom-3 left-4 text-xs text-[#89939e]">Illustrative map · © OpenStreetMap contributors</Text>
    </View>
  );
}

export default function HomeScreen() {
  const { user, signOut } = useAuth();
  const [mode, setMode] = useState<TravelMode>('Walking');
  const [timeIndex, setTimeIndex] = useState(0);

  function explainDemo(action: string) {
    Alert.alert(action, 'This is an illustrative demo journey. Route previews and activity information are not connected to live map or places data.');
  }

  return (
    <SafeAreaView className="flex-1 bg-[#090b0d]" style={styles.screen} edges={['top', 'left', 'right']}>
      <StatusBar style="light" />
      <ScrollView className="flex-1" style={styles.screen} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View className="bg-[#111519] px-5 pb-4 pt-5">
          <View className="mb-9 flex-row items-center justify-between">
            <View>
              <Text className="text-[32px] leading-[40px] text-[#f5f5f3]">Where to tonight?</Text>
              <Text className="mt-1 text-[18px] text-[#aab2bb]">Bengaluru · Indiranagar</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel={`Account ${user?.email ?? ''}; sign out`} className="min-h-12 min-w-12 items-center justify-center" onPress={() => Alert.alert('Account', user?.email ?? 'Signed in', [{ text: 'Cancel', style: 'cancel' }, { text: 'Sign out', style: 'destructive', onPress: () => void signOut() }])}>
              <Icon name="account" color="#aab2bb" size={32} />
            </Pressable>
          </View>
          <View className="flex-row items-center gap-3"><View className="h-2.5 w-2.5 rounded-full bg-[#ff9400]" /><Text className="text-base tracking-wide text-[#b0b7c0]">DEMO JOURNEY  ·  Illustrative data, not live</Text></View>
        </View>

        <View className="px-5 pt-5">
          <View className="mb-4 min-h-[118px] flex-row items-center rounded-2xl border border-[#30363e] bg-[#111519] px-5 py-4">
            <View className="mr-4 w-9 items-center"><Icon name="start" size={28} /></View>
            <View className="flex-1"><Text className="mb-1 text-base text-[#85909b]">START</Text><Text className="text-[22px] text-[#f1f2f1]">Indiranagar Metro · Exit A</Text><Text className="mt-1 text-base text-[#aab2bb]">Manual start point · location not enabled</Text></View>
          </View>
          <View className="mb-5 min-h-[104px] flex-row items-center rounded-2xl border border-[#30363e] bg-[#111519] px-5 py-4">
            <View className="mr-4 w-9 items-center"><Icon name="home" size={27} /></View>
            <View><Text className="mb-1 text-base text-[#85909b]">DESTINATION</Text><Text className="text-[22px] text-[#f1f2f1]">Home · 12th Main Road</Text></View>
          </View>

          <View className="mb-5 flex-row gap-3">
            {(['Walking', 'Cycling', 'Driving'] as TravelMode[]).map((item) => {
              const selected = mode === item;
              const icon: IconName = item === 'Walking' ? 'walk' : item === 'Cycling' ? 'bike' : 'car';
              return <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => setMode(item)} className={`min-h-[54px] flex-1 flex-row items-center justify-center gap-2 rounded-full border px-3 ${selected ? 'border-[#ff9400] bg-[#241a10]' : 'border-[#30363e] bg-[#1a1f24]'}`}><Icon name={icon} size={20} color={selected ? ORANGE : '#aab2bb'} /><Text className={`text-base font-semibold ${selected ? 'text-[#ff9400]' : 'text-[#b0b7c0]'}`}>{item}</Text></Pressable>;
            })}
          </View>

          <Pressable accessibilityRole="button" onPress={() => setTimeIndex((timeIndex + 1) % times.length)} className="mb-8 rounded-[28px] border border-[#30363e] bg-[#111519] px-5 py-5">
            <View className="flex-row items-center"><Icon name="clock" size={26} /><Text className="ml-4 flex-1 text-[21px] text-[#f1f2f1]">Leave now</Text><Text className="text-[20px] text-[#f1f2f1]">{times[timeIndex]}</Text><View className="ml-3"><Icon name="chevron" color="#aab2bb" size={17} /></View></View>
            <Text className="mt-4 text-[18px] leading-7 text-[#aab2bb]">We estimate what will still be open when you pass, not just what’s open now.</Text>
          </Pressable>

          <View className="mb-4 flex-row items-center justify-between"><Text className="text-[24px] text-[#f1f2f1]">Your evening route</Text><Pressable accessibilityRole="button" onPress={() => explainDemo('Map preview')}><Text className="text-[18px] text-[#ff9400]">View map</Text></Pressable></View>
          <View className="mb-8 overflow-hidden rounded-[28px] border border-[#30363e] bg-[#111519]"><DemoMap /><View className="flex-row items-center px-5 py-4"><Icon name="moon" size={23} /><Text className="ml-4 text-[18px] text-[#b0b7c0]">After-dark {mode.toLowerCase()} · 3 route profiles available</Text></View></View>

          <Pressable accessibilityRole="button" className="min-h-[80px] flex-row items-center justify-center gap-3 rounded-2xl bg-[#ff9400] active:opacity-80" onPress={() => explainDemo('Compare routes')}><Text className="text-[22px] font-medium text-[#101214]">Compare routes</Text><Icon name="routes" color="#101214" size={25} /></Pressable>
          <View className="mt-7 flex-row items-center px-1"><Icon name="info" color="#84909c" size={22} /><Text className="ml-3 flex-1 text-base leading-6 text-[#84909c]">Activity indicators, not a safety guarantee. Demo data may be incomplete.</Text></View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#090b0d' },
  scrollContent: { paddingBottom: 32 },
});

import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Easing, Image, ImageBackground, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppText from '../../components/AppText';
import MapTextureBackground from '../../components/MapTextureBackground';
import MetallicFrame from '../../components/MetallicFrame';
import PremiumInput from '../../components/PremiumInput';
import { typography } from '../../constants/typography';

// Marketplace seller experience — local draft only. No database writes or live publishing.
const HERO = require('../../assets/images/marketplace-sell-hero.png');
const GOLD = '#D89A27';
const PALE = '#FFE29A';
const INK = '#071421';
const PANEL = 'rgba(7, 24, 37, 0.94)';
const DRAFT_KEY = 'bitebeacon:marketplace:sell-draft:v1';
const MUTED = '#B3C2CC';
const CATEGORIES = [
  { label: 'Vans & Trailers', icon: 'car-outline' },
  { label: 'Cooking', icon: 'flame-outline' },
  { label: 'Refrigeration', icon: 'snow-outline' },
  { label: 'Power & Utilities', icon: 'flash-outline' },
  { label: 'Drinks Equipment', icon: 'cafe-outline' },
  { label: 'Trading Gear', icon: 'storefront-outline' },
  { label: 'Complete Setups', icon: 'restaurant-outline' },
] as const;
const CONDITIONS = ['New', 'Excellent', 'Good', 'Used / Working', 'For parts'] as const;
const STEPS = ['Equipment', 'Photos', 'Details', 'Location', 'Preview'] as const;
const DELIVERY = ['Collection', 'Delivery available', 'Both'] as const;
// Optional questions adapt to the equipment being sold. Values stay in this local draft.
const SPEC_FIELDS: Record<string, { label: string; placeholder: string }[]> = {
  
  'Vans & Trailers': [
    { label: 'What make and model is it?', placeholder: 'e.g. Ifor Williams BV126' },
    { label: 'What year was it made?', placeholder: 'e.g. 2021' },
    { label: 'How many miles has it covered, if applicable?', placeholder: 'e.g. 65,000 miles / not applicable' },
    { label: 'What are its dimensions?', placeholder: 'e.g. 3m long x 2m wide' },
    { label: 'What fuel or power does it use?', placeholder: 'e.g. Diesel / LPG / electric / none' },
  ],
  
  Cooking: [
    { label: 'Who made it?', placeholder: 'e.g. Blue Seal' },
    { label: 'What is the model?', placeholder: 'e.g. GT46' },
    { label: 'How old is it approximately?', placeholder: 'e.g. 4 years' },
    { label: 'What power source does it use?', placeholder: 'e.g. LPG / natural gas / electric' },
    { label: 'What power connection or rating is required?', placeholder: 'e.g. 13A / 32A / three-phase' },
    { label: 'What are its dimensions?', placeholder: 'e.g. 120 x 80 x 90 cm' },
  ],
  
  Refrigeration: [
    { label: 'Who made it and what model is it?', placeholder: 'e.g. Polar G-Series' },
    { label: 'What is its capacity?', placeholder: 'e.g. 600 litres' },
    { label: 'What power connection does it need?', placeholder: 'e.g. Standard 13A plug' },
    { label: 'What temperature range can it reach?', placeholder: 'e.g. -2 to +8°C' },
    { label: 'What are its dimensions?', placeholder: 'e.g. 180 x 70 x 85 cm' },
  ],
  
  'Power & Utilities': [
    { label: 'Who made it and what model is it?', placeholder: 'e.g. Honda EU30is' },
    { label: 'What is its power output?', placeholder: 'e.g. 3 kVA / 2.8 kW' },
    { label: 'What fuel or power source does it use?', placeholder: 'e.g. Petrol / diesel / battery' },
    { label: 'How many running hours has it had?', placeholder: 'e.g. 450 hours / unknown' },
    { label: 'What connections does it have?', placeholder: 'e.g. 2 x 13A sockets' },
  ],
  
  'Drinks Equipment': [
    { label: 'Who made it and what model is it?', placeholder: 'e.g. Fracino Bambino' },
    { label: 'What capacity does it have?', placeholder: 'e.g. Two-group coffee machine' },
    { label: 'What power or water connection is needed?', placeholder: 'e.g. 13A and plumbed water' },
    { label: 'What are its dimensions?', placeholder: 'e.g. 60 x 50 x 45 cm' },
  ],
  
  'Trading Gear': [
    { label: 'What brand or model is it?', placeholder: 'e.g. Gala Tent Pro 50' },
    { label: 'What are its dimensions?', placeholder: 'e.g. 3 x 3 metres' },
    { label: 'What is included?', placeholder: 'e.g. Frame, canopy and sidewalls' },
  ],
  
  'Complete Setups': [
    { label: 'What equipment is included?', placeholder: 'e.g. Trailer, fryer, fridge and generator' },
    { label: 'What size is the setup?', placeholder: 'e.g. 4-metre trailer' },
    { label: 'What power and utilities does it require?', placeholder: 'e.g. LPG and 32A electric' },
    { label: 'Is it ready to trade?', placeholder: 'e.g. Yes, subject to buyer checks' },
  ],

};
// Lightweight local suggestions: no network, location permissions or API keys needed.
// These are examples, not a complete UK place-name database.
const PLACE_SUGGESTIONS = [
  'Aberdeen', 'Bath', 'Belfast', 'Birmingham', 'Bolton', 'Bournemouth', 'Bradford',
  'Brighton', 'Bristol', 'Cambridge', 'Cardiff', 'Carlisle', 'Chelmsford',
  'Cheltenham', 'Chester', 'Coventry', 'Derby', 'Dundee', 'Edinburgh', 'Exeter',
  'Glasgow', 'Gloucester', 'Guildford', 'Hull', 'Inverness', 'Ipswich', 'Leeds',
  'Leicester', 'Lincoln', 'Liverpool', 'London', 'Luton', 'Manchester', 'Milton Keynes',
  'Newcastle upon Tyne', 'Newport', 'Northampton', 'Norwich', 'Nottingham',
  'Oxford', 'Peterborough', 'Plymouth', 'Portsmouth', 'Preston', 'Reading',
  'Sheffield', 'Southampton', 'Southend-on-Sea', 'St Austell', 'St Ives',
  'Stoke-on-Trent', 'Sunderland', 'Swansea', 'Swindon', 'Taunton', 'Torquay',
  'Truro', 'Wakefield', 'Warrington', 'Winchester', 'Wolverhampton', 'Worcester', 'York',
];
const ITEM_SUGGESTIONS: Record<string, string[]> = {
  
  'Vans & Trailers': ['Mobile catering trailer', 'Food truck', 'Burger van', 'Coffee van', 'Converted horsebox', 'Catering trailer'],
  
  Cooking: ['Commercial fryer', 'Twin basket fryer', 'Commercial griddle', 'Pizza oven', 'Gas chargrill', 'Commercial bain marie'],
  
  Refrigeration: ['Commercial upright fridge', 'Display fridge', 'Chest freezer', 'Undercounter fridge', 'Refrigerated prep counter'],
  
  'Power & Utilities': ['Silent generator', 'Diesel generator', 'LPG generator', 'Portable power station', 'Water pump'],
  
  'Drinks Equipment': ['Espresso machine', 'Coffee grinder', 'Hot water boiler', 'Slush machine', 'Drinks fridge'],
  
  'Trading Gear': ['Pop-up gazebo', 'Market stall', 'Serving counter', 'Outdoor signage', 'Catering canopy'],
  
  'Complete Setups': ['Ready-to-trade catering setup', 'Complete coffee setup', 'Mobile catering business setup', 'Festival trading setup'],

};
type Step = 0 | 1 | 2 | 3 | 4;

function Label({ children, detail }: { children: string; detail?: string }) {
  return <View style={s.labelRow}>
    <AppText style={s.label}>{children}
  </AppText>{detail ? <AppText style={s.hint}>{detail}
  </AppText> : null}
  </View>;
}
function Panel({ children, featured = false }: { children: React.ReactNode; featured?: boolean }) {
  return <MetallicFrame tone="gold" borderRadius={24} borderWidth={2} style={[s.panel, featured && s.featuredPanel]} contentStyle={s.panelInner}>{children}
  </MetallicFrame>;
}
function GoldButton({ label, onPress, secondary = false, icon }: { label: string; onPress: () => void; secondary?: boolean; icon?: keyof typeof Ionicons.glyphMap }) {
  return <Pressable 
      accessibilityRole="button" 
      onPress={onPress} 
      style={({ pressed }) => [s.buttonOuter, secondary && s.secondaryOuter, pressed && { opacity: .82, transform: [{ scale: .99 }] }]}>
    {secondary ? <View style={s.secondaryButton}>
      <Ionicons name={icon ?? 'arrow-back'} size={20} color={PALE}/>
      <AppText style={s.secondaryText}>{label}
    </AppText>
    </View> :
    <LinearGradient colors={['#FFF2BD', '#FFD66D', '#E9A32A']} locations={[0, .58, 1]} style={s.button}>
      <AppText style={s.buttonText}>{label}
    </AppText>
      <Ionicons name={icon ?? 'arrow-forward'} size={23} color={INK}/>
    </LinearGradient>}
  </Pressable>;
}
export default function SellScreen() {
  const insets = useSafeAreaInsets();
  const scroll = useRef<ScrollView>(null);
  const positions = useRef<number[]>([]);
  const heroHeight = useRef(375);
  const [activeSection, setActiveSection] = useState<Step>(0);
  const [category, setCategory] = useState('');
  const [title, setTitle] = useState('');
  const [titleSuggestionsOpen, setTitleSuggestionsOpen] = useState(false);
  const [condition, setCondition] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [placeSuggestionsOpen, setPlaceSuggestionsOpen] = useState(false);
  const [specs, setSpecs] = useState<Record<string, string>>({});
  const [delivery, setDelivery] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [serviceHistory, setServiceHistory] = useState('');
  const [reasonForSale, setReasonForSale] = useState('');
  const [paperwork, setPaperwork] = useState(false);
  const [workingCondition, setWorkingCondition] = useState('');
  const [knownFaults, setKnownFaults] = useState('');
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [draftStatus, setDraftStatus] = useState<'loading' | 'saved' | 'saving' | 'error'>('loading');
  const progressAnim = useRef(new Animated.Value(0)).current;
  const celebrationAnim = useRef(new Animated.Value(0)).current;
  const lastComplete = useRef(false);
  const draftSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load local form data once; never publish or write to Supabase here.
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(DRAFT_KEY);
        if (raw && mounted) {
          const draft = JSON.parse(raw);
          if (draft && typeof draft === 'object') {
            if (typeof draft.category === 'string') setCategory(draft.category);
            if (typeof draft.title === 'string') setTitle(draft.title);
            if (typeof draft.condition === 'string') setCondition(draft.condition);
            if (Array.isArray(draft.photos)) setPhotos(draft.photos.filter((v: unknown) => typeof v === 'string').slice(0, 5));
            if (typeof draft.price === 'string') setPrice(draft.price);
            if (typeof draft.description === 'string') setDescription(draft.description);
            if (typeof draft.location === 'string') setLocation(draft.location);
            if (draft.specs && typeof draft.specs === 'object') setSpecs(draft.specs);
            if (typeof draft.delivery === 'string') setDelivery(draft.delivery);
            if (typeof draft.serviceHistory === 'string') setServiceHistory(draft.serviceHistory);
            if (typeof draft.reasonForSale === 'string') setReasonForSale(draft.reasonForSale);
            if (typeof draft.paperwork === 'boolean') setPaperwork(draft.paperwork);
            if (typeof draft.workingCondition === 'string') setWorkingCondition(draft.workingCondition);
            if (typeof draft.knownFaults === 'string') setKnownFaults(draft.knownFaults);
          }
        }
      } catch (error) {
        console.warn('Marketplace draft could not be restored', error);
      } finally {
        if (mounted) { setDraftLoaded(true); setDraftStatus('saved'); }
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!draftLoaded) return;
    setDraftStatus('saving');
    if (draftSaveTimer.current) clearTimeout(draftSaveTimer.current);
    draftSaveTimer.current = setTimeout(async () => {
      try {
        await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify({
          category, title, condition, photos, price, description, location, specs,
          delivery, serviceHistory, reasonForSale, paperwork, workingCondition, knownFaults,
        }));
        setDraftStatus('saved');
      } catch (error) {
        console.warn('Marketplace draft could not be saved', error);
        setDraftStatus('error');
      }
    }, 650);
    return () => { if (draftSaveTimer.current) clearTimeout(draftSaveTimer.current); };
  }, [draftLoaded, category, title, condition, photos, price, description, location, specs,
    delivery, serviceHistory, reasonForSale, paperwork, workingCondition, knownFaults]);
  const titleSuggestions = useMemo(() => {
    const query = title.trim().toLowerCase();
    if (query.length < 2) return [];
    const options = category ? ITEM_SUGGESTIONS[category] ?? [] : Object.values(ITEM_SUGGESTIONS).flat();
    return options.filter(item => item.toLowerCase().includes(query) && item.toLowerCase() !== query).slice(0, 4);
  }, [title, category]);
  const placeSuggestions = useMemo(() => {
    const query = location.trim().toLowerCase();
    if (query.length < 2) return [];
    return PLACE_SUGGESTIONS.filter(item => item.toLowerCase().includes(query) && item.toLowerCase() !== query).slice(0, 5);
  }, [location]);
  const money = useMemo(() => { const n = Number(price); return price.trim() && Number.isFinite(n) ? `£${n.toLocaleString('en-GB')}` : '£ —'; }, [price]);
  const jump = (index: Step) => {
    setActiveSection(index);
    scroll.current?.scrollTo({ y: Math.max(0, heroHeight.current + (positions.current[index] ?? 0) - insets.top - 14), animated: true });
  };
  const goBack = () => router.replace('/(tabs)/marketplace');
  const choosePhotos = async () => {
    if (photos.length >= 5) return Alert.alert('Five photos added', 'Remove a photo before adding another.');
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: 5 - photos.length, quality: .75 });
    if (!result.canceled) setPhotos(prev => [...prev, ...result.assets.map(a => a.uri)].slice(0, 5));
  };
  const completed = [Boolean(category && title.trim() && condition), photos.length > 0,
    Boolean(Number(price) > 0 && Number.isFinite(Number(price)) && description.trim()),
    Boolean(location.trim()), false];
  const completedCount = completed.slice(0, 4).filter(Boolean).length;
  const ready = completedCount === 4;
  useEffect(() => {
    Animated.timing(progressAnim, { toValue: completedCount / 4, duration: 460,
      easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    if (ready && !lastComplete.current) {
      celebrationAnim.setValue(0);
      Animated.sequence([
        Animated.timing(celebrationAnim, { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.timing(celebrationAnim, { toValue: 0, duration: 900, useNativeDriver: true }),
      ]).start();
    }
    lastComplete.current = ready;
  }, [completedCount, ready]);
  const progressWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const readyGlow = celebrationAnim.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] });
  const saveDraftNow = async () => {
    if (draftSaveTimer.current) clearTimeout(draftSaveTimer.current);
    try {
      await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify({
        category, title, condition, photos, price, description, location, specs,
        delivery, serviceHistory, reasonForSale, paperwork, workingCondition, knownFaults,
      }));
      setDraftStatus('saved');
      Alert.alert('Draft saved', 'Your details are saved on this device. Nothing has been uploaded or published.');
    } catch {
      setDraftStatus('error');
      Alert.alert('Could not save', 'Please try again. Your current form is still open.');
    }
  };
  const preview = () => {
    const missing: string[] = [];
    if (!category || !title.trim() || !condition) missing.push('equipment category, title and condition');
    if (!photos.length) missing.push('at least one real equipment photo');
    if (!Number.isFinite(Number(price)) || Number(price) <= 0 || !description.trim()) missing.push('a valid price and description');
    if (!location.trim()) missing.push('your general location');
    if (missing.length) {
      Alert.alert('Almost there', `Please complete: ${missing.join('; ')}.`, [
        { text: 'OK' },
      ]);
      const first = !completed[0] ? 0 : !completed[1] ? 1 : !completed[2] ? 2 : 3;
      jump(first as Step);
      return;
    }
    jump(4);
  };
  const reorderPhoto = (index: number, direction: -1 | 1) => {
    setPhotos(previous => {
      const target = index + direction;
      if (target < 0 || target >= previous.length) return previous;
      const nextPhotos = [...previous];
      [nextPhotos[index], nextPhotos[target]] = [nextPhotos[target], nextPhotos[index]];
      return nextPhotos;
    });
  };
  return <MapTextureBackground>
    <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView 
          ref={scroll} 
          keyboardShouldPersistTaps="handled" 
          contentContainerStyle={{ paddingBottom: 22 + insets.bottom }} 
          showsVerticalScrollIndicator={false}>
        <ImageBackground 
            source={HERO} 
            resizeMode="cover" 
            style={s.hero} 
            imageStyle={s.heroImage} 
            onLayout={event => { heroHeight.current = event.nativeEvent.layout.height; }}>
          <LinearGradient 
              colors={['rgba(3,13,24,.44)', 'rgba(3,13,24,.22)', 'rgba(3,13,24,.98)']} 
              locations={[0, .43, 1]} 
              style={s.heroShade}>
            <View style={[s.topRow, { paddingTop: insets.top + 10 }]}>
              <Pressable onPress={goBack} style={s.backCircle} accessibilityLabel="Go back">
                <Ionicons name="arrow-back" size={25} color={PALE}/>
              </Pressable>
              <AppText style={s.brand}>BITEBEACON  /  THE TRADER'S EXCHANGE
              </AppText>
            </View>
            <View style={s.heroCopy}>
              <AppText style={s.eyebrow}>GOOD EQUIPMENT DESERVES ANOTHER SHIFT
              </AppText>
              <AppText variant="heading" style={s.heroTitle}>SELL YOUR{'\n'}
                <AppText style={s.heroGold}>EQUIPMENT.
              </AppText>
              </AppText>
              <View style={s.shortRule}/>
              <AppText style={s.heroSubtitle}>Put it back to work.
              </AppText>
              <AppText style={s.heroBody}>Give your equipment its next chapter. Create a standout listing for the food-trading community.
              </AppText>
            </View>
          </LinearGradient>
        </ImageBackground>
        <View style={s.content}>
          <View style={s.progressHead}>
            <AppText style={s.sectionKicker}>YOUR LISTING STUDIO
            </AppText>
            <AppText style={s.progressCount}>{completedCount} OF 4 ESSENTIAL SECTIONS READY
            </AppText>
          </View>
          <View style={s.progressTrack}>
            <Animated.View style={[s.progressFill, { width: progressWidth }]} />
          </View>
          {ready && <Animated.View style={[s.readyBanner, { opacity: readyGlow }]}>
            <Ionicons name="sparkles" size={17} color={PALE}/>
            <AppText style={s.readyText}>YOUR LISTING IS READY TO PREVIEW</AppText>
            <Ionicons name="checkmark-circle" size={18} color={PALE}/>
          </Animated.View>}
          <View style={s.steps}>{STEPS.map((item, index) => <Pressable 
              key={item} 
              onPress={() => jump(index as Step)} 
              style={s.stepItem} 
              accessibilityRole="button" 
              accessibilityLabel={`Jump to ${item}`}>
            <View style={[s.stepCircle, index === activeSection && s.stepActive, completed[index] && s.stepDone]}>{completed[index] ? <Ionicons name="checkmark" size={17} color={INK}/> : <AppText style={[s.stepNumber, index === activeSection && { color: INK }]}>{index + 1}
          </AppText>}
          </View>
            <AppText style={[s.stepText, index === activeSection && { color: PALE }]} numberOfLines={1}>{item}
          </AppText>
          </Pressable>)}
          </View>
          <View onLayout={e => { positions.current[0] = e.nativeEvent.layout.y; }} style={s.intro}>
            <AppText style={s.sectionKicker}>01 / EQUIPMENT
          </AppText>
            <AppText variant="heading" style={s.sectionTitle}>Start with the essentials
          </AppText>
            <AppText style={s.sectionBody}>Help the right trader find exactly what they need.
          </AppText>
          </View>
          <>
            <Panel>
              <Label detail="Choose one">EQUIPMENT CATEGORY
            </Label>
              <View style={s.categoryGrid}>{CATEGORIES.map(item => { const active = category === item.label; return <Pressable 
                key={item.label} 
                onPress={() => setCategory(item.label)} 
                style={({ pressed }) => [s.category, active && s.selected, pressed && s.pressedTile]}>
              <Ionicons name={item.icon} size={28} color={active ? PALE : GOLD}/>
              <AppText style={[s.categoryText, active && { color: PALE }]}>{item.label}
            </AppText>
            </Pressable>; })}
            </View>
            </Panel>
            <Panel>
              <Label detail="Be clear and specific">LISTING TITLE
            </Label>
              <PremiumInput 
                value={title} 
                onChangeText={value => { setTitle(value); setTitleSuggestionsOpen(true); }} 
                onFocus={() => setTitleSuggestionsOpen(true)} 
                maxLength={90} 
                placeholder="e.g. 3m mobile catering trailer" 
                placeholderTextColor="#718796" 
                style={s.input}/>{titleSuggestionsOpen && titleSuggestions.length > 0 && <View style={s.suggestions}>{titleSuggestions.map(item => <Pressable 
                key={item} 
                style={s.suggestionRow} 
                onPress={() => { setTitle(item); setTitleSuggestionsOpen(false); }} 
                accessibilityRole="button">
              <Ionicons name="search-outline" size={16} color={GOLD}/>
              <AppText style={s.suggestionText}>{item}
            </AppText>
              <Ionicons name="arrow-undo-outline" size={15} color={MUTED}/>
            </Pressable>)}
            </View>}
            </Panel>
            {category && <Panel>
              <Label detail="Optional · tailored to your category">EQUIPMENT SPECIFICATIONS
            </Label>
              <View style={s.specGrid}>{(SPEC_FIELDS[category] ?? []).map(field => <View key={field.label} style={s.specField}>
              <AppText style={s.specLabel}>{field.label}
            </AppText>
              <PremiumInput 
                value={specs[field.label] ?? ''} 
                onChangeText={value => setSpecs(previous => ({ ...previous, [field.label]: value }))} 
                maxLength={100} 
                placeholder={field.placeholder} 
                placeholderTextColor="#718796" 
                style={s.input}/>
            </View>)}
            </View>
            </Panel>}
            <Panel>
              <Label>CONDITION
            </Label>
              <View style={s.pills}>{CONDITIONS.map(c => <Pressable key={c} onPress={() => setCondition(c)} style={[s.pill, condition === c && s.selected]}>
              <Ionicons name={condition === c ? 'radio-button-on' : 'radio-button-off'} size={20} color={GOLD}/>
              <AppText style={s.pillText}>{c}
            </AppText>
            </Pressable>)}
            </View>
            </Panel>
          </>
          <View onLayout={e => { positions.current[1] = e.nativeEvent.layout.y; }} style={s.intro}>
            <AppText style={s.sectionKicker}>02 / PHOTOS
          </AppText>
            <AppText variant="heading" style={s.sectionTitle}>Show it off
          </AppText>
            <AppText style={s.sectionBody}>Real photos help buyers see the equipment at its best.
          </AppText>
          </View>
            <Panel featured>
              <Label detail={`${photos.length} / 5 photos`}>EQUIPMENT PHOTOS
          </Label>
            <View style={s.photoGrid}>{photos.map((uri, i) => <View key={`${uri}-${i}`} style={s.photoSlot}>
            <Image source={{ uri }} style={s.photo} fadeDuration={300}/>
            <View style={s.photoActions}>
            <Pressable 
              onPress={() => reorderPhoto(i, -1)} 
              disabled={i === 0} 
              accessibilityLabel={`Move photo ${i + 1} left`}>
            <Ionicons name="chevron-back-circle" size={23} color={i === 0 ? '#60707B' : PALE}/>
          </Pressable>
            <Pressable 
              onPress={() => reorderPhoto(i, 1)} 
              disabled={i === photos.length - 1} 
              accessibilityLabel={`Move photo ${i + 1} right`}>
            <Ionicons name="chevron-forward-circle" size={23} color={i === photos.length - 1 ? '#60707B' : PALE}/>
          </Pressable>
          </View>
            <Pressable 
              onPress={() => setPhotos(p => p.filter((_, j) => j !== i))} 
              style={s.removePhoto} 
              accessibilityLabel={`Remove photo ${i + 1}`}>
            <Ionicons name="close" size={19} color="#FFF"/>
          </Pressable>
          </View>)}{photos.length < 5 && <Pressable onPress={choosePhotos} style={s.addPhoto}>
            <Ionicons name="camera-outline" size={34} color={GOLD}/>
            <AppText style={s.addPhotoText}>Add photos
          </AppText>
          </Pressable>}
          </View>
            <AppText style={s.note}>Use photographs of the actual item. Buyers should be able to see its condition clearly.
          </AppText>
          </Panel>
          <View onLayout={e => { positions.current[2] = e.nativeEvent.layout.y; }} style={s.intro}>
            <AppText style={s.sectionKicker}>03 / DETAILS
          </AppText>
            <AppText variant="heading" style={s.sectionTitle}>Make it count
          </AppText>
            <AppText style={s.sectionBody}>A fair price and honest description build confidence.
          </AppText>
          </View>
          <><Panel>
            <Label>ASKING PRICE (£)
          </Label>
            <PremiumInput 
              value={price} 
              onChangeText={v => setPrice(v.replace(/[^\d.]/g, ''))} 
              keyboardType="decimal-pad" 
              placeholder="e.g. 2450" 
              placeholderTextColor="#718796" 
              style={s.input}/>
            <View style={s.priceCompact}>
            <AppText style={s.mini}>ASKING PRICE
          </AppText>
            <AppText style={s.priceCompactText}>{money}
          </AppText>
          </View>
          </Panel><Panel>
            <Label detail="Be accurate">EQUIPMENT DESCRIPTION
          </Label>
            <PremiumInput 
              value={description} 
              onChangeText={setDescription} 
              maxLength={2000} 
              multiline 
              textAlignVertical="top" 
              placeholder="What's included? Age, dimensions, working condition, service history, and any faults..." 
              placeholderTextColor="#718796" 
              style={[s.input, s.description]}/>
            <AppText style={s.counter}>{description.length} / 2000 characters
          </AppText>
          </Panel><Panel>
            <Pressable 
              onPress={() => setHistoryOpen(value => !value)} 
              accessibilityRole="button" 
              accessibilityLabel="Toggle optional seller information" 
              style={s.expandRow}>
            <View style={s.expandTitle}>
            <Ionicons name="information-circle-outline" size={21} color={PALE}/>
            <AppText style={s.label}>A FEW MORE QUESTIONS
          </AppText>
          </View>
            <Ionicons name={historyOpen ? 'chevron-up' : 'chevron-down'} size={22} color={PALE}/>
          </Pressable>
            <AppText style={s.note}>A few optional answers can help buyers feel confident.
          </AppText>{historyOpen && <View style={s.extraContent}>
            <AppText style={s.specLabel}>Is everything working as it should?
          </AppText>
            <PremiumInput 
              value={workingCondition} 
              onChangeText={setWorkingCondition} 
              maxLength={180} 
              placeholder="e.g. Fully working and tested" 
              placeholderTextColor="#718796" 
              style={s.input}/>
            <AppText style={s.specLabel}>Are there any faults, damage or missing parts?
          </AppText>
            <PremiumInput 
              value={knownFaults} 
              onChangeText={setKnownFaults} 
              maxLength={350} 
              multiline 
              placeholder="e.g. Small dent on side; no known faults" 
              placeholderTextColor="#718796" 
              style={[s.input, s.smallMultiline]}/>
            <AppText style={s.specLabel}>Has the item been serviced or maintained recently?
          </AppText>
            <PremiumInput 
              value={serviceHistory} 
              onChangeText={setServiceHistory} 
              maxLength={350} 
              multiline 
              placeholder="e.g. Serviced in June; new parts fitted" 
              placeholderTextColor="#718796" 
              style={[s.input, s.smallMultiline]}/>
            <AppText style={s.specLabel}>Why are you selling it?
          </AppText>
            <PremiumInput 
              value={reasonForSale} 
              onChangeText={setReasonForSale} 
              maxLength={200} 
              placeholder="e.g. We have upgraded to a larger unit" 
              placeholderTextColor="#718796" 
              style={s.input}/>
            <Pressable 
              style={s.checkboxRow} 
              onPress={() => setPaperwork(value => !value)} 
              accessibilityRole="checkbox" 
              accessibilityState={{ checked: paperwork }}>
            <Ionicons name={paperwork ? 'checkbox' : 'square-outline'} size={23} color={PALE}/>
            <AppText style={s.pillText}>Do you have manuals or service paperwork?
          </AppText>
          </Pressable>
          </View>}
          </Panel></>
          <View onLayout={e => { positions.current[3] = e.nativeEvent.layout.y; }} style={s.intro}>
            <AppText style={s.sectionKicker}>04 / LOCATION
          </AppText>
            <AppText variant="heading" style={s.sectionTitle}>Keep it local
          </AppText>
            <AppText style={s.sectionBody}>A town or general area is all buyers need.
          </AppText>
          </View>
          <Panel>
            <Label>GENERAL LOCATION
          </Label>
            <PremiumInput 
              value={location} 
              onChangeText={value => { setLocation(value); setPlaceSuggestionsOpen(true); }} 
              onFocus={() => setPlaceSuggestionsOpen(true)} 
              maxLength={100} 
              placeholder="e.g. Bristol" 
              placeholderTextColor="#718796" 
              style={s.input}/>{placeSuggestionsOpen && placeSuggestions.length > 0 && <View style={s.suggestions}>{placeSuggestions.map(place => <Pressable 
              key={place} 
              style={s.suggestionRow} 
              onPress={() => { setLocation(place); setPlaceSuggestionsOpen(false); }} 
              accessibilityRole="button">
            <Ionicons name="location-outline" size={16} color={GOLD}/>
            <AppText style={s.suggestionText}>{place}
          </AppText>
            <Ionicons name="arrow-undo-outline" size={15} color={MUTED}/>
          </Pressable>)}
          </View>}
            <View style={s.locationNote}>
            <Ionicons name="location-outline" size={21} color={GOLD}/>
            <AppText style={s.note}>Enter a town or general area, not a street address. Suggestions cover some UK towns and cities; you can type any location.
          </AppText>
          </View>
            <View style={s.inlineDivider}/>
            <Label detail="Choose one">COLLECTION OR DELIVERY
          </Label>
            <View style={s.pills}>{DELIVERY.map(option => <Pressable 
              key={option} 
              onPress={() => setDelivery(option)} 
              style={[s.pill, delivery === option && s.selected]}>
            <Ionicons name={delivery === option ? 'radio-button-on' : 'radio-button-off'} size={18} color={PALE}/>
            <AppText style={s.pillText}>{option}
          </AppText>
          </Pressable>)}
          </View>
          </Panel>
          <View onLayout={e => { positions.current[4] = e.nativeEvent.layout.y; }} style={s.intro}>
            <AppText style={s.sectionKicker}>05 / LIVE PREVIEW
          </AppText>
            <AppText variant="heading" style={s.sectionTitle}>The finishing touch
          </AppText>
            <AppText style={s.sectionBody}>Your listing preview updates as you fill in the sections above.
          </AppText>
          </View>
          <Panel featured>
            <Label detail="Private draft">LISTING PREVIEW
          </Label>
            <View style={s.buyerCard}>
              {photos[0] ? <Image source={{ uri: photos[0] }} style={s.previewPhoto} fadeDuration={320}/> :
                <View style={s.previewPlaceholder}><Ionicons name="images-outline" size={44} color={GOLD}/><AppText style={s.placeholderText}>YOUR EQUIPMENT PHOTO</AppText></View>}
              <LinearGradient colors={['transparent', 'rgba(3,13,24,.95)']} style={s.previewImageShade}>
                <View style={s.previewBadge}><Ionicons name="pricetag-outline" size={13} color={PALE}/><AppText style={s.previewBadgeText}>THE TRADER'S EXCHANGE</AppText></View>
              </LinearGradient>
              <View style={s.buyerCardCopy}>
                <AppText style={s.buyerEyebrow}>EQUIPMENT FOR SALE  ·  PRIVATE PREVIEW</AppText>
                <AppText style={s.buyerTitle}>{title.trim() || 'Your equipment title'}</AppText>
                <AppText style={s.buyerPrice}>{money}</AppText>
                <View style={s.buyerMetaRow}><Ionicons name="location-outline" size={15} color={GOLD}/><AppText style={s.buyerMeta}>{location || 'Your town or area'}</AppText></View>
                <View style={s.buyerMetaRow}><Ionicons name="layers-outline" size={15} color={GOLD}/><AppText style={s.buyerMeta}>{category || 'Equipment category'}{condition ? `  ·  ${condition}` : ''}</AppText></View>
              </View>
            </View>
            <AppText style={s.previewDetailHeading}>FULL LISTING DETAILS</AppText>
            <AppText style={s.previewPrice}>{money}
          </AppText>
            <AppText style={s.previewTitle}>{title}
          </AppText>
            <AppText style={s.previewMeta}>{category}  ·  {condition}
          </AppText>
            <AppText style={s.previewMeta}>
            <Ionicons name="location-outline" color={GOLD}/> {location || 'Location not added'}{delivery ? `  ·  ${delivery}` : ''}
          </AppText>{Object.entries(specs).filter(([_, value]) => value.trim()).length > 0 && <AppText style={s.previewMeta}>{Object.entries(specs).filter(([_, value]) => value.trim()).map(([key, value]) => `${key}: ${value}`).join('  ·  ')}
          </AppText>}
            <View style={s.divider}/>
            <AppText style={s.previewDescription}>{description || 'Your description will appear here.'}
          </AppText>{workingCondition.trim() ? <AppText style={s.previewMeta}>Working condition: {workingCondition}
          </AppText> : null}{knownFaults.trim() ? <AppText style={s.previewMeta}>Faults or damage: {knownFaults}
          </AppText> : null}{serviceHistory.trim() ? <AppText style={s.previewMeta}>Service history: {serviceHistory}
          </AppText> : null}{reasonForSale.trim() ? <AppText style={s.previewMeta}>Reason for selling: {reasonForSale}
          </AppText> : null}{paperwork ? <AppText style={s.previewMeta}>✓ Do you have manuals or service paperwork?
          </AppText> : null}
            <View style={s.draftNotice}>
            <Ionicons name="shield-checkmark-outline" size={21} color={GOLD}/>
            <AppText style={s.note}>Help buyers decide with clear photos, an accurate description and any known faults. This is a private design preview. Form details are saved only on this device, not online. No photos or listing details are uploaded or published. Selected photo links may need reselecting if the device clears temporary files.
          </AppText>
          </View>
          </Panel>
          <View style={s.saveRow}>
            <Ionicons name="lock-closed-outline" size={16} color={PALE}/>
            <AppText style={s.saveStatus}>{draftStatus === 'loading' ? 'RESTORING DRAFT' : draftStatus === 'saving' ? 'SAVING ON THIS DEVICE…' : draftStatus === 'error' ? 'DRAFT SAVE FAILED — RETRY BELOW' : 'DRAFT SAVED ON THIS DEVICE'}</AppText>
          </View>
          <GoldButton secondary label="SAVE DRAFT ON THIS DEVICE" icon="save-outline" onPress={() => void saveDraftNow()}/>
          <GoldButton label="CHECK MY LISTING" icon="checkmark-circle-outline" onPress={preview}/>
          <GoldButton secondary label="BACK TO MARKETPLACE" onPress={goBack}/>
          <AppText style={s.footer}>THE TRADER'S EXCHANGE  ·  DESIGN PREVIEW  ·  NOTHING GOES LIVE
          </AppText>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  </MapTextureBackground>;
}
const s = StyleSheet.create({
  
  featuredPanel: { shadowOpacity: .3, shadowRadius: 18, elevation: 6 },
  pressedTile: { transform: [{ scale: .975 }], opacity: .9 },
  readyBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9,
    borderRadius: 12, borderWidth: 1, borderColor: '#E6BE67', backgroundColor: '#273120',
    paddingVertical: 12, paddingHorizontal: 9, marginBottom: 12 },
  readyText: { fontFamily: typography.label, color: PALE, fontSize: 10, letterSpacing: .8, fontWeight: '800' },
  saveRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12 },
  saveStatus: { fontFamily: typography.label, fontSize: 10, letterSpacing: .6, color: MUTED },
  buyerCard: { borderWidth: 1, borderColor: '#D9A83E', backgroundColor: '#0A1C2A', borderRadius: 18, overflow: 'hidden' },
  previewPlaceholder: { height: 190, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#102B3A' },
  placeholderText: { fontFamily: typography.label, color: MUTED, letterSpacing: 1.3, fontSize: 11 },
  previewImageShade: { height: 74, marginTop: -74, justifyContent: 'flex-end', padding: 12 },
  previewBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 20,
    backgroundColor: 'rgba(5,17,27,.88)', borderWidth: 1, borderColor: '#B88B35', paddingHorizontal: 10, paddingVertical: 7 },
  previewBadgeText: { fontFamily: typography.label, color: PALE, fontSize: 9, letterSpacing: .8 },
  buyerCardCopy: { padding: 16, gap: 8 },
  buyerEyebrow: { fontFamily: typography.label, color: GOLD, fontSize: 10, letterSpacing: 1.3 },
  buyerTitle: { fontFamily: typography.heading, color: '#FFF', fontSize: 23 },
  buyerPrice: { fontFamily: typography.heading, color: PALE, fontSize: 29 },
  buyerMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  buyerMeta: { fontFamily: typography.body, color: MUTED, fontSize: 13 },
  previewDetailHeading: { fontFamily: typography.label, color: PALE, fontSize: 11, letterSpacing: 1.4, marginTop: 20 },
  suggestions: { marginTop: 7, borderRadius: 13, borderWidth: 1, borderColor: '#A56B18', backgroundColor: '#102735', overflow: 'hidden' },
  
  suggestionRow: { 
    minHeight: 44, 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 11, 
    paddingHorizontal: 13, 
    paddingVertical: 9, 
    borderBottomWidth: StyleSheet.hairlineWidth, 
    borderBottomColor: '#39505B' 
  },
  
  suggestionText: { fontFamily: typography.body, color: '#F2F0E8', fontSize: 14, flex: 1 },
  
  specGrid: { gap: 12 }, 
  specField: { gap: 7 }, 
  specLabel: { fontFamily: typography.label, color: MUTED, fontSize: 11, letterSpacing: .8 }, 
  priceCompact: { 
    marginTop: 10, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingVertical: 10, 
    paddingHorizontal: 13, 
    backgroundColor: '#172C3B', 
    borderRadius: 12 
  }, 
  priceCompactText: { fontFamily: typography.heading, color: PALE, fontSize: 23 }, 
  expandRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, 
  expandTitle: { flexDirection: 'row', alignItems: 'center', gap: 9 }, 
  extraContent: { marginTop: 16, gap: 10 }, 
  smallMultiline: { minHeight: 86, paddingTop: 12 }, 
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9 }, 
  inlineDivider: { height: 1, backgroundColor: '#38505C', marginVertical: 17 },
  
  progressHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 18 }, 
  progressCount: { fontFamily: typography.label, color: PALE, fontSize: 9, letterSpacing: .4 }, 
  progressTrack: { height: 4, borderRadius: 4, backgroundColor: '#263A48', overflow: 'hidden', marginBottom: 12 }, 
  progressFill: { height: '100%', backgroundColor: PALE }, 
  photoActions: { 
    position: 'absolute', 
    bottom: 5, 
    left: 5, 
    flexDirection: 'row', 
    gap: 6, 
    padding: 2, 
    borderRadius: 12, 
    backgroundColor: 'rgba(0,0,0,.7)' 
  },
  
  flex: { flex: 1 }, 
  root: { flex: 1, backgroundColor: INK }, 
  hero: { minHeight: 375 }, 
  heroImage: { opacity: .96 }, 
  heroShade: { flex: 1, justifyContent: 'space-between' }, 
  topRow: { paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 12 }, 
  backCircle: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    backgroundColor: 'rgba(2,12,23,.75)', 
    borderColor: GOLD, 
    borderWidth: 1, 
    alignItems: 'center', 
    justifyContent: 'center' 
  }, 
  brand: { fontFamily: typography.label, flex: 1, color: PALE, fontWeight: '800', letterSpacing: 1.1, fontSize: 11 }, 
  heroCopy: { paddingHorizontal: 24, paddingBottom: 21, paddingTop: 62 }, 
  eyebrow: { fontFamily: typography.label, color: PALE, fontSize: 10, letterSpacing: 1.8, fontWeight: '800', marginBottom: 13 }, 
  heroTitle: { 
    fontFamily: typography.heading, 
    fontSize: 42, 
    lineHeight: 46, 
    color: '#FFFFFF', 
    fontWeight: '900', 
    letterSpacing: -1.3, 
    textShadowColor: '#000', 
    textShadowRadius: 12 
  }, 
  heroGold: { fontFamily: typography.heading, color: PALE, textShadowColor: '#C78B24', textShadowRadius: 10 }, 
  shortRule: { width: 68, height: 4, backgroundColor: PALE, borderRadius: 4, marginVertical: 16 }, 
  heroSubtitle: { fontFamily: typography.subtitle, color: '#FFFFFF', fontSize: 21, fontWeight: '700', marginBottom: 7 }, 
  heroBody: { fontFamily: typography.body, color: '#DFE6EA', fontSize: 15, lineHeight: 23, maxWidth: 330 }, 
  content: { paddingHorizontal: 16 }, 
  steps: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginTop: -3, 
    marginBottom: 19, 
    paddingTop: 11, 
    borderTopWidth: 1, 
    borderTopColor: GOLD 
  }, 
  stepItem: { alignItems: 'center', width: '20%' }, 
  stepCircle: { 
    width: 37, 
    height: 37, 
    borderRadius: 20, 
    backgroundColor: '#0B1B28', 
    borderColor: GOLD, 
    borderWidth: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  }, 
  stepActive: { backgroundColor: GOLD, shadowColor: GOLD, shadowOpacity: .8, shadowRadius: 10, elevation: 6 }, 
  stepDone: { backgroundColor: PALE }, 
  stepNumber: { fontFamily: typography.label, color: PALE, fontWeight: '800', fontSize: 16 }, 
  stepText: { fontFamily: typography.body, color: MUTED, fontSize: 10, marginTop: 8, fontWeight: '600' }, 
  intro: { marginBottom: 12, paddingHorizontal: 4 }, 
  sectionKicker: { fontFamily: typography.label, color: GOLD, letterSpacing: 2.2, fontSize: 11, fontWeight: '800', marginBottom: 10 }, 
  sectionTitle: { fontFamily: typography.heading, color: '#FFF', fontSize: 31, fontWeight: '900', letterSpacing: -.8, marginBottom: 8 }, 
  sectionBody: { fontFamily: typography.body, color: MUTED, fontSize: 15, lineHeight: 23 }, 
  panel: { borderRadius: 24, marginBottom: 10, shadowColor: '#D89A27', shadowOpacity: .12, shadowRadius: 11, elevation: 3 }, 
  panelInner: { borderRadius: 21, backgroundColor: PANEL, padding: 14, borderWidth: 1, borderColor: 'rgba(255,230,160,.15)' }, 
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 }, 
  label: { fontFamily: typography.label, color: PALE, fontWeight: '800', fontSize: 13, letterSpacing: .9, flexShrink: 1 }, 
  hint: { fontFamily: typography.body, color: MUTED, fontSize: 11, textAlign: 'right', flexShrink: 1 }, 
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, 
  category: { 
    width: '47.8%', 
    minHeight: 80, 
    borderRadius: 15, 
    borderWidth: 1, 
    borderColor: '#A56B18', 
    backgroundColor: '#071826', 
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: 10, 
    gap: 9 
  }, 
  selected: { borderColor: PALE, backgroundColor: '#27301E', shadowColor: GOLD, shadowOpacity: .65, shadowRadius: 9, elevation: 5 }, 
  categoryText: { fontFamily: typography.bodyBold, color: '#DCE4E8', fontSize: 13, fontWeight: '700', textAlign: 'center' }, 
  input: { 
    minHeight: 51, 
    borderWidth: 1, 
    borderColor: '#956817', 
    backgroundColor: '#0C2130', 
    borderRadius: 15, 
    color: '#FFF', 
    paddingHorizontal: 16, 
    fontSize: 16 
  }, 
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 }, 
  pill: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8, 
    paddingHorizontal: 13, 
    paddingVertical: 12, 
    borderRadius: 24, 
    borderWidth: 1, 
    borderColor: '#A56B18', 
    backgroundColor: '#0C2130' 
  }, 
  pillText: { fontFamily: typography.body, color: '#E6EBEE', fontSize: 13 }, 
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, 
  photoSlot: { width: '30%', aspectRatio: .85, borderRadius: 13, overflow: 'hidden' }, 
  photo: { width: '100%', height: '100%' }, 
  removePhoto: { 
    position: 'absolute', 
    top: 5, 
    right: 5, 
    backgroundColor: 'rgba(0,0,0,.75)', 
    width: 28, 
    height: 28, 
    borderRadius: 14, 
    alignItems: 'center', 
    justifyContent: 'center' 
  }, 
  addPhoto: { 
    width: '30%', 
    aspectRatio: .85, 
    borderRadius: 13, 
    borderWidth: 1.5, 
    borderStyle: 'dashed', 
    borderColor: GOLD, 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 8 
  }, 
  addPhotoText: { fontFamily: typography.body, color: PALE, fontSize: 12 }, 
  note: { fontFamily: typography.body, color: MUTED, fontSize: 13, lineHeight: 20, marginTop: 12, flex: 1 }, 
  priceBox: { marginTop: 14, padding: 17, backgroundColor: '#172C3B', borderRadius: 15, borderWidth: 1, borderColor: '#526574' }, 
  mini: { fontFamily: typography.label, color: MUTED, letterSpacing: 1.2, fontSize: 11, fontWeight: '700' }, 
  priceText: { fontFamily: typography.heading, color: PALE, fontSize: 31, fontWeight: '900', marginTop: 6 }, 
  description: { minHeight: 125, paddingTop: 15 }, 
  counter: { fontFamily: typography.body, color: MUTED, textAlign: 'right', marginTop: 8, fontSize: 11 }, 
  locationNote: { flexDirection: 'row', alignItems: 'center', gap: 10 }, 
  previewPhoto: { width: '100%', height: 220 }, 
  previewPrice: { fontFamily: typography.heading, color: PALE, fontSize: 32, fontWeight: '900', marginTop: 15 }, 
  previewTitle: { fontFamily: typography.title, color: '#FFF', fontSize: 24, fontWeight: '800', marginTop: 5 }, 
  previewMeta: { fontFamily: typography.body, color: MUTED, fontSize: 14, marginTop: 8 }, 
  divider: { height: 1, backgroundColor: '#38505C', marginVertical: 18 }, 
  previewDescription: { fontFamily: typography.body, color: '#DDE5EA', fontSize: 15, lineHeight: 24 }, 
  draftNotice: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12, 
    marginTop: 16, 
    padding: 12, 
    backgroundColor: '#172C3B', 
    borderRadius: 13 
  }, 
  buttonOuter: { 
    borderRadius: 19, 
    overflow: 'hidden', 
    marginTop: 12, 
    borderWidth: 1.5, 
    borderColor: PALE, 
    shadowColor: GOLD, 
    shadowOpacity: .35, 
    shadowRadius: 9, 
    elevation: 4 
  }, 
  button: { minHeight: 62, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 13, paddingHorizontal: 15 }, 
  buttonText: { fontFamily: typography.button, color: INK, fontWeight: '900', letterSpacing: .8, fontSize: 15 }, 
  secondaryOuter: { borderColor: '#A97A29', backgroundColor: '#0A1A25', shadowOpacity: 0 }, 
  secondaryButton: { minHeight: 56, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 11 }, 
  secondaryText: { fontFamily: typography.button, color: PALE, fontWeight: '700', fontSize: 14 }, 
  footer: { fontFamily: typography.label, textAlign: 'center', marginTop: 20, fontSize: 9, color: '#718796', letterSpacing: 1.1 },

});

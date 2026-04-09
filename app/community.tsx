import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Animated,
  Dimensions,
  StatusBar,
  Alert,
  Modal,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const { width, height } = Dimensions.get("window");

// ─── Animated Pulse Ring ──────────────────────────────────────────────────────
function PulseRing({ size, delay }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <Animated.View pointerEvents="none" style={{
      position: "absolute", width: size, height: size, borderRadius: size / 2,
      borderWidth: 1.5, borderColor: "rgba(255,255,255,0.4)",
      opacity: anim.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 0.8, 0] }),
      transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.6] }) }],
    }} />
  );
}

// ─── Counter Animation ────────────────────────────────────────────────────────
function CountUp({ target, duration = 1000, delay = 0 }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let raf, start = null;
    const step = (ts) => {
      if (!start) start = ts + delay;
      const e = ts - start;
      if (e < 0) { raf = requestAnimationFrame(step); return; }
      const p = Math.min(e / duration, 1);
      setVal(Math.floor((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return <>{val}</>;
}

// ─── Campaign Card Component ──────────────────────────────────────────────────
function CampaignCard({ campaign, index, onJoin, joined }) {
  const slideAnim = useRef(new Animated.Value(50)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const joinScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 500, delay: index * 120, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, delay: index * 120, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleJoin = () => {
    Animated.sequence([
      Animated.spring(joinScale, { toValue: 0.92, useNativeDriver: true }),
      Animated.spring(joinScale, { toValue: 1, useNativeDriver: true }),
    ]).start();
    onJoin(campaign.id);
  };

  const pressIn = () => Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: true }).start();
  const pressOut = () => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();

  return (
    <Animated.View style={{
      opacity: fadeAnim,
      transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
      marginBottom: 18,
    }}>
      <TouchableOpacity activeOpacity={1} onPressIn={pressIn} onPressOut={pressOut}>
        <View style={campaignStyles.card}>
          {/* Image */}
          <View style={campaignStyles.imageWrap}>
            <Image source={{ uri: campaign.image }} style={campaignStyles.image} resizeMode="cover" />
            <View style={campaignStyles.imageOverlay} />
            
            {/* Campaign Status Badge */}
            <View style={[campaignStyles.statusBadge, { backgroundColor: campaign.active ? "#27ae60" : "#95a5a6" }]}>
              <View style={campaignStyles.statusDot} />
              <Text style={campaignStyles.statusText}>
                {campaign.active ? "Active" : "Upcoming"}
              </Text>
            </View>

            {/* Category Tag */}
            <View style={campaignStyles.categoryTag}>
              <Ionicons name={campaign.icon} size={12} color="#fff" />
              <Text style={campaignStyles.categoryText}>{campaign.category}</Text>
            </View>
          </View>

          {/* Content */}
          <View style={campaignStyles.content}>
            {/* Title */}
            <Text style={campaignStyles.title} numberOfLines={2}>{campaign.title}</Text>

            {/* Description */}
            <Text style={campaignStyles.description} numberOfLines={2}>
              {campaign.description}
            </Text>

            {/* Meta row: Started by + Progress */}
            <View style={campaignStyles.metaRow}>
              <View style={campaignStyles.metaLeft}>
                <View style={campaignStyles.avatarSmall}>
                  <Image source={{ uri: campaign.startedByAvatar }} style={{ width: "100%", height: "100%" }} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={campaignStyles.metaLabel}>Started by</Text>
                  <Text style={campaignStyles.metaValue} numberOfLines={1}>{campaign.startedBy}</Text>
                </View>
              </View>

              {/* Join Progress */}
              <View style={campaignStyles.metaRight}>
                <Text style={campaignStyles.joinCount}><CountUp target={campaign.joined} /></Text>
                <Text style={campaignStyles.joinTarget}>/ {campaign.target}</Text>
              </View>
            </View>

            {/* Progress bar */}
            <View style={campaignStyles.progressBarWrap}>
              <View style={[
                campaignStyles.progressBarFill,
                { width: `${Math.min((campaign.joined / campaign.target) * 100, 100)}%` }
              ]} />
            </View>

            {/* Actions: Join button + Share */}
            <View style={campaignStyles.actionRow}>
              <Animated.View style={{ flex: 1, transform: [{ scale: joinScale }] }}>
                <TouchableOpacity
                  style={[
                    campaignStyles.joinBtn,
                    joined?.[campaign.id] && campaignStyles.joinBtnActive
                  ]}
                  onPress={handleJoin}
                >
                  <Ionicons
                    name={joined?.[campaign.id] ? "checkmark-circle" : "add-circle-outline"}
                    size={16}
                    color={joined?.[campaign.id] ? "#fff" : "#2e7d32"}
                  />
                  <Text style={[
                    campaignStyles.joinBtnText,
                    joined?.[campaign.id] && campaignStyles.joinBtnTextActive
                  ]}>
                    {joined?.[campaign.id] ? "Joined" : "Join Campaign"}
                  </Text>
                </TouchableOpacity>
              </Animated.View>

              <TouchableOpacity style={campaignStyles.shareBtn}>
                <Ionicons name="share-social-outline" size={16} color="#0277bd" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Accent stripe */}
          <View style={[campaignStyles.accentStripe, { backgroundColor: campaign.color }]} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Stats Chip ───────────────────────────────────────────────────────────────
function StatChip({ icon, label, value }) {
  return (
    <View style={statsStyles.chip}>
      <View style={statsStyles.chipIcon}>
        <Ionicons name={icon} size={16} color="#fff" />
      </View>
      <View>
        <Text style={statsStyles.chipValue}>{value}</Text>
        <Text style={statsStyles.chipLabel}>{label}</Text>
      </View>
    </View>
  );
}

// ─── Main Community Page ──────────────────────────────────────────────────────
export default function Community() {
  const router = useRouter();
  const [joined, setJoined] = useState({});
  const [filter, setFilter] = useState("All");

  const headerAnim = useRef(new Animated.Value(-20)).current;
  const headerFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
      Animated.timing(headerFade, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleJoin = (campaignId) => {
    setJoined(prev => ({
      ...prev,
      [campaignId]: !prev[campaignId]
    }));
    Alert.alert(
      joined[campaignId] ? "Left Campaign" : "Joined Campaign",
      joined[campaignId]
        ? "You've left this campaign"
        : "Thank you for joining! You'll get updates on this campaign.",
      [{ text: "OK", onPress: () => {} }]
    );
  };

  // Sample campaigns data with images
  const campaigns = [
    {
      id: 1,
      title: "Clean Streets 2024",
      description: "Community-led initiative to clean streets and remove debris in East Ward",
      category: "Cleanliness",
      icon: "trash-bin-outline",
      image: "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=500&h=300&fit=crop",
      active: true,
      startedBy: "Priya Sharma",
      startedByAvatar: "https://i.pravatar.cc/100?img=1",
      joined: 127,
      target: 200,
      color: "#27ae60",
    },
    {
      id: 2,
      title: "Pothole Repair Drive",
      description: "Report and track pothole repairs happening on main roads this month",
      category: "Roads",
      icon: "build-outline",
      image: "https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=500&h=300&fit=crop",
      active: true,
      startedBy: "Raj Kumar",
      startedByAvatar: "https://i.pravatar.cc/100?img=2",
      joined: 89,
      target: 150,
      color: "#e74c3c",
    },
    {
      id: 3,
      title: "Green Ward Initiative",
      description: "Plant 500 trees in our ward to create a greener, healthier environment",
      category: "Green Space",
      icon: "leaf-outline",
      image: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=500&h=300&fit=crop",
      active: true,
      startedBy: "Amit Patel",
      startedByAvatar: "https://i.pravatar.cc/100?img=3",
      joined: 234,
      target: 300,
      color: "#2ecc71",
    },
    {
      id: 4,
      title: "Safe Streetlights",
      description: "Campaign to install smart streetlights for better safety and energy efficiency",
      category: "Safety",
      icon: "bulb-outline",
      image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500&h=300&fit=crop",
      active: false,
      startedBy: "Neha Singh",
      startedByAvatar: "https://i.pravatar.cc/100?img=4",
      joined: 156,
      target: 250,
      color: "#f39c12",
    },
    {
      id: 5,
      title: "Water Conservation Drive",
      description: "Join us in reporting water leaks and fixing drainage issues across the ward",
      category: "Water",
      icon: "water-outline",
      image: "https://images.unsplash.com/photo-1559027294-69904ccee0ff?w=500&h=300&fit=crop",
      active: true,
      startedBy: "Vikram Das",
      startedByAvatar: "https://i.pravatar.cc/100?img=5",
      joined: 198,
      target: 300,
      color: "#3498db",
    },
  ];

  const activeCampaigns = campaigns.filter(c => c.active).length;
  const totalParticipants = campaigns.reduce((sum, c) => sum + c.joined, 0);

  const FILTERS = ["All", "Active", "Cleanliness", "Roads", "Green Space"];
  const getFiltered = () => {
    if (filter === "All") return campaigns;
    if (filter === "Active") return campaigns.filter(c => c.active);
    return campaigns.filter(c => c.category === filter);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1b5e20" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* ── HEADER ── */}
        <Animated.View style={[styles.header, { transform: [{ translateY: headerAnim }], opacity: headerFade }]}>
          <View style={styles.headerBlob1} />
          <View style={styles.headerBlob2} />

          <View style={styles.headerTopRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={{ flex: 1, marginHorizontal: 12 }}>
              <Text style={styles.headerGreeting}>Community</Text>
              <Text style={styles.headerSubtitle}>Join campaigns & make an impact</Text>
            </View>
            <View style={styles.headerLogo}>
              <Ionicons name="people" size={24} color="#fff" />
            </View>
          </View>

          {/* Stats strip */}
          <View style={styles.statsStrip}>
            <StatChip icon="flag" label="Campaigns" value={activeCampaigns} />
            <View style={styles.chipDivider} />
            <StatChip icon="person" label="Total Joined" value={totalParticipants} />
          </View>
        </Animated.View>

        {/* ── FILTERS ── */}
        <View style={styles.filtersSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
          >
            {FILTERS.map((f) => (
              <TouchableOpacity
                key={f}
                style={[
                  styles.filterPill,
                  filter === f && styles.filterPillActive
                ]}
                onPress={() => setFilter(f)}
              >
                <Text style={[
                  styles.filterPillText,
                  filter === f && styles.filterPillTextActive
                ]}>
                  {f}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ── CAMPAIGNS LIST ── */}
        <View style={styles.campaignsSection}>
          {getFiltered().length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={50} color="#c8e6c9" />
              <Text style={styles.emptyText}>No campaigns found</Text>
              <Text style={styles.emptySubtext}>Try a different filter</Text>
            </View>
          ) : (
            getFiltered().map((campaign, i) => (
              <CampaignCard
                key={campaign.id}
                campaign={campaign}
                index={i}
                onJoin={handleJoin}
                joined={joined}
              />
            ))
          )}
        </View>

        {/* ── START NEW CAMPAIGN CTA ── */}
        <View style={styles.ctaSection}>
          <TouchableOpacity style={styles.ctaCard}>
            <View style={styles.ctaIcon}>
              <Ionicons name="sparkles" size={28} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.ctaTitle}>Start a Campaign</Text>
              <Text style={styles.ctaSubtitle}>Create your own to inspire change</Text>
            </View>
            <Ionicons name="arrow-forward" size={20} color="#2e7d32" />
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Campaign card styles ────────────────────────────────────────────────────
const campaignStyles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#1b5e20",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  accentStripe: {
    position: "absolute",
    left: 0, top: 0, bottom: 0,
    width: 4,
    borderBottomLeftRadius: 20,
  },
  imageWrap: {
    width: "100%",
    height: 180,
    position: "relative",
    backgroundColor: "#f1f8e9",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.15)",
  },
  statusBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#27ae60",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#fff",
  },
  statusText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  categoryTag: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  categoryText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  content: {
    padding: 16,
    paddingTop: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: "900",
    color: "#1b5e20",
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  description: {
    fontSize: 13,
    color: "#666",
    lineHeight: 18,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  metaLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  avatarSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#e8f5e9",
  },
  metaLabel: {
    fontSize: 10,
    color: "#999",
    fontWeight: "600",
  },
  metaValue: {
    fontSize: 12,
    color: "#1b5e20",
    fontWeight: "700",
  },
  metaRight: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
  },
  joinCount: {
    fontSize: 16,
    fontWeight: "900",
    color: "#2e7d32",
  },
  joinTarget: {
    fontSize: 12,
    color: "#999",
    fontWeight: "600",
  },
  progressBarWrap: {
    height: 6,
    backgroundColor: "#f1f8e9",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 14,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#2e7d32",
    borderRadius: 3,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  joinBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#2e7d32",
  },
  joinBtnActive: {
    backgroundColor: "#2e7d32",
    borderColor: "#2e7d32",
  },
  joinBtnText: {
    fontSize: 13,
    color: "#2e7d32",
    fontWeight: "700",
  },
  joinBtnTextActive: {
    color: "#fff",
  },
  shareBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#e3f2fd",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#bde0ff",
  },
});

// ─── Stats styles ────────────────────────────────────────────────────────────
const statsStyles = StyleSheet.create({
  chip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  chipIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  chipValue: {
    fontSize: 18,
    fontWeight: "900",
    color: "#fff",
  },
  chipLabel: {
    fontSize: 10,
    color: "#a5d6a7",
    fontWeight: "600",
    marginTop: 2,
  },
});

// ─── Main styles ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f1f8e9",
  },
  header: {
    backgroundColor: "#1b5e20",
    paddingHorizontal: 16,
    paddingBottom: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: "hidden",
    shadowColor: "#1b5e20",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 14,
    marginBottom: 20,
  },
  headerBlob1: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(255,255,255,0.05)",
    top: -60,
    right: -40,
  },
  headerBlob2: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.04)",
    bottom: -20,
    left: -30,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
    marginTop: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerGreeting: {
    fontSize: 14,
    color: "#a5d6a7",
    fontWeight: "500",
  },
  headerSubtitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: -0.5,
    marginTop: 4,
  },
  headerLogo: {
    marginLeft: 12,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.3)",
  },
  statsStrip: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  chipDivider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.15)",
    marginHorizontal: 12,
  },
  filtersSection: {
    marginBottom: 16,
  },
  filterPill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#c8e6c9",
  },
  filterPillActive: {
    backgroundColor: "#1b5e20",
    borderColor: "#1b5e20",
  },
  filterPillText: {
    fontSize: 12,
    color: "#2e7d32",
    fontWeight: "700",
  },
  filterPillTextActive: {
    color: "#fff",
  },
  campaignsSection: {
    paddingHorizontal: 20,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "900",
    color: "#1b5e20",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 13,
    color: "#81c784",
    marginTop: 6,
  },
  ctaSection: {
    paddingHorizontal: 20,
    marginTop: 28,
  },
  ctaCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "linear-gradient(135deg, #e8f5e9, #f1f8e9)",
    padding: 18,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "#c8e6c9",
    shadowColor: "#1b5e20",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  ctaIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#2e7d32",
    alignItems: "center",
    justifyContent: "center",
  },
  ctaTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#1b5e20",
    marginBottom: 2,
  },
  ctaSubtitle: {
    fontSize: 12,
    color: "#81c784",
    fontWeight: "600",
  },
});

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
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import api from "../api";
import useUserStore from "../store/userStore";
import { useLocationContext } from "../context/locationcontext";
import * as Location from "expo-location";

const { width } = Dimensions.get("window");

// ─── Status config ────────────────────────────────────────────────────────────
// Stages from Issue model: PROCESSING → NEEDS_CONFIRMATION → ASSIGNED → IN_PROGRESS → RESOLVED → CLOSED
const STATUS = {
  PROCESSING:         { color: "#8e24aa", bg: "#f3e5f5", icon: "sync",              label: "Processing",          gradient: ["#8e24aa", "#6a1b9a"] },
  NEEDS_CONFIRMATION: { color: "#f9a825", bg: "#fff8e1", icon: "help-circle",       label: "Needs Confirmation",  gradient: ["#f9a825", "#f57f17"] },
  ASSIGNED:           { color: "#0288d1", bg: "#e1f5fe", icon: "person",            label: "Assigned",            gradient: ["#0288d1", "#01579b"] },
  IN_PROGRESS:        { color: "#ef6c00", bg: "#fff3e0", icon: "hammer",            label: "In Progress",         gradient: ["#ef6c00", "#e65100"] },
  RESOLVED:           { color: "#2e7d32", bg: "#e8f5e9", icon: "checkmark-circle",  label: "Resolved",            gradient: ["#2e7d32", "#1b5e20"] },
  CLOSED:             { color: "#546e7a", bg: "#eceff1", icon: "lock-closed",       label: "Closed",              gradient: ["#546e7a", "#37474f"] },
};
const getStatus = (s) =>
  STATUS[s] || { color: "#555", bg: "#eee", icon: "help-circle", label: s?.replace(/_/g, " ") || "Pending", gradient: ["#555", "#333"] };

// Human-readable stage label
const stageLabel = (s) => getStatus(s).label || s?.replace(/_/g, " ") || "Pending";
const isProcessing = (s) => s?.toUpperCase() === "PROCESSING";

// ─── Severity config ──────────────────────────────────────────────────────────
const SEVERITY = {
  LOW:      { color: "#43a047", bg: "#e8f5e9", label: "Low",      bar: 0.25 },
  MEDIUM:   { color: "#fb8c00", bg: "#fff8e1", label: "Medium",   bar: 0.55 },
  HIGH:     { color: "#e53935", bg: "#ffebee", label: "High",     bar: 0.80 },
  CRITICAL: { color: "#b71c1c", bg: "#fce4ec", label: "Critical", bar: 1.0  },
};
const getSeverity = (s) =>
  SEVERITY[s?.toUpperCase()] || { color: "#888", bg: "#f5f5f5", label: s || "Unknown", bar: 0.3 };

// ─── Animated helpers ─────────────────────────────────────────────────────────
function CountUp({ target, duration = 1400, delay = 0 }) {
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

function PulseRing({ size, delay }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 0,    useNativeDriver: true }),
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

function ActionCard({ icon, label, sub, color, bg, onPress, delay, large }) {
  const slideAnim = useRef(new Animated.Value(30)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 500, delay, useNativeDriver: true }),
      Animated.timing(fadeAnim,  { toValue: 1, duration: 500, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  const pressIn  = () => Animated.spring(scaleAnim, { toValue: 0.94, useNativeDriver: true }).start();
  const pressOut = () => Animated.spring(scaleAnim, { toValue: 1,    useNativeDriver: true }).start();
  return (
    <Animated.View style={[
      large ? styles.actionLarge : styles.actionSmall,
      { transform: [{ translateY: slideAnim }, { scale: scaleAnim }], opacity: fadeAnim },
    ]}>
      <TouchableOpacity style={{ flex: 1 }} onPress={onPress} onPressIn={pressIn} onPressOut={pressOut} activeOpacity={1}>
        <View style={[large ? styles.actionLargeInner : styles.actionSmallInner, { backgroundColor: bg }]}>
          <View style={[styles.actionIconCircle, { backgroundColor: color }]}>
            <Ionicons name={icon} size={large ? 26 : 22} color="#fff" />
          </View>
          <Text style={[styles.actionLabel, { color: "#1b5e20" }]}>{label}</Text>
          {sub ? <Text style={styles.actionSub}>{sub}</Text> : null}
          {large && (
            <View style={[styles.actionArrow, { backgroundColor: color }]}>
              <Ionicons name="arrow-forward" size={14} color="#fff" />
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

function FilterPill({ label, active, onPress, count }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pressIn  = () => Animated.spring(scaleAnim, { toValue: 0.9,  useNativeDriver: true }).start();
  const pressOut = () => Animated.spring(scaleAnim, { toValue: 1,    useNativeDriver: true }).start();
  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[styles.filterPill, active && styles.filterPillActive]}
        onPress={onPress} onPressIn={pressIn} onPressOut={pressOut} activeOpacity={1}
      >
        <Text style={[styles.filterPillText, active && styles.filterPillTextActive]}>{label}</Text>
        {count !== undefined && (
          <View style={[styles.filterCount, active && styles.filterCountActive]}>
            <Text style={[styles.filterCountText, active && styles.filterCountTextActive]}>{count}</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Nearby Issue Card — the star of this update ──────────────────────────────
function NearbyIssueCard({ issue, upvoted, onUpvote, index, onImagePress }) {
  const fadeAnim    = useRef(new Animated.Value(0)).current;
  const slideAnim   = useRef(new Animated.Value(50)).current;
  const scaleAnim   = useRef(new Animated.Value(1)).current;
  const upvoteScale = useRef(new Animated.Value(1)).current;
  const barAnim     = useRef(new Animated.Value(0)).current;

  const s   = getStatus(issue.status);
  const sev = getSeverity(issue.severity);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 500, delay: index * 90, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, delay: index * 90, useNativeDriver: true }),
    ]).start();
    Animated.timing(barAnim, {
      toValue: sev.bar, duration: 900, delay: index * 90 + 400, useNativeDriver: false,
    }).start();
  }, []);

  const handleUpvote = () => {
    Animated.sequence([
      Animated.spring(upvoteScale, { toValue: 1.5, useNativeDriver: true, tension: 400 }),
      Animated.spring(upvoteScale, { toValue: 1,   useNativeDriver: true, tension: 300 }),
    ]).start();
    onUpvote(issue.id);
  };

  const pressIn  = () => Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true }).start();
  const pressOut = () => Animated.spring(scaleAnim, { toValue: 1,    useNativeDriver: true }).start();

  const timeAgo = (ts) => {
    if (!ts) return "";
    const d = Math.floor((Date.now() - new Date(ts)) / 60000);
    if (d < 1) return "just now";
    if (d < 60) return `${d}m ago`;
    if (d < 1440) return `${Math.floor(d / 60)}h ago`;
    return `${Math.floor(d / 1440)}d ago`;
  };

  return (
    <Animated.View style={{
      opacity: fadeAnim,
      transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
      marginBottom: 16,
    }}>
      <TouchableOpacity activeOpacity={1} onPressIn={pressIn} onPressOut={pressOut}>
        <View style={nearbyStyles.card}>

          {/* ── Top: image or coloured placeholder ── */}
          {issue.primary_image ? (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => onImagePress?.(issue.primary_image)}
              style={nearbyStyles.imgWrap}
            >
              <Image source={{ uri: issue.primary_image }} style={nearbyStyles.img} resizeMode="cover" />
              <View style={nearbyStyles.imgOverlay} />
              {/* Tap hint */}
              <View style={nearbyStyles.expandHint}>
                <Ionicons name="expand-outline" size={14} color="#fff" />
              </View>
              {/* Severity badge — hide for PROCESSING */}
              {!isProcessing(issue.status) && (
                <View style={[nearbyStyles.sevBadge, { backgroundColor: sev.color }]}>  
                  <Text style={nearbyStyles.sevBadgeText}>{sev.label}</Text>
                </View>
              )}
              {/* Stage pill — hide for PROCESSING */}
              {!isProcessing(issue.status) && (
                <View style={[nearbyStyles.statusOnImg, { backgroundColor: s.color }]}>  
                  <Ionicons name={s.icon} size={10} color="#fff" />
                  <Text style={nearbyStyles.statusOnImgText}>
                    {stageLabel(issue.status)}
                  </Text>
                </View>
              )}
              {/* Show processing indicator */}
              {isProcessing(issue.status) && (
                <View style={[nearbyStyles.statusOnImg, { backgroundColor: s.color }]}>  
                  <Ionicons name="sync" size={10} color="#fff" />
                  <Text style={nearbyStyles.statusOnImgText}>Processing…</Text>
                </View>
              )}
            </TouchableOpacity>
          ) : (
            <View style={[nearbyStyles.placeholderWrap, { backgroundColor: s.bg }]}>  
              <View style={[nearbyStyles.placeholderIcon, { backgroundColor: s.color + "20" }]}>
                <Ionicons name={s.icon} size={32} color={s.color} />
              </View>
              {/* Severity badge — hide for PROCESSING */}
              {!isProcessing(issue.status) && (
                <View style={[nearbyStyles.sevBadge, { backgroundColor: sev.color }]}>  
                  <Text style={nearbyStyles.sevBadgeText}>{sev.label}</Text>
                </View>
              )}
              {/* Stage pill — hide for PROCESSING */}
              {!isProcessing(issue.status) && (
                <View style={[nearbyStyles.statusOnImg, { backgroundColor: s.color }]}>  
                  <Ionicons name={s.icon} size={10} color="#fff" />
                  <Text style={nearbyStyles.statusOnImgText}>
                    {stageLabel(issue.status)}
                  </Text>
                </View>
              )}
              {isProcessing(issue.status) && (
                <View style={[nearbyStyles.statusOnImg, { backgroundColor: s.color }]}>  
                  <Ionicons name="sync" size={10} color="#fff" />
                  <Text style={nearbyStyles.statusOnImgText}>Processing…</Text>
                </View>
              )}
            </View>
          )}

          {/* ── Bottom: content ── */}
          <View style={nearbyStyles.content}>
            {/* Dept name + time */}
            <View style={nearbyStyles.titleRow}>
              <Text style={nearbyStyles.deptName} numberOfLines={1}>
                {issue.dept?.name || "Civic Issue"}
              </Text>
              <Text style={nearbyStyles.time}>{timeAgo(issue.created_at)}</Text>
            </View>

            {/* Severity bar */}
            <View style={nearbyStyles.barTrack}>
              <Animated.View style={[
                nearbyStyles.barFill,
                {
                  backgroundColor: sev.color,
                  width: barAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }),
                }
              ]} />
            </View>

            {/* Meta chips + upvote row */}
            <View style={nearbyStyles.bottomRow}>
              <View style={nearbyStyles.metaRow}>
                <View style={nearbyStyles.metaChip}>
                  <Ionicons name="people-outline" size={12} color="#2e7d32" />
                  <Text style={nearbyStyles.metaChipText}>
                    {issue.report_count} {issue.report_count === 1 ? "report" : "reports"}
                  </Text>
                </View>
                {issue.dept?.name && (
                  <View style={[nearbyStyles.metaChip, { backgroundColor: "#e3f2fd" }]}>
                    <Ionicons name="business-outline" size={12} color="#1565c0" />
                    <Text style={[nearbyStyles.metaChipText, { color: "#1565c0" }]} numberOfLines={1}>
                      {issue.dept.name}
                    </Text>
                  </View>
                )}
              </View>

              {/* Upvote button */}
              <Animated.View style={{ transform: [{ scale: upvoteScale }] }}>
                <TouchableOpacity
                  style={[nearbyStyles.upvoteBtn, upvoted && nearbyStyles.upvoteBtnActive]}
                  onPress={handleUpvote}
                >
                  <Ionicons
                    name={upvoted ? "thumbs-up" : "thumbs-up-outline"}
                    size={14}
                    color={upvoted ? "#fff" : "#2e7d32"}
                  />
                  <Text style={[nearbyStyles.upvoteText, upvoted && nearbyStyles.upvoteTextActive]}>
                    {upvoted ? "Upvoted" : "Upvote"}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            </View>
          </View>

          {/* Accent stripe left edge */}
          <View style={[nearbyStyles.accentStripe, { backgroundColor: sev.color }]} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const router = useRouter();
  const { image, description, location } = useLocalSearchParams();
  const { wardInfo, corpInfo, resolving: locationResolving, error: locationError } = useLocationContext();

  const { user, logout } = useUserStore();
  const [logoutLoading, setLogoutLoading] = useState(false);

  const [upvoted,       setUpvoted]       = useState({});
  const [nearbyIssues,  setNearbyIssues]  = useState([]);
  const [loadingNearby, setLoadingNearby] = useState(true);
  const [filter,        setFilter]        = useState("All");
  const [loading,       setLoading]       = useState(false);
  const [fullImage,     setFullImage]     = useState(null);  // URI for fullscreen viewer

  const headerAnim  = useRef(new Animated.Value(-20)).current;
  const headerFade  = useRef(new Animated.Value(0)).current;
  const logoSway    = useRef(new Animated.Value(0)).current;
  const notifBounce = useRef(new Animated.Value(1)).current;
  const logoutScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
      Animated.timing(headerFade, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoSway, { toValue: 1,  duration: 3500, useNativeDriver: true }),
        Animated.timing(logoSway, { toValue: -1, duration: 3500, useNativeDriver: true }),
        Animated.timing(logoSway, { toValue: 0,  duration: 3500, useNativeDriver: true }),
      ])
    ).start();
    setTimeout(() => {
      Animated.sequence([
        Animated.spring(notifBounce, { toValue: 1.3, useNativeDriver: true }),
        Animated.spring(notifBounce, { toValue: 0.9, useNativeDriver: true }),
        Animated.spring(notifBounce, { toValue: 1,   useNativeDriver: true }),
      ]).start();
    }, 1800);

    fetchNearbyIssues();
  }, []);

  const fetchNearbyIssues = async () => {
    setLoadingNearby(true);
    try {
      const { status: permStatus } = await Location.requestForegroundPermissionsAsync();
      if (permStatus !== "granted") {
        setLoadingNearby(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = loc.coords;

      const res = await api.get("/api/issues/nearby/", {
        params: { latitude, longitude, radius: 2 },
      });

      const data = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.results)
        ? res.data.results
        : [];

      const normalised = data
        .filter((i) => i.latitude != null && i.longitude != null)
        .map((i) => ({
          id:            i.id,
          severity:      i.severity || null,
          status:        i.status || "REPORTED",
          latitude:      parseFloat(i.latitude),
          longitude:     parseFloat(i.longitude),
          dept:          i.dept || null,
          primary_image: i.primary_image || null,
          report_count:  i.report_count ?? 0,
          created_at:    i.created_at || null,
        }));

      setNearbyIssues(normalised);
    } catch (err) {
      console.warn("Nearby fetch error:", err?.message);
      // Demo fallback
      setNearbyIssues([
        { id: 1, severity: "HIGH",     status: "IN_PROGRESS", dept: { name: "Roads Dept" },       primary_image: null, report_count: 8,  created_at: new Date(Date.now() - 3600000).toISOString() },
        { id: 2, severity: "CRITICAL", status: "REPORTED",    dept: { name: "Drainage" },          primary_image: null, report_count: 14, created_at: new Date(Date.now() - 7200000).toISOString() },
        { id: 3, severity: "MEDIUM",   status: "PROCESSING",  dept: { name: "Sanitation" },        primary_image: null, report_count: 3,  created_at: new Date(Date.now() - 86400000).toISOString() },
        { id: 4, severity: "LOW",      status: "RESOLVED",    dept: { name: "Electricity Dept" },  primary_image: null, report_count: 2,  created_at: new Date(Date.now() - 172800000).toISOString() },
        { id: 5, severity: "HIGH",     status: "IN_PROGRESS", dept: { name: "Roads Dept" },        primary_image: null, report_count: 6,  created_at: new Date(Date.now() - 43200000).toISOString() },
      ]);
    } finally {
      setLoadingNearby(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out", style: "destructive",
        onPress: async () => {
          setLogoutLoading(true);
          try { await logout(); } catch {}
          setLogoutLoading(false);
          router.replace("/login");
        },
      },
    ]);
  };

  const logoutPressIn  = () => Animated.spring(logoutScale, { toValue: 0.85, useNativeDriver: true }).start();
  const logoutPressOut = () => Animated.spring(logoutScale, { toValue: 1,    useNativeDriver: true }).start();
  const toggleUpvote = (id) => setUpvoted((p) => ({ ...p, [id]: !p[id] }));

  const FILTERS = ["All", "PROCESSING", "ASSIGNED", "IN_PROGRESS", "RESOLVED"];
  const filterCounts = {
    "All":           nearbyIssues.length,
    "PROCESSING":    nearbyIssues.filter(i => ["PROCESSING","NEEDS_CONFIRMATION"].includes(i.status?.toUpperCase())).length,
    "ASSIGNED":      nearbyIssues.filter(i => i.status?.toUpperCase() === "ASSIGNED").length,
    "IN_PROGRESS":   nearbyIssues.filter(i => i.status?.toUpperCase() === "IN_PROGRESS").length,
    "RESOLVED":      nearbyIssues.filter(i => i.status?.toUpperCase() === "RESOLVED").length,
  };
  const getFiltered = () => {
    if (filter === "All") return nearbyIssues;
    if (filter === "PROCESSING") return nearbyIssues.filter(i => ["PROCESSING","NEEDS_CONFIRMATION"].includes(i.status?.toUpperCase()));
    return nearbyIssues.filter(i => i.status?.toUpperCase() === filter);
  };

  const spinSway = logoSway.interpolate({ inputRange: [-1, 1], outputRange: ["-5deg", "5deg"] });

  const resolved   = nearbyIssues.filter(i => i.status?.toUpperCase() === "RESOLVED").length;
  const inProgress = nearbyIssues.filter(i => i.status?.toUpperCase() === "IN_PROGRESS").length;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1b5e20" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* ── HEADER ── */}
        <Animated.View style={[styles.header, { transform: [{ translateY: headerAnim }], opacity: headerFade }]}>
          <View style={styles.headerBlob1} />
          <View style={styles.headerBlob2} />

          <View style={styles.headerTopRow}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={styles.headerGreeting}>Welcome to Nagrik Setu 👋</Text>
              <Text style={styles.headerName}>{user?.name || "Nagrik Setu"}</Text>
              {locationResolving ? (
                <View style={styles.locationChip}>
                  <ActivityIndicator size="small" color="#a5d6a7" style={{ marginRight: 6 }} />
                  <Text style={styles.locationChipText}>Detecting location…</Text>
                </View>
              ) : wardInfo ? (
                <View style={styles.locationChipRow}>
                  <View style={styles.locationChip}>
                    <Ionicons name="business-outline" size={11} color="#a5d6a7" style={{ marginRight: 4 }} />
                    <Text style={styles.locationChipText} numberOfLines={1}>{corpInfo?.name}</Text>
                  </View>
                  <View style={[styles.locationChip, { backgroundColor: "rgba(255,255,255,0.18)" }]}>
                    <Ionicons name="location-outline" size={11} color="#a5d6a7" style={{ marginRight: 4 }} />
                    <Text style={styles.locationChipText} numberOfLines={1}>{wardInfo?.name}</Text>
                  </View>
                </View>
              ) : locationError ? (
                <View style={styles.locationChip}>
                  <Ionicons name="warning-outline" size={11} color="#ef9a9a" style={{ marginRight: 4 }} />
                  <Text style={[styles.locationChipText, { color: "#ef9a9a" }]} numberOfLines={1}>{locationError}</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.headerRight}>
              <Animated.View style={{ transform: [{ scale: notifBounce }] }}>
                <TouchableOpacity style={styles.notifBtn} onPress={() => router.push("/notifications")}>
                  <Ionicons name="notifications" size={20} color="#fff" />
                  <View style={styles.notifDot} />
                </TouchableOpacity>
              </Animated.View>
              <Animated.View style={{ transform: [{ scale: logoutScale }] }}>
                <TouchableOpacity
                  style={styles.logoutBtn}
                  onPress={handleLogout}
                  onPressIn={logoutPressIn}
                  onPressOut={logoutPressOut}
                  disabled={logoutLoading}
                  activeOpacity={1}
                >
                  {logoutLoading
                    ? <ActivityIndicator size="small" color="#ef5350" />
                    : <Ionicons name="log-out-outline" size={20} color="#ef5350" />
                  }
                </TouchableOpacity>
              </Animated.View>
              <Animated.View style={{ transform: [{ rotate: spinSway }] }}>
                <View style={styles.headerLogoWrap}>
                  <PulseRing size={80} delay={0} />
                  <PulseRing size={80} delay={700} />
                  <View style={styles.headerLogo}>
                    <Ionicons name="leaf" size={28} color="#fff" />
                  </View>
                </View>
              </Animated.View>
            </View>
          </View>

          {/* Stats strip */}
          <View style={styles.statsStrip}>
            <View style={styles.statItem}>
              <Text style={styles.statVal}><CountUp target={nearbyIssues.length} /></Text>
              <Text style={styles.statLbl}>Nearby</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statVal}><CountUp target={resolved} delay={200} /></Text>
              <Text style={styles.statLbl}>Resolved</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statVal}><CountUp target={inProgress} delay={400} /></Text>
              <Text style={styles.statLbl}>In Progress</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statVal}><CountUp target={Object.values(upvoted).filter(Boolean).length} /></Text>
              <Text style={styles.statLbl}>Upvoted</Text>
            </View>
          </View>
        </Animated.View>

        {/* ── QUICK ACTIONS ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionAccent} />
            <Text style={styles.sectionTitle}>Quick Actions</Text>
          </View>
          <ActionCard icon="camera" label="Report Issue" sub="Snap & submit instantly" color="#2e7d32" bg="#e8f5e9" onPress={() => router.push("/report")} delay={100} large />
          <View style={styles.actionRow}>
            <ActionCard icon="map"           label="View Map"  color="#0277bd" bg="#e3f2fd" onPress={() => router.push("/map")}           delay={200} />
            <ActionCard icon="notifications" label="Alerts"    color="#e65100" bg="#fff3e0" onPress={() => router.push("/notifications")} delay={280} />
            <ActionCard icon="people"        label="Community" color="#6a1b9a" bg="#f3e5f5" onPress={() => router.push("/community")}     delay={360} />
          </View>
        </View>

        {/* ── NEARBY ISSUES ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionAccent, { backgroundColor: "#0277bd" }]} />
            <Text style={styles.sectionTitle}>Nearby Issues</Text>
            {loadingNearby
              ? <ActivityIndicator size="small" color="#2e7d32" style={{ marginLeft: 8 }} />
              : <TouchableOpacity onPress={fetchNearbyIssues} style={nearbyStyles.refreshBtn}>
                  <Ionicons name="refresh" size={14} color="#2e7d32" />
                </TouchableOpacity>
            }
            <Text style={styles.sectionCount}>{getFiltered().length} shown</Text>
          </View>

          {/* Filter pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll} contentContainerStyle={{ paddingRight: 16 }}>
            {FILTERS.map((f) => (
              <FilterPill key={f} label={f.replace(/_/g, " ")} active={filter === f} onPress={() => setFilter(f)} count={filterCounts[f]} />
            ))}
          </ScrollView>

          {loadingNearby ? (
            <View style={nearbyStyles.loadingWrap}>
              <ActivityIndicator size="large" color="#2e7d32" />
              <Text style={nearbyStyles.loadingText}>Scanning your area…</Text>
            </View>
          ) : getFiltered().length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-circle-outline" size={44} color="#c8e6c9" />
              <Text style={styles.emptyText}>All clear in this area!</Text>
            </View>
          ) : (
            getFiltered().map((issue, i) => (
              <NearbyIssueCard
                key={issue.id}
                issue={issue}
                upvoted={upvoted[issue.id]}
                onUpvote={toggleUpvote}
                onImagePress={setFullImage}
                index={i}
              />
            ))
          )}
        </View>

      </ScrollView>

      {/* ── Fullscreen Image Viewer Modal ── */}
      <Modal
        visible={!!fullImage}
        transparent
        animationType="fade"
        onRequestClose={() => setFullImage(null)}
      >
        <Pressable style={modalStyles.backdrop} onPress={() => setFullImage(null)}>
          <View style={modalStyles.container}>
            <TouchableOpacity style={modalStyles.closeBtn} onPress={() => setFullImage(null)}>
              <Ionicons name="close-circle" size={34} color="#fff" />
            </TouchableOpacity>
            {fullImage && (
              <Image
                source={{ uri: fullImage }}
                style={modalStyles.image}
                resizeMode="contain"
              />
            )}
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Modal styles ─────────────────────────────────────────────────────────────
const modalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  closeBtn: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
  },
  image: {
    width: width - 20,
    height: "75%",
    borderRadius: 12,
  },
});

// ─── Nearby card styles ───────────────────────────────────────────────────────
const nearbyStyles = StyleSheet.create({
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
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
  },
  // ── Image area ──
  imgWrap: {
    width: "100%",
    height: 160,
    position: "relative",
  },
  img: {
    width: "100%",
    height: "100%",
  },
  imgOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.08)",
  },
  placeholderWrap: {
    width: "100%",
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  placeholderIcon: {
    width: 60, height: 60, borderRadius: 30,
    alignItems: "center", justifyContent: "center",
  },
  sevBadge: {
    position: "absolute",
    bottom: 10, left: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sevBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  statusOnImg: {
    position: "absolute",
    top: 10, right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  statusOnImgText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "capitalize",
  },
  expandHint: {
    position: "absolute",
    top: 10, left: 12,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center", justifyContent: "center",
  },
  // ── Content area ──
  content: {
    padding: 14,
    paddingTop: 12,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  deptName: {
    fontSize: 16,
    fontWeight: "900",
    color: "#1b5e20",
    letterSpacing: -0.3,
    flex: 1,
    marginRight: 8,
  },
  time: {
    fontSize: 11,
    color: "#aaa",
    fontWeight: "600",
  },
  barTrack: {
    height: 5,
    backgroundColor: "#f1f8e9",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 12,
  },
  barFill: {
    height: "100%",
    borderRadius: 4,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    flex: 1,
    marginRight: 8,
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#e8f5e9",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  metaChipText: {
    fontSize: 11,
    color: "#2e7d32",
    fontWeight: "700",
  },
  upvoteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#c8e6c9",
    backgroundColor: "#fff",
  },
  upvoteBtnActive: {
    backgroundColor: "#2e7d32",
    borderColor: "#2e7d32",
  },
  upvoteText: {
    fontSize: 12,
    color: "#2e7d32",
    fontWeight: "700",
  },
  upvoteTextActive: {
    color: "#fff",
  },
  loadingWrap: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    color: "#81c784",
    fontSize: 13,
    fontWeight: "600",
  },
  refreshBtn: {
    marginLeft: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#e8f5e9",
    alignItems: "center",
    justifyContent: "center",
  },
});

// ─── Shared styles (preserved from original) ─────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f1f8e9" },
  header: { backgroundColor: "#1b5e20", paddingTop: 20, paddingHorizontal: 22, paddingBottom: 0, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, overflow: "hidden", shadowColor: "#1b5e20", shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.35, shadowRadius: 20, elevation: 14, marginBottom: 4 },
  headerBlob1: { position: "absolute", width: 200, height: 200, borderRadius: 100, backgroundColor: "rgba(255,255,255,0.05)", top: -80, right: -60 },
  headerBlob2: { position: "absolute", width: 140, height: 140, borderRadius: 70,  backgroundColor: "rgba(255,255,255,0.04)", bottom: 0,  left: -40 },
  headerTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  headerGreeting: { fontSize: 14, color: "#a5d6a7", fontWeight: "500" },
  headerName:     { fontSize: 28, fontWeight: "900", color: "#fff", letterSpacing: -0.5 },
  locationChipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  locationChip:    { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, marginTop: 6, alignSelf: "flex-start" },
  locationChipText:{ color: "#e8f5e9", fontSize: 11, fontWeight: "600", maxWidth: 140 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  notifBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  notifDot: { position: "absolute", top: 9, right: 9, width: 8, height: 8, borderRadius: 4, backgroundColor: "#ef5350", borderWidth: 1.5, borderColor: "#1b5e20" },
  logoutBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(239,83,80,0.15)", borderWidth: 1.5, borderColor: "rgba(239,83,80,0.35)", alignItems: "center", justifyContent: "center" },
  headerLogoWrap: { width: 52, height: 52, alignItems: "center", justifyContent: "center" },
  headerLogo:     { width: 52, height: 52, borderRadius: 26, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "rgba(255,255,255,0.3)" },
  statsStrip:   { flexDirection: "row", backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 20, marginHorizontal: -4, marginBottom: 20, paddingVertical: 14 },
  statItem:     { flex: 1, alignItems: "center" },
  statVal:      { fontSize: 22, fontWeight: "900", color: "#fff" },
  statLbl:      { fontSize: 10, color: "#a5d6a7", fontWeight: "600", marginTop: 2 },
  statDivider:  { width: 1, backgroundColor: "rgba(255,255,255,0.15)", marginVertical: 4 },
  section:       { paddingHorizontal: 20, marginTop: 24 },
  sectionHeader: { flexDirection: "row", alignItems: "center", marginBottom: 16, gap: 10 },
  sectionAccent: { width: 4, height: 22, borderRadius: 2, backgroundColor: "#2e7d32" },
  sectionTitle:  { fontSize: 20, fontWeight: "900", color: "#1b5e20", flex: 1, letterSpacing: -0.3 },
  sectionCount:  { fontSize: 12, color: "#81c784", fontWeight: "600" },
  actionLarge: { marginBottom: 12 },
  actionSmall: { flex: 1 },
  actionRow:   { flexDirection: "row", gap: 10 },
  actionLargeInner: { flexDirection: "row", alignItems: "center", gap: 14, padding: 20, borderRadius: 22, shadowColor: "#2e7d32", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 14, elevation: 6 },
  actionSmallInner: { alignItems: "center", paddingVertical: 18, borderRadius: 20, shadowColor: "#333", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 4 },
  actionIconCircle: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 5 },
  actionLabel:  { fontSize: 15, fontWeight: "800" },
  actionSub:    { fontSize: 12, color: "#81c784", marginTop: 2 },
  actionArrow:  { marginLeft: "auto", width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  filtersScroll: { marginBottom: 16 },
  filterPill:           { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, backgroundColor: "#fff", marginRight: 8, flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1.5, borderColor: "#c8e6c9" },
  filterPillActive:     { backgroundColor: "#1b5e20", borderColor: "#1b5e20" },
  filterPillText:       { fontSize: 13, color: "#2e7d32", fontWeight: "700" },
  filterPillTextActive: { color: "#fff" },
  filterCount:          { backgroundColor: "#e8f5e9", borderRadius: 99, paddingHorizontal: 6, paddingVertical: 1 },
  filterCountActive:    { backgroundColor: "rgba(255,255,255,0.2)" },
  filterCountText:      { fontSize: 10, color: "#2e7d32", fontWeight: "800" },
  filterCountTextActive:{ color: "#fff" },
  emptyState: { alignItems: "center", paddingVertical: 40 },
  emptyText:  { color: "#a5d6a7", fontSize: 14, fontWeight: "600", marginTop: 10 },
});
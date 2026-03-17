import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity,
  ActivityIndicator, Animated, Dimensions, StatusBar, RefreshControl,
  Modal, TouchableWithoutFeedback,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import api from "../api";

const { width, height } = Dimensions.get("window");

// ─── Light Theme Palette ──────────────────────────────────────────────────────
const C = {
  bg:          "#f0faf4",
  surface:     "#ffffff",
  card:        "#ffffff",
  headerFrom:  "#1b5e20",
  headerTo:    "#2e7d32",
  accent:      "#2e7d32",
  accentLight: "#e8f5e9",
  text:        "#1b5e20",
  textMid:     "#388e3c",
  textMuted:   "#2e7d32",
  textSub:     "#388e3c",
  border:      "#c8e6c9",
  shadow:      "#2e7d32",
};

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { color: string; bg: string; border: string; icon: string; label: string; gradStart: string; gradEnd: string }> = {
  SUBMITTED:          { color: "#2e7d32", bg: "#e8f5e9", border: "#a5d6a7", icon: "cloud-upload",      label: "Submitted",    gradStart: "#e8f5e9", gradEnd: "#f0faf4" },
  PROCESSING:         { color: "#6a1b9a", bg: "#f3e5f5", border: "#ce93d8", icon: "sync",              label: "Processing",   gradStart: "#f3e5f5", gradEnd: "#fdf5ff" },
  NEEDS_CONFIRMATION: { color: "#e65100", bg: "#fff3e0", border: "#ffcc80", icon: "help-circle",       label: "Needs Confirm",gradStart: "#fff3e0", gradEnd: "#fffbf5" },
  ASSIGNED:           { color: "#01579b", bg: "#e1f5fe", border: "#81d4fa", icon: "person",            label: "Assigned",     gradStart: "#e1f5fe", gradEnd: "#f0f9ff" },
  IN_PROGRESS:        { color: "#bf360c", bg: "#fbe9e7", border: "#ffab91", icon: "construct",         label: "In Progress",  gradStart: "#fbe9e7", gradEnd: "#fff8f6" },
  RESOLVED:           { color: "#00695c", bg: "#e0f2f1", border: "#80cbc4", icon: "checkmark-circle",  label: "Resolved",     gradStart: "#e0f2f1", gradEnd: "#f5fffd" },
  CLOSED:             { color: "#455a64", bg: "#eceff1", border: "#b0bec5", icon: "lock-closed",       label: "Closed",       gradStart: "#eceff1", gradEnd: "#f8fafb" },
};
const getStatus = (s?: string | null) => {
  if (!s) return STATUS_CONFIG.SUBMITTED;
  const key = s.toUpperCase().replace(/\s+/g, "_");
  return STATUS_CONFIG[key] || { color: "#546e7a", bg: "#eceff1", border: "#b0bec5", icon: "help-circle", label: s, gradStart: "#eceff1", gradEnd: "#f8fafb" };
};

const SEVERITY_CONFIG: Record<string, { color: string; bg: string; icon: string; label: string }> = {
  LOW:      { color: "#2e7d32", bg: "#e8f5e9", icon: "shield-checkmark", label: "Low" },
  MEDIUM:   { color: "#e65100", bg: "#fff3e0", icon: "alert",            label: "Medium" },
  HIGH:     { color: "#c62828", bg: "#ffebee", icon: "flame",            label: "High" },
  CRITICAL: { color: "#880e4f", bg: "#fce4ec", icon: "nuclear",          label: "Critical" },
};
const getSeverity = (s?: string | null) => {
  if (!s) return null;
  return SEVERITY_CONFIG[s.toUpperCase()] || null;
};

const ISSUE_PIPELINE_STEPS = ["PROCESSING","ASSIGNED","IN_PROGRESS","RESOLVED","CLOSED"] as const;

// ─── Animated pulse dot ───────────────────────────────────────────────────────
function PulseDot({ color, size = 7 }: { color: string; size?: number }) {
  const anim = useRef(new Animated.Value(1)).current;
  const opac = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    Animated.loop(Animated.parallel([
      Animated.sequence([
        Animated.timing(anim, { toValue: 2.2, duration: 900, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 1,   duration: 900, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.timing(opac, { toValue: 0,   duration: 900, useNativeDriver: true }),
        Animated.timing(opac, { toValue: 0.5, duration: 900, useNativeDriver: true }),
      ]),
    ])).start();
  }, []);
  return (
    <View style={{ width: size * 3, height: size * 3, alignItems: "center", justifyContent: "center" }}>
      <Animated.View style={{ position: "absolute", width: size * 3, height: size * 3, borderRadius: size * 1.5, backgroundColor: color, opacity: opac, transform: [{ scale: anim }] }} />
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />
    </View>
  );
}

// ─── Worker Info Modal ─────────────────────────────────────────────────────────
function WorkerModal({ visible, workers, onClose }: { visible: boolean; workers: any[]; onClose: () => void }) {
  const fade  = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.88)).current;
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fade,  { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, tension: 72, friction: 11, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={wmS.backdrop}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={StyleSheet.absoluteFillObject} />
        </TouchableWithoutFeedback>
        <Animated.View style={[wmS.card, { opacity: fade, transform: [{ scale }] }]}>
          <LinearGradient colors={["#e8f5e9","#ffffff"]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 0.3 }} style={StyleSheet.absoluteFillObject} />
          {/* Header */}
          <View style={wmS.header}>
            <View style={wmS.headerIcon}>
              <Ionicons name="people" size={18} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={wmS.headerTitle}>Assigned Workers</Text>
              <Text style={wmS.headerSub}>{workers.length} worker{workers.length !== 1 ? "s" : ""} on this issue</Text>
            </View>
            <TouchableOpacity style={wmS.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={18} color="#1b5e20" />
            </TouchableOpacity>
          </View>

          {/* Worker list */}
          <ScrollView style={wmS.list} showsVerticalScrollIndicator={false}>
            {workers.map((w: any, i: number) => {
              const name  = w.user?.name  || w.name  || "Worker";
              const email = w.user?.email || w.email || null;
              const phone = w.user?.phone || w.phone || null;
              return (
                <View key={w.id ?? i} style={wmS.workerCard}>
                  <View style={wmS.avatar}>
                    <Text style={wmS.avatarTxt}>{name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={wmS.workerName}>{name}</Text>
                    {email ? (
                      <View style={wmS.infoRow}>
                        <Ionicons name="mail-outline" size={11} color="#66bb6a" />
                        <Text style={wmS.infoTxt}>{email}</Text>
                      </View>
                    ) : null}
                    {phone ? (
                      <View style={wmS.infoRow}>
                        <Ionicons name="call-outline" size={11} color="#66bb6a" />
                        <Text style={wmS.infoTxt}>{phone}</Text>
                      </View>
                    ) : null}
                  </View>
                  <View style={[wmS.statusDot, { backgroundColor: w.available === false ? "#ef5350" : "#66bb6a" }]} />
                </View>
              );
            })}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}
const wmS = StyleSheet.create({
  backdrop:    { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center", padding: 24 },
  card:        { width: "100%", maxHeight: height * 0.6, borderRadius: 24, overflow: "hidden", backgroundColor: "#fff", shadowColor: "#1b5e20", shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.25, shadowRadius: 24, elevation: 16 },
  header:      { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: "#e8f5e9" },
  headerIcon:  { width: 38, height: 38, borderRadius: 12, backgroundColor: "#2e7d32", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 16, fontWeight: "900", color: "#1b5e20", letterSpacing: -0.3 },
  headerSub:   { fontSize: 11, color: "#81c784", fontWeight: "600", marginTop: 1 },
  closeBtn:    { width: 34, height: 34, borderRadius: 17, backgroundColor: "#e8f5e9", alignItems: "center", justifyContent: "center" },
  list:        { paddingHorizontal: 14, paddingVertical: 10 },
  workerCard:  { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#f0faf4", borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: "#c8e6c9" },
  avatar:      { width: 42, height: 42, borderRadius: 21, backgroundColor: "#2e7d32", alignItems: "center", justifyContent: "center" },
  avatarTxt:   { fontSize: 17, fontWeight: "900", color: "#fff" },
  workerName:  { fontSize: 14, fontWeight: "800", color: "#1b5e20", letterSpacing: -0.2 },
  infoRow:     { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 3 },
  infoTxt:     { fontSize: 11, color: "#388e3c", fontWeight: "500" },
  statusDot:   { width: 10, height: 10, borderRadius: 5 },
});

// ─── Status Timeline ──────────────────────────────────────────────────────────
function StatusTimeline({ status, isRaw, onInProgressPress }: { status?: string | null; isRaw?: boolean; onInProgressPress?: () => void }) {
  const fade  = useRef(new Animated.Value(0)).current;
  const slideX = useRef(new Animated.Value(-10)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade,   { toValue: 1, duration: 500, delay: 150, useNativeDriver: true }),
      Animated.spring(slideX, { toValue: 0, tension: 80, friction: 12, delay: 150, useNativeDriver: true }),
    ]).start();
  }, []);

  if (isRaw) {
    return (
      <Animated.View style={[tlS.rawWrap, { opacity: fade, transform: [{ translateX: slideX }] }]}>
        <PulseDot color="#2e7d32" size={5} />
        <Text style={tlS.rawTxt}>Submitted · Awaiting pipeline</Text>
      </Animated.View>
    );
  }

  const key = status ? status.toUpperCase().replace(/\s+/g, "_") : "PROCESSING";

  if (key === "NEEDS_CONFIRMATION") {
    const cfg = STATUS_CONFIG.NEEDS_CONFIRMATION;
    return (
      <Animated.View style={[tlS.mismatchWrap, { opacity: fade, borderColor: cfg.border }]}>
        <LinearGradient colors={[cfg.bg, "#fffbf5"]} style={StyleSheet.absoluteFillObject} />
        <View style={[tlS.mismatchIcon, { backgroundColor: cfg.color + "18", borderColor: cfg.border }]}>
          <Ionicons name="warning" size={15} color={cfg.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[tlS.mismatchTitle, { color: cfg.color }]}>Needs Confirmation</Text>
          <Text style={tlS.mismatchSub}>AI flagged image–description mismatch</Text>
        </View>
      </Animated.View>
    );
  }

  const currentIdx = ISSUE_PIPELINE_STEPS.indexOf(key as any);

  return (
    <Animated.View style={[tlS.wrap, { opacity: fade }]}>
      {ISSUE_PIPELINE_STEPS.map((step, i) => {
        const done   = i < currentIdx;
        const active = i === currentIdx;
        const cfg    = STATUS_CONFIG[step];
        const label  = step === "IN_PROGRESS" ? "Progress" : step.charAt(0) + step.slice(1).toLowerCase();
        return (
          <React.Fragment key={step}>
            <TouchableOpacity
              activeOpacity={step === "IN_PROGRESS" && (active || done) ? 0.6 : 1}
              onPress={() => { if (step === "IN_PROGRESS" && (active || done) && onInProgressPress) onInProgressPress(); }}
              style={tlS.stepCol}
            >
              {active ? (
                <View style={{ width: 24, height: 24, alignItems: "center", justifyContent: "center" }}>
                  <View style={[tlS.activeRing, { borderColor: cfg.color + "40", backgroundColor: cfg.bg }]} />
                  <View style={[tlS.activeDot, { borderColor: cfg.color, backgroundColor: "#fff" }]}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: cfg.color }} />
                  </View>
                </View>
              ) : done ? (
                <View style={[tlS.doneDot, { backgroundColor: cfg.color, borderColor: cfg.color }]}>
                  <Ionicons name="checkmark" size={9} color="#fff" />
                </View>
              ) : (
                <View style={tlS.futureDot} />
              )}
              <Text style={[
                tlS.stepLbl,
                active && { color: cfg.color, fontWeight: "800" },
                done   && { color: cfg.color + "cc" },
              ]}>
                {label}
              </Text>
              {step === "IN_PROGRESS" && (active || done) && (
                <Ionicons name="people-outline" size={10} color={cfg.color} style={{ marginTop: 1 }} />
              )}
            </TouchableOpacity>
            {i < ISSUE_PIPELINE_STEPS.length - 1 && (
              <View style={[tlS.line, done && { backgroundColor: STATUS_CONFIG[ISSUE_PIPELINE_STEPS[i]].color + "60" }, active && { backgroundColor: cfg.color + "30" }]} />
            )}
          </React.Fragment>
        );
      })}
    </Animated.View>
  );
}

const tlS = StyleSheet.create({
  wrap:          { flexDirection: "row", alignItems: "center", marginTop: 14, paddingHorizontal: 2 },
  stepCol:       { alignItems: "center", gap: 5, width: 54 },
  activeRing:    { position: "absolute", width: 28, height: 28, borderRadius: 14, borderWidth: 2 },
  activeDot:     { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  doneDot:       { width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  futureDot:     { width: 20, height: 20, borderRadius: 10, backgroundColor: "#f5f5f5", borderWidth: 1.5, borderColor: "#e0e0e0" },
  stepLbl:       { fontSize: 8, color: "#bdbdbd", fontWeight: "600", textAlign: "center", letterSpacing: 0.2 },
  line:          { flex: 1, height: 2, backgroundColor: "#e8f5e9", marginBottom: 16, minWidth: 6, borderRadius: 1 },
  rawWrap:       { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 12, backgroundColor: "#e8f5e9", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, alignSelf: "flex-start", borderWidth: 1, borderColor: "#a5d6a7" },
  rawTxt:        { fontSize: 10, color: "#2e7d32", fontWeight: "700", letterSpacing: 0.3 },
  mismatchWrap:  { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1.5, overflow: "hidden" },
  mismatchIcon:  { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  mismatchTitle: { fontSize: 12, fontWeight: "800" },
  mismatchSub:   { fontSize: 10, color: "#9e9e9e", marginTop: 1 },
});

// ─── Fullscreen Image Viewer ──────────────────────────────────────────────────
function ImageViewer({ uri, visible, onClose }: { uri: string; visible: boolean; onClose: () => void }) {
  const fade  = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.86)).current;
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fade,  { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, tension: 72, friction: 11, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fade,  { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.9, duration: 180, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[ivS.backdrop, { opacity: fade }]}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={StyleSheet.absoluteFillObject} />
        </TouchableWithoutFeedback>
        <Animated.View style={{ transform: [{ scale }] }}>
          <Image source={{ uri }} style={ivS.img} resizeMode="contain" />
        </Animated.View>
        <TouchableOpacity style={ivS.closeBtn} onPress={onClose}>
          <LinearGradient colors={["#2e7d32","#1b5e20"]} style={StyleSheet.absoluteFillObject} />
          <Ionicons name="close" size={18} color="#fff" />
        </TouchableOpacity>
        <View style={ivS.hint}>
          <Ionicons name="hand-left-outline" size={11} color="rgba(255,255,255,0.45)" />
          <Text style={ivS.hintTxt}>Tap anywhere to close</Text>
        </View>
      </Animated.View>
    </Modal>
  );
}
const ivS = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.92)", alignItems: "center", justifyContent: "center" },
  img:      { width: width - 24, height: height * 0.66, borderRadius: 20 },
  closeBtn: { position: "absolute", top: 54, right: 20, width: 40, height: 40, borderRadius: 20, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  hint:     { position: "absolute", bottom: 36, flexDirection: "row", alignItems: "center", gap: 6 },
  hintTxt:  { fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: "500" },
});

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState() {
  const float = useRef(new Animated.Value(0)).current;
  const fade  = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 700, useNativeDriver: true }).start();
    Animated.loop(Animated.sequence([
      Animated.timing(float, { toValue: -10, duration: 2200, useNativeDriver: true }),
      Animated.timing(float, { toValue: 0,   duration: 2200, useNativeDriver: true }),
    ])).start();
  }, []);
  return (
    <Animated.View style={[esS.wrap, { opacity: fade }]}>
      <Animated.View style={{ transform: [{ translateY: float }] }}>
        <View style={esS.iconRing}>
          <LinearGradient colors={["#2e7d32","#1b5e20"]} style={esS.iconCircle}>
            <Ionicons name="megaphone" size={34} color="#fff" />
          </LinearGradient>
        </View>
      </Animated.View>
      <Text style={esS.title}>No Reports Yet</Text>
      <Text style={esS.sub}>Issues you report will appear here{"\n"}with real-time status tracking.</Text>
      <View style={esS.hint}>
        <Ionicons name="arrow-forward-circle" size={13} color="#2e7d32" />
        <Text style={esS.hintTxt}>Tap "Report Issue" on dashboard to begin</Text>
      </View>
    </Animated.View>
  );
}
const esS = StyleSheet.create({
  wrap:       { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  iconRing:   { width: 100, height: 100, borderRadius: 50, borderWidth: 2, borderColor: "#c8e6c9", alignItems: "center", justifyContent: "center", marginBottom: 28, backgroundColor: "#f1f8e9" },
  iconCircle: { width: 78, height: 78, borderRadius: 39, alignItems: "center", justifyContent: "center" },
  title:      { fontSize: 24, fontWeight: "900", color: "#1b5e20", marginBottom: 10, letterSpacing: -0.4 },
  sub:        { fontSize: 14, color: "#81c784", textAlign: "center", lineHeight: 22, marginBottom: 20 },
  hint:       { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#fff", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderColor: "#c8e6c9", shadowColor: "#2e7d32", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  hintTxt:    { fontSize: 12, color: "#2e7d32", fontWeight: "600" },
});

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ num, label, color, bg, delay }: { num: number; label: string; color: string; bg: string; delay: number }) {
  const fade  = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(14)).current;
  const [count, setCount] = useState(0);
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade,  { toValue: 1, duration: 500, delay, useNativeDriver: true }),
      Animated.spring(slide, { toValue: 0, tension: 70, friction: 10, delay, useNativeDriver: true }),
    ]).start();
    const startTs = Date.now() + delay;
    const tick = () => {
      const e = Date.now() - startTs;
      if (e < 0) { requestAnimationFrame(tick); return; }
      const p = Math.min(e / 700, 1);
      setCount(Math.floor((1 - Math.pow(1 - p, 3)) * num));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [num]);
  return (
    <Animated.View style={[scS.card, { opacity: fade, transform: [{ translateY: slide }], backgroundColor: bg, borderColor: color + "40" }]}>
      <Text style={[scS.num, { color }]}>{count}</Text>
      <Text style={[scS.lbl, { color: color + "aa" }]}>{label}</Text>
    </Animated.View>
  );
}
const scS = StyleSheet.create({
  card: { flex: 1, alignItems: "center", paddingVertical: 13, borderRadius: 18, borderWidth: 1.5, shadowColor: "#2e7d32", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  num:  { fontSize: 23, fontWeight: "900", letterSpacing: -0.5 },
  lbl:  { fontSize: 9, fontWeight: "700", marginTop: 2, letterSpacing: 0.6, textTransform: "uppercase" },
});

// ─── Issue Card ───────────────────────────────────────────────────────────────
function IssueCard({ item, index }: { item: any; index: number }) {
  const fade       = useRef(new Animated.Value(0)).current;
  const slide      = useRef(new Animated.Value(48)).current;
  const cardScale  = useRef(new Animated.Value(1)).current;
  const chevronRot = useRef(new Animated.Value(0)).current;
  const shimmer    = useRef(new Animated.Value(0)).current;
  const [expanded,      setExpanded]      = useState(false);
  const [imgVisible,    setImgVisible]    = useState(false);
  const [afterVisible,  setAfterVisible]  = useState(false);
  const [workersModal,  setWorkersModal]  = useState(false);

  const s   = getStatus(item.status);
  const sev = getSeverity(item.severity);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade,  { toValue: 1, duration: 550, delay: index * 110, useNativeDriver: true }),
      Animated.spring(slide, { toValue: 0, tension: 55, friction: 11, delay: index * 110, useNativeDriver: true }),
    ]).start();
    // shimmer loop for active status
    Animated.loop(Animated.sequence([
      Animated.timing(shimmer, { toValue: 1, duration: 2500, useNativeDriver: true }),
      Animated.timing(shimmer, { toValue: 0, duration: 2500, useNativeDriver: true }),
    ])).start();
  }, []);

  const toggle = () => {
    const next = !expanded;
    setExpanded(next);
    Animated.spring(chevronRot, { toValue: next ? 1 : 0, tension: 80, friction: 10, useNativeDriver: true }).start();
  };

  const pressIn  = () => Animated.spring(cardScale, { toValue: 0.968, tension: 200, useNativeDriver: true }).start();
  const pressOut = () => Animated.spring(cardScale, { toValue: 1, tension: 200, useNativeDriver: true }).start();

  const fmt = (d?: string | null) => {
    if (!d) return null;
    try { return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); }
    catch { return d; }
  };

  const { image_url, description, dept, ward, municipal_corp, created_at, resolved_at, after_image_url: afterImg } = item;
  const chevron = chevronRot.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] });
  const shimmerOpacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.03, 0.09] });

  return (
    <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }, { scale: cardScale }], marginBottom: 14 }}>
      <TouchableOpacity activeOpacity={1} onPress={toggle} onPressIn={pressIn} onPressOut={pressOut}>
        <View style={[cS.card, { borderColor: s.border, shadowColor: s.color }]}>
          {/* Subtle tinted bg gradient */}
          <LinearGradient
            colors={[s.gradStart + "55", s.gradEnd, "#ffffff"]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
          {/* Shimmer overlay */}
          <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: s.color, opacity: shimmerOpacity, borderRadius: 22 }]} />
          {/* Left accent strip */}
          <LinearGradient colors={[s.color, s.color + "88"]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={cS.strip} />

          {/* ── TOP ROW ── */}
          <View style={cS.topRow}>
            {/* Tappable image */}
            <TouchableOpacity onPress={() => image_url && setImgVisible(true)} activeOpacity={0.85}>
              {image_url ? (
                <View style={cS.imgWrap}>
                  <Image source={{ uri: image_url }} style={cS.img} />
                  <LinearGradient colors={["transparent","rgba(0,0,0,0.45)"]} style={cS.imgGrad} />
                  <View style={cS.imgExpandBadge}>
                    <Ionicons name="expand" size={9} color="#fff" />
                  </View>
                  <View style={[cS.imgStatusDot, { backgroundColor: s.color, shadowColor: s.color }]} />
                </View>
              ) : (
                <View style={[cS.img, cS.imgEmpty]}>
                  <Ionicons name="image-outline" size={24} color="#c8e6c9" />
                </View>
              )}
            </TouchableOpacity>
            {image_url && <ImageViewer uri={image_url} visible={imgVisible} onClose={() => setImgVisible(false)} />}

            {/* Meta info */}
            <View style={cS.meta}>
              {/* Status chip with live dot */}
              <View style={[cS.statusChip, { backgroundColor: s.bg, borderColor: s.border }]}>
                <Ionicons name={s.icon as any} size={11} color={s.color} />
                <Text style={[cS.statusTxt, { color: s.color }]}>{s.label}</Text>
                <PulseDot color={s.color} size={3.5} />
              </View>

              {/* Severity */}
              {sev && (
                <View style={[cS.sevChip, { backgroundColor: sev.bg }]}>
                  <Ionicons name={sev.icon as any} size={10} color={sev.color} />
                  <Text style={[cS.sevTxt, { color: sev.color }]}>{sev.label}</Text>
                </View>
              )}

              {dept?.name && (
                <View style={cS.metaRow}>
                  <Ionicons name="business-outline" size={10} color="#2e7d32" />
                  <Text style={cS.metaTxt} numberOfLines={1}>{dept.name}</Text>
                </View>
              )}
              {ward?.name && (
                <View style={cS.metaRow}>
                  <Ionicons name="location-outline" size={10} color="#2e7d32" />
                  <Text style={cS.metaTxt} numberOfLines={1}>{ward.name}</Text>
                </View>
              )}
              {municipal_corp?.name && (
                <View style={cS.metaRow}>
                  <Ionicons name="globe-outline" size={10} color="#2e7d32" />
                  <Text style={cS.metaTxt} numberOfLines={1}>{municipal_corp.name}</Text>
                </View>
              )}
              {item._isRaw && (
                <View style={cS.rawChip}>
                  <Ionicons name="hourglass-outline" size={9} color="#e65100" />
                  <Text style={cS.rawTxt}>Awaiting processing</Text>
                </View>
              )}
            </View>

            {/* Chevron */}
            <Animated.View style={{ transform: [{ rotate: chevron }] }}>
              <View style={[cS.chevronCircle, { backgroundColor: s.bg, borderColor: s.border }]}>
                <Ionicons name="chevron-down" size={14} color={s.color} />
              </View>
            </Animated.View>
          </View>

          {/* Description */}
          {description ? (
            <Text style={cS.desc} numberOfLines={expanded ? undefined : 2}>{description}</Text>
          ) : null}

          {/* Timeline */}
          <StatusTimeline
            status={item.status}
            isRaw={item._isRaw}
            onInProgressPress={() => { if (item.workers?.length) setWorkersModal(true); }}
          />
          {/* Worker Info Modal */}
          <WorkerModal visible={workersModal} workers={item.workers || []} onClose={() => setWorkersModal(false)} />

          {/* ── Expanded ── */}
          {expanded && (
            <View style={cS.expandWrap}>
              <LinearGradient colors={["#e8f5e920","#e8f5e940"]} style={cS.dividerLine} />

              {created_at && (
                <View style={cS.infoRow}>
                  <View style={[cS.infoIcon, { backgroundColor: "#e8f5e9" }]}>
                    <Ionicons name="time" size={11} color="#2e7d32" />
                  </View>
                  <Text style={cS.infoLbl}>Submitted</Text>
                  <Text style={cS.infoVal}>{fmt(created_at)}</Text>
                </View>
              )}
              {resolved_at && (
                <View style={cS.infoRow}>
                  <View style={[cS.infoIcon, { backgroundColor: "#e0f2f1" }]}>
                    <Ionicons name="checkmark-done" size={11} color="#00695c" />
                  </View>
                  <Text style={[cS.infoLbl, { color: "#00695c" }]}>Resolved</Text>
                  <Text style={[cS.infoVal, { color: "#00695c" }]}>{fmt(resolved_at)}</Text>
                </View>
              )}
              {item.match_score != null && (
                <View style={cS.infoRow}>
                  <View style={[cS.infoIcon, { backgroundColor: "#ede7f6" }]}>
                    <Ionicons name="analytics" size={11} color="#6a1b9a" />
                  </View>
                  <Text style={cS.infoLbl}>AI Match</Text>
                  <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View style={cS.matchBg}>
                      <LinearGradient
                        colors={item.match_score > 0.7 ? ["#43a047","#2e7d32"] : item.match_score > 0.4 ? ["#fb8c00","#e65100"] : ["#e53935","#c62828"]}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                        style={[cS.matchFill, { width: `${Math.round(item.match_score * 100)}%` as any }]}
                      />
                    </View>
                    <Text style={cS.infoVal}>{Math.round(item.match_score * 100)}%</Text>
                  </View>
                </View>
              )}
              {item.is_duplicate && (
                <View style={[cS.flagRow, { backgroundColor: "#fff3e0", borderColor: "#ffcc80" }]}>
                  <View style={[cS.flagIcon, { backgroundColor: "#ffe0b2" }]}>
                    <Ionicons name="copy" size={11} color="#e65100" />
                  </View>
                  <Text style={[cS.flagTxt, { color: "#bf360c" }]}>Duplicate report detected</Text>
                </View>
              )}
              {item.is_mismatch && (
                <View style={[cS.flagRow, { backgroundColor: "#ffebee", borderColor: "#ef9a9a" }]}>
                  <View style={[cS.flagIcon, { backgroundColor: "#ffcdd2" }]}>
                    <Ionicons name="warning" size={11} color="#c62828" />
                  </View>
                  <Text style={[cS.flagTxt, { color: "#b71c1c" }]}>AI detected image–description mismatch</Text>
                </View>
              )}
              {afterImg && (
                <View style={{ marginTop: 12 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#00695c" }} />
                    <Text style={{ fontSize: 11, color: "#00695c", fontWeight: "700", letterSpacing: 0.4 }}>After Resolution</Text>
                  </View>
                  <TouchableOpacity onPress={() => setAfterVisible(true)} activeOpacity={0.88} style={{ borderRadius: 16, overflow: "hidden" }}>
                    <Image source={{ uri: afterImg }} style={cS.afterImg} />
                    <LinearGradient colors={["transparent","rgba(0,0,0,0.42)"]} style={cS.afterGrad} />
                    <View style={cS.afterExpand}>
                      <Ionicons name="expand" size={13} color="#fff" />
                    </View>
                  </TouchableOpacity>
                  <ImageViewer uri={afterImg} visible={afterVisible} onClose={() => setAfterVisible(false)} />
                </View>
              )}
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const cS = StyleSheet.create({
  card:        { borderRadius: 22, overflow: "hidden", borderWidth: 1.5, backgroundColor: "#fff", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 6 },
  strip:       { position: "absolute", left: 0, top: 0, bottom: 0, width: 4 },
  topRow:      { flexDirection: "row", gap: 12, padding: 16, paddingBottom: 8 },
  imgWrap:     { width: 84, height: 84, borderRadius: 16, overflow: "hidden" },
  img:         { width: 84, height: 84, borderRadius: 16 },
  imgEmpty:    { backgroundColor: "#f1f8e9", alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "#c8e6c9" },
  imgGrad:     { position: "absolute", bottom: 0, left: 0, right: 0, height: 32 },
  imgExpandBadge: { position: "absolute", bottom: 5, right: 5, backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 6, padding: 3 },
  imgStatusDot:   { position: "absolute", top: 5, right: 5, width: 9, height: 9, borderRadius: 5, borderWidth: 1.5, borderColor: "#fff", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 4, elevation: 4 },
  meta:        { flex: 1, gap: 4 },
  statusChip:  { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start", paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20, borderWidth: 1.5 },
  statusTxt:   { fontSize: 11, fontWeight: "800", letterSpacing: 0.2 },
  sevChip:     { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  sevTxt:      { fontSize: 10, fontWeight: "700" },
  metaRow:     { flexDirection: "row", alignItems: "center", gap: 4 },
  metaTxt:     { fontSize: 10, color: "#2e7d32", fontWeight: "600", flex: 1 },
  rawChip:     { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#fff3e0", borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, alignSelf: "flex-start", borderWidth: 1, borderColor: "#ffcc80" },
  rawTxt:      { fontSize: 9, color: "#e65100", fontWeight: "700" },
  chevronCircle:{ width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", borderWidth: 1 },
desc: {
  fontSize: 14,
  color: "#1b2e1f",
  lineHeight: 22,
  paddingHorizontal: 16,
  paddingBottom: 6,
  fontWeight: "600",
  letterSpacing: 0.3
},
  expandWrap:  { paddingHorizontal: 16, paddingBottom: 14 },
  dividerLine: { height: 1.5, borderRadius: 1, marginVertical: 12, backgroundColor: "#e8f5e9" },
  infoRow:     { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 9 },
  infoIcon:    { width: 26, height: 26, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  infoLbl:     { fontSize: 11, color: "#2e7d32", fontWeight: "600", width: 76 },
  infoVal:     { fontSize: 11, color: "#1b5e20", fontWeight: "700", flex: 1 },
  matchBg:     { flex: 1, height: 5, backgroundColor: "#e8f5e9", borderRadius: 3, overflow: "hidden" },
  matchFill:   { height: "100%", borderRadius: 3 },
  flagRow:     { flexDirection: "row", alignItems: "center", gap: 9, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, marginBottom: 6, borderWidth: 1 },
  flagIcon:    { width: 22, height: 22, borderRadius: 7, alignItems: "center", justifyContent: "center" },
  flagTxt:     { fontSize: 11, fontWeight: "700", flex: 1 },
  afterImg:    { width: "100%", height: 160, borderRadius: 16 },
  afterGrad:   { position: "absolute", bottom: 0, left: 0, right: 0, height: 60, borderBottomLeftRadius: 16, borderBottomRightRadius: 16 },
  afterExpand: { position: "absolute", bottom: 9, right: 9, backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 7, padding: 5 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
const AUTO_REFRESH_MS = 30_000;

export default function Notifications() {
  const router = useRouter();
  const [items,      setItems]      = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [lastSync,   setLastSync]   = useState<Date | null>(null);

  const headerSlide = useRef(new Animated.Value(-55)).current;
  const headerFade  = useRef(new Animated.Value(0)).current;
  const syncSpin    = useRef(new Animated.Value(0)).current;
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(headerSlide, { toValue: 0, tension: 52, friction: 12, useNativeDriver: true }),
      Animated.timing(headerFade,  { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();
    fetchAll();
    timerRef.current = setInterval(() => fetchAll(false, true), AUTO_REFRESH_MS);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const spinRefresh = () => {
    syncSpin.setValue(0);
    Animated.timing(syncSpin, { toValue: 1, duration: 650, useNativeDriver: true }).start();
  };

  const fetchAll = async (isManualRefresh = false, isSilent = false) => {
    if (isManualRefresh) { setRefreshing(true); spinRefresh(); }
    else if (!isSilent)   setLoading(true);
    setError(null);

    try {
      const [issuesRes, reportsRes] = await Promise.allSettled([
        api.get("/api/issues/my-issues/"),
        api.get("/api/issues/my-reports/"),
      ]);

      const processedIssues: any[] = issuesRes.status === "fulfilled"
        ? (Array.isArray(issuesRes.value.data) ? issuesRes.value.data : []) : [];
      const rawReports: any[] = reportsRes.status === "fulfilled"
        ? (Array.isArray(reportsRes.value.data) ? reportsRes.value.data : []) : [];

      const processedIssueIds = new Set(processedIssues.map((i: any) => i.id));
      const unprocessedRaws = rawReports
        .filter((r: any) => !r.issue_id || !processedIssueIds.has(r.issue_id))
        .map((r: any) => ({
          _isRaw: true, id: `raw_${r.id}`,
          status: r.issue_id ? "PROCESSING" : "SUBMITTED",
          severity: null, dept: null, ward: null, municipal_corp: null,
          after_image_url: null, resolved_at: null,
          image_url: r.image_url, description: r.description, created_at: r.created_at,
          match_score: r.match_score, is_mismatch: r.is_mismatch, is_duplicate: r.is_duplicate,
        }));

      const flatProcessed = processedIssues.map((issue: any) => ({
        _isRaw: false, id: issue.id, status: issue.status, severity: issue.severity,
        dept: issue.dept, ward: issue.ward, municipal_corp: issue.municipal_corp,
        after_image_url: issue.after_image_url, resolved_at: issue.resolved_at,
        workers: issue.workers ?? [],
        image_url: issue.my_report?.image_url ?? null,
        description: issue.my_report?.description ?? null,
        created_at: issue.my_report?.created_at ?? null,
        match_score: issue.my_report?.match_score ?? null,
        is_mismatch: issue.my_report?.is_mismatch ?? false,
        is_duplicate: issue.my_report?.is_duplicate ?? false,
      }));

      const all = [...unprocessedRaws, ...flatProcessed].sort(
        (a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      );
      setItems(all);
      setLastSync(new Date());
    } catch {
      if (!isSilent) setError("Connection lost. Pull down to retry.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => fetchAll(true), []);
  const resolved  = items.filter(i => i.status === "RESOLVED" || i.status === "CLOSED").length;
  const pending   = items.filter(i => i.status !== "RESOLVED" && i.status !== "CLOSED").length;
  const fmtSync   = (d: Date) => d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const spinStyle = { transform: [{ rotate: syncSpin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] }) }] };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#1b5e20" />

      <SafeAreaView style={{ flex: 1 }}>
        {/* ── HEADER ── */}
        <Animated.View style={[s.header, { transform: [{ translateY: headerSlide }], opacity: headerFade }]}>
          <LinearGradient colors={["#1b5e20","#2e7d32","#388e3c"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />
          {/* decorative blobs */}
          <View style={s.blob1} />
          <View style={s.blob2} />

          <View style={s.headerTop}>
            <TouchableOpacity style={s.iconBtn} onPress={() => router.back()}>
              <View style={s.iconBtnInner}>
                <Ionicons name="arrow-back" size={18} color="#fff" />
              </View>
            </TouchableOpacity>

            <View style={s.titleWrap}>
              <Text style={s.title}>My Reports</Text>
              <View style={s.syncRow}>
                <PulseDot color="#a5d6a7" size={3} />
                <Text style={s.syncTxt}>
                  {lastSync ? `Synced ${fmtSync(lastSync)}` : "Live tracking · auto-sync 30s"}
                </Text>
              </View>
            </View>

            <TouchableOpacity style={s.iconBtn} onPress={() => fetchAll(true)}>
              <View style={s.iconBtnInner}>
                <Animated.View style={spinStyle}>
                  <Ionicons name="refresh" size={16} color="#fff" />
                </Animated.View>
              </View>
            </TouchableOpacity>
          </View>

          {/* Stat cards */}
          {items.length > 0 && (
            <View style={s.statsRow}>
              <StatCard num={items.length} label="Total"    color="#1b5e20" bg="#e8f5e9" delay={100} />
              <StatCard num={resolved}     label="Resolved" color="#00695c" bg="#e0f2f1" delay={180} />
              <StatCard num={pending}      label="Pending"  color="#bf360c" bg="#fbe9e7" delay={260} />
            </View>
          )}

          <View style={s.headerGlow} />
        </Animated.View>

        {/* ── CONTENT ── */}
        {loading ? (
          <View style={s.loaderWrap}>
            <View style={s.loaderRing}>
              <LinearGradient colors={["#2e7d32","#1b5e20"]} style={s.loaderCircle}>
                <Ionicons name="leaf" size={26} color="#fff" />
              </LinearGradient>
            </View>
            <ActivityIndicator size="large" color="#2e7d32" style={{ marginTop: 22 }} />
            <Text style={s.loaderTxt}>Loading reports…</Text>
            <Text style={s.loaderSub}>Syncing with backend</Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={[s.scroll, items.length === 0 && { flex: 1 }]}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2e7d32" colors={["#2e7d32"]} />}
          >
            {error ? (
              <View style={s.errorWrap}>
                <View style={s.errorIcon}>
                  <Ionicons name="cloud-offline" size={34} color="#e53935" />
                </View>
                <Text style={s.errorMsg}>{error}</Text>
                <TouchableOpacity style={s.retryBtn} onPress={() => fetchAll()}>
                  <LinearGradient colors={["#2e7d32","#1b5e20"]} style={StyleSheet.absoluteFillObject} />
                  <Ionicons name="refresh" size={13} color="#fff" />
                  <Text style={s.retryTxt}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : items.length === 0 ? (
              <EmptyState />
            ) : (
              <>
                <Text style={s.listHdr}>{items.length} report{items.length !== 1 ? "s" : ""} · live</Text>
                {items.map((item, i) => <IssueCard key={item.id} item={item} index={i} />)}
              </>
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: "#f0faf4" },
  header:  { overflow: "hidden", borderBottomLeftRadius: 28, borderBottomRightRadius: 28, shadowColor: "#1b5e20", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 20, elevation: 14 },
  blob1:   { position: "absolute", width: 220, height: 220, borderRadius: 110, backgroundColor: "rgba(255,255,255,0.06)", top: -90, right: -60 },
  blob2:   { position: "absolute", width: 140, height: 140, borderRadius: 70,  backgroundColor: "rgba(255,255,255,0.04)", bottom: -20, left: -40 },

  headerTop:   { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 18, paddingTop: 14, paddingBottom: 14 },
  iconBtn:     { width: 38, height: 38 },
  iconBtnInner:{ flex: 1, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.25)" },
  titleWrap:   { flex: 1, alignItems: "center" },
  title:       { fontSize: 21, fontWeight: "900", color: "#fff", letterSpacing: -0.4 },
  syncRow:     { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 3 },
  syncTxt:     { fontSize: 9.5, color: "rgba(255,255,255,0.65)", fontWeight: "600" },
  statsRow:    { flexDirection: "row", gap: 8, paddingHorizontal: 18, paddingBottom: 18 },
  headerGlow:  { height: 0 },

  scroll:   { padding: 15, paddingBottom: 48 },
  listHdr:  { fontSize: 10, color: "#a5d6a7", fontWeight: "700", marginBottom: 14, marginLeft: 4, letterSpacing: 1.2, textTransform: "uppercase" },

  loaderWrap:   { flex: 1, alignItems: "center", justifyContent: "center" },
  loaderRing:   { width: 84, height: 84, borderRadius: 42, borderWidth: 2, borderColor: "#c8e6c9", alignItems: "center", justifyContent: "center" },
  loaderCircle: { width: 66, height: 66, borderRadius: 33, alignItems: "center", justifyContent: "center" },
  loaderTxt:    { marginTop: 20, color: "#1b5e20", fontWeight: "800", fontSize: 15 },
  loaderSub:    { marginTop: 4, color: "#81c784", fontSize: 12 },

  errorWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60 },
  errorIcon: { width: 70, height: 70, borderRadius: 35, backgroundColor: "#ffebee", alignItems: "center", justifyContent: "center", marginBottom: 16, borderWidth: 1.5, borderColor: "#ef9a9a" },
  errorMsg:  { color: "#81c784", fontSize: 14, textAlign: "center", marginBottom: 22, lineHeight: 22 },
  retryBtn:  { flexDirection: "row", alignItems: "center", gap: 7, borderRadius: 20, paddingHorizontal: 24, paddingVertical: 12, overflow: "hidden" },
  retryTxt:  { color: "#fff", fontWeight: "900", fontSize: 14 },
});
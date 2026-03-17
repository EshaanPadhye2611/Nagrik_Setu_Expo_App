import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Animated, Dimensions, StatusBar, ActivityIndicator,
  RefreshControl, Alert, Image, Modal, TouchableWithoutFeedback,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import api from "../api";
import useUserStore from "../store/userStore";
import { useLocationContext } from "../context/locationcontext";
import * as ImagePicker from "expo-image-picker";

const { width, height } = Dimensions.get("window");

// ─── Palette ──────────────────────────────────────────────────────────────────
const G = {
  bg:       "#f0faf4",
  surface:  "#ffffff",
  g1:       "#1b5e20",
  g2:       "#2e7d32",
  g3:       "#388e3c",
  g4:       "#43a047",
  accent:   "#00c853",
  accentLt: "#e8f5e9",
  danger:   "#c62828",
  warn:     "#e65100",
  blue:     "#01579b",
  teal:     "#00695c",
  purple:   "#6a1b9a",
  text:     "#1b2e1f",
  textMid:  "#388e3c",
  textMute: "#81c784",
  border:   "#c8e6c9",
};

// ─── Task status config ───────────────────────────────────────────────────────
const TASK_STATUS: Record<string, { color: string; bg: string; border: string; icon: string; label: string }> = {
  ASSIGNED:    { color: G.blue,   bg: "#e1f5fe", border: "#81d4fa", icon: "clipboard-outline",   label: "Assigned"    },
  IN_PROGRESS: { color: G.warn,   bg: "#fff3e0", border: "#ffcc80", icon: "construct-outline",   label: "In Progress" },
  RESOLVED:    { color: G.teal,   bg: "#e0f2f1", border: "#80cbc4", icon: "checkmark-done",      label: "Resolved"   },
  CLOSED:      { color: "#455a64",bg: "#eceff1", border: "#b0bec5", icon: "lock-closed",         label: "Closed"     },
  COMPLETED:   { color: G.teal,   bg: "#e0f2f1", border: "#80cbc4", icon: "checkmark-done",      label: "Completed"   },
  PENDING:     { color: G.purple, bg: "#f3e5f5", border: "#ce93d8", icon: "hourglass-outline",   label: "Pending"     },
  PROCESSING:  { color: G.purple, bg: "#f3e5f5", border: "#ce93d8", icon: "sync-outline",        label: "Processing" },
};
const getTaskStatus = (s?: string) => TASK_STATUS[s?.toUpperCase() ?? ""] || TASK_STATUS.ASSIGNED;

const SEVERITY: Record<string, { color: string; bg: string; icon: string; label: string }> = {
  LOW:      { color: G.g2,      bg: "#e8f5e9", icon: "shield-checkmark", label: "Low"      },
  MEDIUM:   { color: G.warn,    bg: "#fff3e0", icon: "alert",            label: "Medium"   },
  HIGH:     { color: G.danger,  bg: "#ffebee", icon: "flame",            label: "High"     },
  CRITICAL: { color: "#880e4f", bg: "#fce4ec", icon: "nuclear",          label: "Critical" },
};
const getSeverity = (s?: string | null) => {
  if (!s) return null;
  return SEVERITY[s.toUpperCase()] || null;
};

// ─── Pulse Dot ────────────────────────────────────────────────────────────────
function PulseDot({ color, size = 6 }: { color: string; size?: number }) {
  const anim = useRef(new Animated.Value(1)).current;
  const opac = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    Animated.loop(Animated.parallel([
      Animated.sequence([
        Animated.timing(anim, { toValue: 2.4, duration: 950, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 1,   duration: 950, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.timing(opac, { toValue: 0,   duration: 950, useNativeDriver: true }),
        Animated.timing(opac, { toValue: 0.5, duration: 950, useNativeDriver: true }),
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

// ─── Animated Number ──────────────────────────────────────────────────────────
function AnimNum({ value, color, delay = 0 }: { value: number; color: string; delay?: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const start = Date.now() + delay;
    const tick = () => {
      const elapsed = Date.now() - start;
      if (elapsed < 0) { requestAnimationFrame(tick); return; }
      const p = Math.min(elapsed / 900, 1);
      setDisplay(Math.floor((1 - Math.pow(1 - p, 3)) * value));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [value]);
  return <Text style={[stC.statNum, { color }]}>{display}</Text>;
}

// ─── Stat Tile ────────────────────────────────────────────────────────────────
function StatTile({ label, value, color, bg, icon, delay }: any) {
  const fade  = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(20)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade,  { toValue: 1, duration: 500, delay, useNativeDriver: true }),
      Animated.spring(slide, { toValue: 0, tension: 65, friction: 11, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={[stC.tile, { backgroundColor: bg, borderColor: color + "40", opacity: fade, transform: [{ translateY: slide }] }]}>
      <View style={[stC.tileIcon, { backgroundColor: color + "22", borderColor: color + "40" }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <AnimNum value={value} color={color} delay={delay} />
      <Text style={[stC.tileLbl, { color: color + "99" }]}>{label}</Text>
    </Animated.View>
  );
}
const stC = StyleSheet.create({
  tile:    { flex: 1, borderRadius: 18, borderWidth: 1.5, padding: 13, alignItems: "center", gap: 5, shadowColor: "#1b5e20", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 4 },
  tileIcon:{ width: 34, height: 34, borderRadius: 11, alignItems: "center", justifyContent: "center", borderWidth: 1, marginBottom: 2 },
  statNum: { fontSize: 24, fontWeight: "900", letterSpacing: -0.5 },
  tileLbl: { fontSize: 9, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase", textAlign: "center" },
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
      </Animated.View>
    </Modal>
  );
}
const ivS = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.92)", alignItems: "center", justifyContent: "center" },
  img:      { width: width - 24, height: height * 0.66, borderRadius: 20 },
  closeBtn: { position: "absolute", top: 54, right: 20, width: 40, height: 40, borderRadius: 20, overflow: "hidden", alignItems: "center", justifyContent: "center" },
});

// ─── Issue Card ────────────────────────────────────────────────────────────────
function IssueCard({ issue, index, onUploaded, coords }: { issue: any; index: number; onUploaded: () => void; coords: any }) {
  const fade  = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(50)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const [expanded, setExpanded] = useState(false);
  const chevRot = useRef(new Animated.Value(0)).current;
  const [imgVisible, setImgVisible] = useState(false);
  const [afterVisible, setAfterVisible] = useState(false);
  const [uploading, setUploading] = useState(false);

  const st  = getTaskStatus(issue.status);
  const sev = getSeverity(issue.severity);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade,  { toValue: 1, duration: 550, delay: index * 100, useNativeDriver: true }),
      Animated.spring(slide, { toValue: 0, tension: 52, friction: 11, delay: index * 100, useNativeDriver: true }),
    ]).start();
  }, []);

  const toggle = () => {
    const next = !expanded;
    setExpanded(next);
    Animated.spring(chevRot, { toValue: next ? 1 : 0, tension: 80, friction: 10, useNativeDriver: true }).start();
  };

  const pressIn  = () => Animated.spring(scale, { toValue: 0.97, tension: 200, useNativeDriver: true }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1,    tension: 200, useNativeDriver: true }).start();

  const fmt = (d?: string | null) => {
    if (!d) return null;
    try { return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); }
    catch { return d; }
  };

  const chevron = chevRot.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] });

  const handleUploadPhoto = async () => {
    const { status: camStatus } = await ImagePicker.requestCameraPermissionsAsync();
    if (camStatus !== "granted") {
      Alert.alert("Permission Denied", "Camera access is needed to take a photo.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsEditing: true,
    });
    if (result.canceled || !result.assets?.[0]) return;

    setUploading(true);
    try {
      const asset = result.assets[0];
      const formData = new FormData();
      formData.append("after_image", {
        uri: asset.uri,
        name: `after_${issue.id}.jpg`,
        type: "image/jpeg",
      } as any);
      if (coords?.latitude) formData.append("latitude", String(coords.latitude));
      if (coords?.longitude) formData.append("longitude", String(coords.longitude));
      await api.post(`/api/departments/worker/issues/${issue.id}/resolve/`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      Alert.alert("Success", "Image uploaded — AI verification in progress!");
      onUploaded();
    } catch (e: any) {
      const data = e?.response?.data;
      const msg = data?.distance_meters
        ? `${data.error}\n\nYou are ${Math.round(data.distance_meters)}m away (max ${data.allowed_radius_meters}m).`
        : data?.error || "Could not upload image.";
      Alert.alert("Upload Failed", msg);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }, { scale }], marginBottom: 14 }}>
      <TouchableOpacity activeOpacity={1} onPress={toggle} onPressIn={pressIn} onPressOut={pressOut}>
        <View style={[tC.card, { borderColor: st.border, shadowColor: st.color }]}>
          <LinearGradient colors={[st.bg + "55", G.surface]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />
          <LinearGradient colors={[st.color, st.color + "66"]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={tC.strip} />

          {/* Top row */}
          <View style={tC.topRow}>
            {/* Issue image */}
            <TouchableOpacity onPress={() => issue.primary_image && setImgVisible(true)} activeOpacity={0.85}>
              {issue.primary_image ? (
                <View style={tC.imgWrap}>
                  <Image source={{ uri: issue.primary_image }} style={tC.imgThumb} />
                  <LinearGradient colors={["transparent","rgba(0,0,0,0.45)"]} style={tC.imgGrad} />
                  <View style={tC.imgExpandBadge}>
                    <Ionicons name="expand" size={9} color="#fff" />
                  </View>
                  <View style={[tC.imgStatusDot, { backgroundColor: st.color, shadowColor: st.color }]} />
                </View>
              ) : (
                <View style={[tC.imgWrap, tC.imgEmpty]}>
                  <Ionicons name="image-outline" size={24} color={G.border} />
                </View>
              )}
            </TouchableOpacity>
            {issue.primary_image && <ImageViewer uri={issue.primary_image} visible={imgVisible} onClose={() => setImgVisible(false)} />}

            {/* Meta info */}
            <View style={{ flex: 1 }}>
              {/* Status + Severity */}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <View style={[tC.statusChip, { backgroundColor: st.bg, borderColor: st.border }]}>
                  <PulseDot color={st.color} size={3} />
                  <Text style={[tC.statusTxt, { color: st.color }]}>{st.label}</Text>
                </View>
                {sev && (
                  <View style={[tC.sevChip, { backgroundColor: sev.bg }]}>
                    <Ionicons name={sev.icon as any} size={10} color={sev.color} />
                    <Text style={[tC.sevTxt, { color: sev.color }]}>{sev.label}</Text>
                  </View>
                )}
              </View>

              {/* Department */}
              {issue.dept?.name && (
                <View style={tC.metaRow}>
                  <Ionicons name="business-outline" size={10} color={G.g2} />
                  <Text style={tC.metaTxt} numberOfLines={1}>{issue.dept.name}</Text>
                </View>
              )}
              {/* Ward */}
              {issue.ward?.name && (
                <View style={tC.metaRow}>
                  <Ionicons name="location-outline" size={10} color={G.g2} />
                  <Text style={tC.metaTxt} numberOfLines={1}>{issue.ward.name}</Text>
                </View>
              )}
              {/* Corporation */}
              {issue.municipal_corp?.name && (
                <View style={tC.metaRow}>
                  <Ionicons name="globe-outline" size={10} color={G.g2} />
                  <Text style={tC.metaTxt} numberOfLines={1}>{issue.municipal_corp.name}</Text>
                </View>
              )}
              {/* Report count */}
              {issue.report_count > 0 && (
                <View style={tC.metaRow}>
                  <Ionicons name="people-outline" size={10} color={G.purple} />
                  <Text style={[tC.metaTxt, { color: G.purple }]}>{issue.report_count} report{issue.report_count !== 1 ? "s" : ""}</Text>
                </View>
              )}
            </View>

            {/* Chevron */}
            <Animated.View style={{ transform: [{ rotate: chevron }] }}>
              <View style={[tC.chevCircle, { backgroundColor: st.bg, borderColor: st.border }]}>
                <Ionicons name="chevron-down" size={13} color={st.color} />
              </View>
            </Animated.View>
          </View>

          {/* ── Expanded details ── */}
          {expanded && (
            <View style={tC.expandWrap}>
              <View style={tC.divider} />

              {/* Issue ID */}
              <View style={tC.infoRow}>
                <View style={[tC.infoIcon, { backgroundColor: "#e8f5e9" }]}>
                  <Ionicons name="pricetag-outline" size={11} color={G.g2} />
                </View>
                <Text style={tC.infoLbl}>Issue ID</Text>
                <Text style={tC.infoVal}>#{issue.id}</Text>
              </View>

              {/* Description */}
              {issue.description && (
                <View style={tC.infoRow}>
                  <View style={[tC.infoIcon, { backgroundColor: "#f3e5f5" }]}>
                    <Ionicons name="document-text-outline" size={11} color={G.purple} />
                  </View>
                  <Text style={tC.infoLbl}>Description</Text>
                  <Text style={tC.infoVal} numberOfLines={3}>{issue.description}</Text>
                </View>
              )}

              {/* Created at */}
              {issue.created_at && (
                <View style={tC.infoRow}>
                  <View style={[tC.infoIcon, { backgroundColor: "#e8f5e9" }]}>
                    <Ionicons name="time-outline" size={11} color={G.g2} />
                  </View>
                  <Text style={tC.infoLbl}>Reported</Text>
                  <Text style={tC.infoVal}>{fmt(issue.created_at)}</Text>
                </View>
              )}

              {/* Updated at */}
              {issue.updated_at && (
                <View style={tC.infoRow}>
                  <View style={[tC.infoIcon, { backgroundColor: "#e3f2fd" }]}>
                    <Ionicons name="refresh-outline" size={11} color={G.blue} />
                  </View>
                  <Text style={tC.infoLbl}>Updated</Text>
                  <Text style={tC.infoVal}>{fmt(issue.updated_at)}</Text>
                </View>
              )}

              {/* Resolved at */}
              {issue.resolved_at && (
                <View style={tC.infoRow}>
                  <View style={[tC.infoIcon, { backgroundColor: "#e0f2f1" }]}>
                    <Ionicons name="checkmark-done" size={11} color={G.teal} />
                  </View>
                  <Text style={[tC.infoLbl, { color: G.teal }]}>Resolved</Text>
                  <Text style={[tC.infoVal, { color: G.teal }]}>{fmt(issue.resolved_at)}</Text>
                </View>
              )}

              {/* Coordinates */}
              {issue.latitude && issue.longitude && (
                <View style={tC.infoRow}>
                  <View style={[tC.infoIcon, { backgroundColor: "#fff3e0" }]}>
                    <Ionicons name="navigate-outline" size={11} color={G.warn} />
                  </View>
                  <Text style={tC.infoLbl}>Location</Text>
                  <Text style={tC.infoVal}>{Number(issue.latitude).toFixed(5)}, {Number(issue.longitude).toFixed(5)}</Text>
                </View>
              )}

              {/* Upload after-resolution image button */}
              {!issue.after_image_url && issue.status !== "RESOLVED" && issue.status !== "CLOSED" && (
                <TouchableOpacity
                  onPress={handleUploadPhoto}
                  disabled={uploading}
                  activeOpacity={0.85}
                  style={tC.uploadBtn}
                >
                  <LinearGradient colors={[G.g2, G.g1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[StyleSheet.absoluteFillObject, { borderRadius: 14 }]} />
                  {uploading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="camera" size={18} color="#fff" />
                  )}
                  <Text style={tC.uploadBtnTxt}>{uploading ? "Uploading…" : "Upload Resolution Photo"}</Text>
                </TouchableOpacity>
              )}

              {/* After resolution image */}
              {issue.after_image_url && (
                <View style={{ marginTop: 6 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: G.teal }} />
                    <Text style={{ fontSize: 11, color: G.teal, fontWeight: "700", letterSpacing: 0.4 }}>After Resolution</Text>
                  </View>
                  <TouchableOpacity onPress={() => setAfterVisible(true)} activeOpacity={0.88} style={{ borderRadius: 16, overflow: "hidden" }}>
                    <Image source={{ uri: issue.after_image_url }} style={tC.afterImg} />
                    <LinearGradient colors={["transparent","rgba(0,0,0,0.42)"]} style={tC.afterGrad} />
                    <View style={tC.afterExpand}>
                      <Ionicons name="expand" size={13} color="#fff" />
                    </View>
                  </TouchableOpacity>
                  <ImageViewer uri={issue.after_image_url} visible={afterVisible} onClose={() => setAfterVisible(false)} />
                </View>
              )}
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const tC = StyleSheet.create({
  card:       { borderRadius: 22, overflow: "hidden", borderWidth: 1.5, backgroundColor: G.surface, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 6 },
  strip:      { position: "absolute", left: 0, top: 0, bottom: 0, width: 4 },
  topRow:     { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 16, paddingBottom: 8 },
  imgWrap:    { width: 78, height: 78, borderRadius: 16, overflow: "hidden" },
  imgThumb:   { width: 78, height: 78, borderRadius: 16 },
  imgGrad:    { position: "absolute", bottom: 0, left: 0, right: 0, height: 28 },
  imgExpandBadge: { position: "absolute", bottom: 5, right: 5, backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 6, padding: 3 },
  imgStatusDot: { position: "absolute", top: 5, right: 5, width: 9, height: 9, borderRadius: 5, borderWidth: 1.5, borderColor: "#fff", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 4, elevation: 4 },
  imgEmpty:   { backgroundColor: "#f1f8e9", alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: G.border },
  statusChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20, borderWidth: 1.5 },
  statusTxt:  { fontSize: 10, fontWeight: "800" },
  sevChip:    { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  sevTxt:     { fontSize: 9, fontWeight: "700" },
  metaRow:    { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  metaTxt:    { fontSize: 10, color: G.g2, fontWeight: "600", flex: 1 },
  chevCircle: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1, position: "absolute", right: 16, top: 16 },
  expandWrap: { paddingHorizontal: 16, paddingBottom: 14 },
  divider:    { height: 1.5, backgroundColor: G.border, marginVertical: 12, borderRadius: 1 },
  infoRow:    { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 9 },
  infoIcon:   { width: 26, height: 26, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  infoLbl:    { fontSize: 11, color: G.textMute, fontWeight: "600", width: 80 },
  infoVal:    { fontSize: 11, color: G.text, fontWeight: "700", flex: 1 },
  afterImg:   { width: "100%" as any, height: 160, borderRadius: 16 },
  afterGrad:  { position: "absolute", bottom: 0, left: 0, right: 0, height: 60, borderBottomLeftRadius: 16, borderBottomRightRadius: 16 },
  afterExpand:{ position: "absolute", bottom: 9, right: 9, backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 7, padding: 5 },
  uploadBtn:  { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 10, paddingVertical: 13, borderRadius: 14, overflow: "hidden", shadowColor: G.g1, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  uploadBtnTxt: { fontSize: 13, fontWeight: "800", color: "#fff", letterSpacing: 0.3 },
});

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function WorkerDashboard() {
  const router = useRouter();
  const logout = useUserStore((s: any) => s.logout);
  const user   = useUserStore((s: any) => s.user);
  const { wardInfo, corpInfo, coords, resolving: locResolving } = useLocationContext() as any;

  const [issues,     setIssues]     = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter,     setFilter]     = useState<string>("ALL");
  const [lastSync,   setLastSync]   = useState<Date | null>(null);

  const headerSlide  = useRef(new Animated.Value(-60)).current;
  const headerFade   = useRef(new Animated.Value(0)).current;
  const syncSpin     = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(headerSlide, { toValue: 0, tension: 50, friction: 12, useNativeDriver: true }),
      Animated.timing(headerFade,  { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();
    fetchIssues();
    const t = setInterval(() => fetchIssues(false, true), 30_000);
    return () => clearInterval(t);
  }, []);

  const spinRefresh = () => {
    syncSpin.setValue(0);
    Animated.timing(syncSpin, { toValue: 1, duration: 650, useNativeDriver: true }).start();
  };

  const fetchIssues = async (manual = false, silent = false) => {
    if (manual) { setRefreshing(true); spinRefresh(); }
    else if (!silent) setLoading(true);
    try {
      const res = await api.get("/api/departments/worker/my-issues/");
      const data = Array.isArray(res.data) ? res.data : [];
      setIssues(data);
      setLastSync(new Date());
    } catch (e: any) {
      if (!silent) Alert.alert("Error", "Could not load issues. Check connection.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout", style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/login");
        },
      },
    ]);
  };

  const FILTERS = ["ALL", "ASSIGNED", "IN_PROGRESS", "RESOLVED"];
  const filtered = filter === "ALL" ? issues : issues.filter(t => t.status?.toUpperCase() === filter);

  const counts = {
    total:      issues.length,
    assigned:   issues.filter(t => t.status === "ASSIGNED").length,
    inProgress: issues.filter(t => t.status === "IN_PROGRESS").length,
    resolved:   issues.filter(t => t.status === "RESOLVED" || t.status === "CLOSED").length,
  };

  const displayName = user?.name || user?.full_name || user?.username || "Worker";
  const initials = displayName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();

  const fmtSync = (d: Date) => d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  const spinStyle = {
    transform: [{
      rotate: syncSpin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] })
    }]
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={G.g1} />
      <SafeAreaView style={{ flex: 1 }}>

        {/* ── HEADER ── */}
        <Animated.View style={[s.header, { transform: [{ translateY: headerSlide }], opacity: headerFade }]}>
          <LinearGradient colors={[G.g1, G.g2, G.g3]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />
          <View style={s.blob1} /><View style={s.blob2} /><View style={s.blob3} />

          {/* Top row */}
          <View style={s.headerTop}>
            {/* Avatar */}
            <View style={s.avatarWrap}>
              <LinearGradient colors={["rgba(255,255,255,0.3)","rgba(255,255,255,0.12)"]} style={s.avatar}>
                <Text style={s.avatarTxt}>{initials}</Text>
              </LinearGradient>
              <View style={s.onlineDot} />
            </View>

            {/* Greeting */}
            <View style={{ flex: 1 }}>
              <Text style={s.greeting}>Good {new Date().getHours() < 12 ? "Morning" : new Date().getHours() < 17 ? "Afternoon" : "Evening"} 👋</Text>
              <Text style={s.workerName} numberOfLines={1}>{displayName}</Text>
              <View style={s.roleBadge}>
                <MaterialCommunityIcons name="hammer-wrench" size={9} color="rgba(255,255,255,0.85)" />
                <Text style={s.roleTxt}>{user?.role?.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()) || "Field Worker"}</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 3 }}>
                <PulseDot color="rgba(165,214,167,0.9)" size={3} />
                <Text style={s.syncTxt}>
                  {lastSync ? `Synced ${fmtSync(lastSync)}` : "Live · auto-sync 30s"}
                </Text>
              </View>
            </View>

            <View style={{ gap: 8, alignItems: "flex-end" }}>
              <TouchableOpacity style={s.headerBtn} onPress={() => fetchIssues(true)}>
                <Animated.View style={spinStyle}>
                  <Ionicons name="refresh" size={15} color="#fff" />
                </Animated.View>
              </TouchableOpacity>
              <TouchableOpacity style={[s.headerBtn, { backgroundColor: "rgba(198,40,40,0.5)", borderColor: "rgba(255,100,100,0.4)" }]} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={15} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Location banner */}
          <View style={s.locationBanner}>
            <View style={[s.locationIcon, { backgroundColor: "rgba(255,255,255,0.18)" }]}>
              {locResolving
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="location" size={11} color={G.accent} />}
            </View>
            <Text style={s.locationTxt} numberOfLines={1}>
              {locResolving
                ? "Detecting location…"
                : wardInfo?.name
                  ? `${wardInfo.name}${corpInfo?.name ? " · " + corpInfo.name : ""}`
                  : coords
                    ? `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`
                    : "Location not available"}
            </Text>
            {user?.employee_id && (
              <View style={s.empBadge}>
                <Text style={s.empTxt}>ID: {user.employee_id}</Text>
              </View>
            )}
          </View>

          {/* Stats row */}
          <View style={s.statsRow}>
            <StatTile label="Total"       value={counts.total}      color={G.g2}    bg="#e8f5e9" icon="list-outline"        delay={80}  />
            <StatTile label="Assigned"    value={counts.assigned}   color={G.blue}  bg="#e1f5fe" icon="clipboard-outline"   delay={150} />
            <StatTile label="Progress"    value={counts.inProgress} color={G.warn}  bg="#fff3e0" icon="construct-outline"   delay={220} />
            <StatTile label="Resolved"    value={counts.resolved}   color={G.teal}  bg="#e0f2f1" icon="checkmark-done"      delay={290} />
          </View>
        </Animated.View>

        {/* ── CONTENT ── */}
        {loading ? (
          <View style={s.loaderWrap}>
            <View style={s.loaderRing}>
              <LinearGradient colors={[G.g2, G.g1]} style={s.loaderCircle}>
                <MaterialCommunityIcons name="hammer-wrench" size={28} color="#fff" />
              </LinearGradient>
            </View>
            <ActivityIndicator size="large" color={G.g2} style={{ marginTop: 22 }} />
            <Text style={s.loaderTxt}>Loading issues…</Text>
            <Text style={s.loaderSub}>Syncing with backend</Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={[s.scroll, filtered.length === 0 && { flex: 1 }]}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchIssues(true)} tintColor={G.g2} colors={[G.g2]} />}
          >

            {/* Filter Tabs */}
            <Text style={s.sectionHdr}>My Issues</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 0 }}>
              {FILTERS.map(f => {
                const active = filter === f;
                const cfg    = f === "ALL" ? null : getTaskStatus(f);
                return (
                  <TouchableOpacity
                    key={f}
                    style={[s.filterTab, active && { backgroundColor: cfg ? cfg.color : G.g2, borderColor: "transparent" }, !active && { borderColor: cfg ? cfg.border : G.border }]}
                    onPress={() => setFilter(f)}
                  >
                    {cfg && <Ionicons name={cfg.icon as any} size={11} color={active ? "#fff" : cfg.color} />}
                    <Text style={[s.filterTxt, active && { color: "#fff" }, !active && { color: cfg ? cfg.color : G.textMid }]}>
                      {f === "ALL" ? "All" : cfg?.label ?? f}
                    </Text>
                    {f !== "ALL" && (
                      <View style={[s.filterBadge, { backgroundColor: active ? "rgba(255,255,255,0.3)" : (cfg?.bg ?? G.accentLt) }]}>
                        <Text style={[s.filterBadgeTxt, { color: active ? "#fff" : (cfg?.color ?? G.g2) }]}>
                          {issues.filter(t => t.status?.toUpperCase() === f).length}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Issue List */}
            {filtered.length === 0 ? (
              <View style={s.emptyWrap}>
                <View style={s.emptyIcon}>
                  <LinearGradient colors={[G.g2, G.g1]} style={s.emptyCircle}>
                    <Ionicons name="checkmark-done-circle" size={34} color="#fff" />
                  </LinearGradient>
                </View>
                <Text style={s.emptyTitle}>
                  {filter === "ALL" ? "No Issues Assigned" : `No ${getTaskStatus(filter).label} Issues`}
                </Text>
                <Text style={s.emptySub}>
                  {filter === "ALL" ? "Issues assigned to you will appear here." : "Try a different filter."}
                </Text>
              </View>
            ) : (
              <>
                <Text style={s.taskCount}>{filtered.length} issue{filtered.length !== 1 ? "s" : ""}</Text>
                {filtered.map((issue, i) => (
                  <IssueCard key={issue.id} issue={issue} index={i} coords={coords} onUploaded={() => fetchIssues(false, true)} />
                ))}
              </>
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: G.bg },

  // Header
  header:       { overflow: "hidden", borderBottomLeftRadius: 30, borderBottomRightRadius: 30, shadowColor: G.g1, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.28, shadowRadius: 22, elevation: 16 },
  blob1:        { position: "absolute", width: 250, height: 250, borderRadius: 125, backgroundColor: "rgba(255,255,255,0.05)", top: -100, right: -70 },
  blob2:        { position: "absolute", width: 150, height: 150, borderRadius: 75,  backgroundColor: "rgba(255,255,255,0.04)", bottom: -30, left: -50 },
  blob3:        { position: "absolute", width: 80,  height: 80,  borderRadius: 40,  backgroundColor: "rgba(0,200,83,0.08)", top: 30, right: 20 },

  headerTop:    { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingHorizontal: 18, paddingTop: 14, paddingBottom: 12 },
  avatarWrap:   { position: "relative" },
  avatar:       { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "rgba(255,255,255,0.4)" },
  avatarTxt:    { fontSize: 18, fontWeight: "900", color: "#fff", letterSpacing: 0.5 },
  onlineDot:    { position: "absolute", bottom: 1, right: 1, width: 12, height: 12, borderRadius: 6, backgroundColor: G.accent, borderWidth: 2, borderColor: G.g2 },
  greeting:     { fontSize: 11, color: "rgba(255,255,255,0.65)", fontWeight: "600" },
  workerName:   { fontSize: 19, fontWeight: "900", color: "#fff", letterSpacing: -0.3 },
  roleBadge:    { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(255,255,255,0.18)", borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3, alignSelf: "flex-start", marginTop: 3, borderWidth: 1, borderColor: "rgba(255,255,255,0.22)" },
  roleTxt:      { fontSize: 10, color: "rgba(255,255,255,0.88)", fontWeight: "700", letterSpacing: 0.3 },
  syncTxt:      { fontSize: 9, color: "rgba(255,255,255,0.55)", fontWeight: "600" },
  headerBtn:    { width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.28)" },

  locationBanner:{ flexDirection: "row", alignItems: "center", gap: 7, marginHorizontal: 18, marginBottom: 14, backgroundColor: "rgba(0,0,0,0.18)", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.15)" },
  locationIcon:  { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  locationTxt:   { flex: 1, fontSize: 11, color: "rgba(255,255,255,0.82)", fontWeight: "600" },
  empBadge:      { backgroundColor: "rgba(255,255,255,0.18)", borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 },
  empTxt:        { fontSize: 9, color: "rgba(255,255,255,0.7)", fontWeight: "700" },

  statsRow:     { flexDirection: "row", gap: 8, paddingHorizontal: 18, paddingBottom: 20 },

  // Content
  scroll:       { padding: 16, paddingBottom: 50 },
  sectionHdr:   { fontSize: 11, color: G.textMute, fontWeight: "800", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 12 },

  filterTab:    { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 13, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, backgroundColor: G.surface },
  filterTxt:    { fontSize: 11, fontWeight: "800" },
  filterBadge:  { borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  filterBadgeTxt:{ fontSize: 9, fontWeight: "800" },

  taskCount:    { fontSize: 10, color: G.textMute, fontWeight: "700", marginBottom: 12, marginLeft: 4, letterSpacing: 1, textTransform: "uppercase" },

  emptyWrap:    { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 40 },
  emptyIcon:    { width: 90, height: 90, borderRadius: 45, borderWidth: 2, borderColor: G.border, alignItems: "center", justifyContent: "center", marginBottom: 22 },
  emptyCircle:  { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center" },
  emptyTitle:   { fontSize: 22, fontWeight: "900", color: G.text, marginBottom: 8 },
  emptySub:     { fontSize: 13, color: G.textMute, textAlign: "center", lineHeight: 20 },

  loaderWrap:   { flex: 1, alignItems: "center", justifyContent: "center" },
  loaderRing:   { width: 84, height: 84, borderRadius: 42, borderWidth: 2, borderColor: G.border, alignItems: "center", justifyContent: "center" },
  loaderCircle: { width: 66, height: 66, borderRadius: 33, alignItems: "center", justifyContent: "center" },
  loaderTxt:    { marginTop: 20, color: G.text, fontWeight: "800", fontSize: 15 },
  loaderSub:    { marginTop: 4, color: G.textMute, fontSize: 12 },
});
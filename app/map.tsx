import React, { useState, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  Animated,
  Image,
  Dimensions,
  StatusBar,
} from "react-native";
import MapView, { Marker, Callout, Circle } from "react-native-maps";
import * as Location from "expo-location";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  MaterialCommunityIcons,
  FontAwesome5,
  Ionicons,
} from "@expo/vector-icons";
import api from "../api";

const { width } = Dimensions.get("window");

// ─── Haversine distance (km) ──────────────────────────────────────────────────
function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Status / type config ─────────────────────────────────────────────────────
const STATUS_CONFIG = {
  RESOLVED:    { color: "#00897b", label: "Resolved",    icon: "checkmark-circle" },
  IN_PROGRESS: { color: "#f57c00", label: "In Progress", icon: "time" },
  REPORTED:    { color: "#1565c0", label: "Reported",    icon: "alert-circle" },
  PROCESSING:  { color: "#6a1b9a", label: "Processing",  icon: "sync" },
  PENDING:     { color: "#546e7a", label: "Pending",     icon: "hourglass" },
};
const getStatus = (s) => {
  if (!s) return { color: "#888", label: "Unknown", icon: "help-circle" };
  const key = s.toUpperCase().replace(/\s+/g, "_");
  return STATUS_CONFIG[key] || { color: "#888", label: s, icon: "help-circle" };
};

// Severity maps to TYPE_ICONS since the nearby endpoint returns `severity` instead of `issue_type`
const TYPE_ICONS = {
  POTHOLE:      { lib: "material", name: "road-variant" },
  STREET_LIGHT: { lib: "fa5",      name: "lightbulb" },
  GARBAGE:      { lib: "ionicons", name: "trash" },
  FLOODING:     { lib: "material", name: "waves" },
  GRAFFITI:     { lib: "material", name: "spray" },
  ROAD_DAMAGE:  { lib: "material", name: "road" },
  LOW:          { lib: "ionicons", name: "alert-circle-outline" },
  MEDIUM:       { lib: "ionicons", name: "warning-outline" },
  HIGH:         { lib: "ionicons", name: "warning" },
  CRITICAL:     { lib: "material", name: "alert-octagon" },
  DEFAULT:      { lib: "ionicons", name: "alert-circle" },
};
function getTypeIcon(type) {
  if (!type) return TYPE_ICONS.DEFAULT;
  const key = type.toUpperCase().replace(/\s+/g, "_");
  return TYPE_ICONS[key] || TYPE_ICONS.DEFAULT;
}

// ─── Custom marker pin ────────────────────────────────────────────────────────
// Large pill badge: coloured background, white icon circle on left + status dot on right
function IssuePin({ type, status }) {
  const { color } = getStatus(status);
  const iconSpec  = getTypeIcon(type);

  const PinIcon = () => {
    const sz = 26;
    if (iconSpec.lib === "material") return <MaterialCommunityIcons name={iconSpec.name} size={sz}   color="#fff" />;
    if (iconSpec.lib === "fa5")      return <FontAwesome5           name={iconSpec.name} size={22}   color="#fff" />;
    return                                  <Ionicons               name={iconSpec.name} size={sz}   color="#fff" />;
  };

  return (
    <View style={pinStyles.root}>
      {/* Pill */}
      <View style={[pinStyles.badge, { backgroundColor: color, shadowColor: color }]}>
        <View style={pinStyles.iconCircle}>
          <PinIcon />
        </View>
        <View style={pinStyles.divider} />
        <View style={pinStyles.statusDot} />
      </View>
      {/* Tail */}
      <View style={[pinStyles.tail, { borderTopColor: color }]} />
      {/* Ground oval */}
      <View style={[pinStyles.ground, { backgroundColor: color + "28" }]} />
    </View>
  );
}
const pinStyles = StyleSheet.create({
  root: { alignItems: "center" },
  badge: {
    flexDirection: "row", alignItems: "center",
    height: 60, borderRadius: 30, paddingRight: 16,
    borderWidth: 3, borderColor: "#fff",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6, shadowRadius: 12, elevation: 24,
  },
  iconCircle: {
    width: 54, height: 54, borderRadius: 27,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center", justifyContent: "center",
  },
  divider: { width: 2, height: 30, backgroundColor: "rgba(255,255,255,0.30)", marginHorizontal: 10 },
  statusDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: "#fff" },
  tail: {
    width: 0, height: 0,
    borderLeftWidth: 12, borderRightWidth: 12, borderTopWidth: 16,
    borderLeftColor: "transparent", borderRightColor: "transparent",
    marginTop: -3,
  },
  ground: { width: 40, height: 10, borderRadius: 8, marginTop: 3 },
});

// ─── Legend chip ──────────────────────────────────────────────────────────────
function LegendChip({ status, count }) {
  const { color, label } = getStatus(status);
  return (
    <View style={[legendStyles.chip, { borderColor: color + "55" }]}>
      <View style={[legendStyles.dot, { backgroundColor: color }]} />
      <Text style={[legendStyles.label, { color }]}>{label}</Text>
      {count !== undefined && (
        <Text style={[legendStyles.count, { backgroundColor: color + "22", color }]}>
          {count}
        </Text>
      )}
    </View>
  );
}
const legendStyles = StyleSheet.create({
  chip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "#fff", borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1.2, marginRight: 6,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 4, elevation: 2,
  },
  dot:   { width: 7, height: 7, borderRadius: 4 },
  label: { fontSize: 10, fontWeight: "700" },
  count: { fontSize: 10, fontWeight: "800", borderRadius: 10, paddingHorizontal: 5, paddingVertical: 1 },
});

// ─── Callout card (uses nearby serializer fields) ─────────────────────────────
function IssueCallout({ issue, userLat, userLon }) {
  const s = getStatus(issue.status);
  const dist =
    userLat && userLon
      ? getDistanceKm(userLat, userLon, issue.latitude, issue.longitude)
      : null;

  return (
    <View style={calloutStyles.wrap}>
      {/* Status header */}
      <View style={[calloutStyles.header, { backgroundColor: s.color }]}>
        <Ionicons name={s.icon} size={13} color="#fff" />
        <Text style={calloutStyles.headerText}>{s.label}</Text>
        {issue.report_count > 0 && (
          <View style={calloutStyles.reportBadge}>
            <Text style={calloutStyles.reportBadgeText}>
              {issue.report_count} {issue.report_count === 1 ? "report" : "reports"}
            </Text>
          </View>
        )}
      </View>

      {/* Thumbnail image if available */}
      {issue.primary_image ? (
        <Image
          source={{ uri: issue.primary_image }}
          style={calloutStyles.thumbnail}
          resizeMode="cover"
        />
      ) : null}

      <View style={calloutStyles.body}>
        {/* Severity / type label */}
        <Text style={calloutStyles.type}>
          {issue.severity || issue.dept?.name || "Civic Issue"}
        </Text>

        {/* Department */}
        {issue.dept?.name ? (
          <View style={calloutStyles.row}>
            <Ionicons name="business-outline" size={11} color="#81c784" />
            <Text style={calloutStyles.meta}>{issue.dept.name}</Text>
          </View>
        ) : null}

        {/* Distance */}
        {dist !== null ? (
          <View style={calloutStyles.row}>
            <Ionicons name="navigate-outline" size={11} color="#81c784" />
            <Text style={calloutStyles.meta}>
              {dist < 1 ? `${Math.round(dist * 1000)}m away` : `${dist.toFixed(1)}km away`}
            </Text>
          </View>
        ) : null}

        {/* Reported date */}
        {issue.created_at ? (
          <View style={calloutStyles.row}>
            <Ionicons name="calendar-outline" size={11} color="#81c784" />
            <Text style={calloutStyles.meta}>
              {new Date(issue.created_at).toLocaleDateString()}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}
const calloutStyles = StyleSheet.create({
  wrap: {
    width: 190, borderRadius: 14, overflow: "hidden",
    backgroundColor: "#fff",
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 8, elevation: 10,
  },
  header: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 7,
  },
  headerText: { color: "#fff", fontSize: 11, fontWeight: "800", flex: 1 },
  reportBadge: {
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1,
  },
  reportBadgeText: { color: "#fff", fontSize: 9, fontWeight: "800" },
  thumbnail: { width: "100%", height: 80 },
  body:       { padding: 10 },
  type:       { fontSize: 13, fontWeight: "800", color: "#1b5e20", marginBottom: 4 },
  row:        { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 },
  meta:       { fontSize: 10, color: "#81c784", fontWeight: "600" },
});

// ─── Stat strip ───────────────────────────────────────────────────────────────
function StatStrip({ issues }) {
  const resolved   = issues.filter((i) => getStatus(i.status).label === "Resolved").length;
  const inProgress = issues.filter((i) => getStatus(i.status).label === "In Progress").length;
  const reported   = issues.filter((i) =>
    ["Reported", "Processing", "Pending"].includes(getStatus(i.status).label)
  ).length;

  return (
    <View style={statStyles.strip}>
      <View style={statStyles.item}>
        <Text style={statStyles.num}>{issues.length}</Text>
        <Text style={statStyles.lbl}>Nearby</Text>
      </View>
      <View style={statStyles.divider} />
      <View style={statStyles.item}>
        <Text style={[statStyles.num, { color: "#00897b" }]}>{resolved}</Text>
        <Text style={statStyles.lbl}>Resolved</Text>
      </View>
      <View style={statStyles.divider} />
      <View style={statStyles.item}>
        <Text style={[statStyles.num, { color: "#f57c00" }]}>{inProgress}</Text>
        <Text style={statStyles.lbl}>In Progress</Text>
      </View>
      <View style={statStyles.divider} />
      <View style={statStyles.item}>
        <Text style={[statStyles.num, { color: "#1565c0" }]}>{reported}</Text>
        <Text style={statStyles.lbl}>Reported</Text>
      </View>
    </View>
  );
}
const statStyles = StyleSheet.create({
  strip: {
    flexDirection: "row", backgroundColor: "#fff",
    borderRadius: 18, padding: 12,
    marginHorizontal: 16, marginBottom: 10,
    shadowColor: "#1b5e20", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 6,
  },
  item:    { flex: 1, alignItems: "center" },
  num:     { fontSize: 18, fontWeight: "900", color: "#1b5e20" },
  lbl:     { fontSize: 9, color: "#a5d6a7", fontWeight: "700", marginTop: 2 },
  divider: { width: 1, backgroundColor: "#e8f5e9", marginVertical: 2 },
});

// ─── Radius options ───────────────────────────────────────────────────────────
const RADIUS_OPTIONS = [
  { label: "500m", value: 0.5 },
  { label: "1km",  value: 1 },
  { label: "2km",  value: 2 },
  { label: "5km",  value: 5 },
];

// ─── Main Component ───────────────────────────────────────────────────────────
export default function MapDashboard() {
  const [region,       setRegion]       = useState(null);
  const [location,     setLocation]     = useState(null);
  const [nearbyIssues, setNearbyIssues] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [fetching,     setFetching]     = useState(false); // radius-change refetch
  const [apiError,     setApiError]     = useState(false);
  const [radiusKm,     setRadiusKm]     = useState(2);
  const [mapType,      setMapType]      = useState("standard");

  const mapRef     = useRef(null);
  const headerAnim = useRef(new Animated.Value(-30)).current;
  const headerFade = useRef(new Animated.Value(0)).current;
  const bottomAnim = useRef(new Animated.Value(60)).current;
  const bottomFade = useRef(new Animated.Value(0)).current;

  // ── Animate panels in ────────────────────────────────────────────────────
  useEffect(() => {
    Animated.parallel([
      Animated.spring(headerAnim, { toValue: 0, tension: 60, friction: 10, useNativeDriver: true }),
      Animated.timing(headerFade, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(bottomAnim, { toValue: 0, tension: 60, friction: 10, delay: 300, useNativeDriver: true }),
      Animated.timing(bottomFade, { toValue: 1, duration: 500, delay: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  // ── Boot: get location then fetch issues ─────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          alert("Location permission denied!");
          setLoading(false);
          return;
        }
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const { latitude, longitude } = loc.coords;
        setLocation({ latitude, longitude });
        setRegion({
          latitude, longitude,
          latitudeDelta: 0.025,
          longitudeDelta: 0.025,
        });
        await fetchNearby(latitude, longitude, radiusKm);
      } catch (err) {
        console.error("Map init error:", err);
        setLoading(false);
      }
    })();
  }, []);

  // ── Re-fetch whenever radius changes (after initial load) ─────────────────
  useEffect(() => {
    if (!location) return; // skip until we have coords
    fetchNearby(location.latitude, location.longitude, radiusKm);
  }, [radiusKm]);

  // ── Call the /nearby/ API endpoint ───────────────────────────────────────
  const fetchNearby = async (lat, lon, radius) => {
    setFetching(true);
    try {
      const res = await api.get("/api/issues/nearby/", {
        params: {
          latitude:  lat,
          longitude: lon,
          radius:    radius,
        },
      });

      // The endpoint returns a plain array (Response(serializer.data))
      const data = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.results)
        ? res.data.results
        : [];

      // Normalize to what the UI expects
      const normalised = data
        .filter((i) => i.latitude != null && i.longitude != null)
        .map((i) => ({
          id:           i.id,
          // NearbyIssueSerializer returns `severity` (not issue_type)
          severity:     i.severity || null,
          status:       i.status || "REPORTED",
          latitude:     parseFloat(i.latitude),
          longitude:    parseFloat(i.longitude),
          dept:         i.dept || null,           // { id, name }
          primary_image: i.primary_image || null, // image URL from first report
          report_count: i.report_count ?? 0,      // citizen report count
          created_at:   i.created_at || null,
        }));

      setNearbyIssues(normalised);
      setApiError(false);
    } catch (err) {
      console.warn("Nearby API error:", err?.response?.status, err?.message);
      setApiError(true);

      // Fallback demo pins so the map isn't blank
      const demo = [
        { id: 1, severity: "HIGH",   status: "IN_PROGRESS", latitude: lat + 0.003,  longitude: lon + 0.004,  dept: { name: "Roads" },       primary_image: null, report_count: 4,  created_at: new Date().toISOString() },
        { id: 2, severity: "LOW",    status: "RESOLVED",    latitude: lat - 0.004,  longitude: lon - 0.003,  dept: { name: "Electricity" },  primary_image: null, report_count: 1,  created_at: new Date().toISOString() },
        { id: 3, severity: "MEDIUM", status: "REPORTED",    latitude: lat + 0.002,  longitude: lon - 0.005,  dept: { name: "Sanitation" },   primary_image: null, report_count: 7,  created_at: new Date().toISOString() },
        { id: 4, severity: "HIGH",   status: "IN_PROGRESS", latitude: lat - 0.006,  longitude: lon + 0.002,  dept: { name: "Drainage" },     primary_image: null, report_count: 3,  created_at: new Date().toISOString() },
        { id: 5, severity: "CRITICAL",status:"PROCESSING",  latitude: lat + 0.008,  longitude: lon - 0.001,  dept: { name: "Roads" },        primary_image: null, report_count: 12, created_at: new Date().toISOString() },
        { id: 6, severity: "LOW",    status: "RESOLVED",    latitude: lat - 0.002,  longitude: lon + 0.007,  dept: { name: "Roads" },        primary_image: null, report_count: 2,  created_at: new Date().toISOString() },
      ];
      setNearbyIssues(demo);
    } finally {
      setLoading(false);
      setFetching(false);
    }
  };

  const recenter = () => {
    if (mapRef.current && location) {
      mapRef.current.animateToRegion(
        { ...location, latitudeDelta: 0.025, longitudeDelta: 0.025 },
        600
      );
    }
  };

  const toggleMapType = () =>
    setMapType((t) => (t === "standard" ? "satellite" : "standard"));

  // ── Loading screen ────────────────────────────────────────────────────────
  if (loading || !region) {
    return (
      <View style={styles.loaderWrap}>
        <StatusBar barStyle="dark-content" backgroundColor="#e8f5e9" />
        <View style={styles.loaderCircle}>
          <Ionicons name="leaf" size={36} color="#fff" />
        </View>
        <ActivityIndicator size="large" color="#2e7d32" style={{ marginTop: 24 }} />
        <Text style={styles.loaderText}>Locating you…</Text>
        <Text style={styles.loaderSub}>Fetching civic issues nearby</Text>
      </View>
    );
  }

  const statusCounts = {};
  nearbyIssues.forEach((i) => {
    const key = i.status?.toUpperCase().replace(/\s+/g, "_") || "UNKNOWN";
    statusCounts[key] = (statusCounts[key] || 0) + 1;
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1b5e20" />

      {/* ── MAP ── */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        region={region}
        mapType={mapType}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
      >
        {/* Radius circle */}
        <Circle
          center={location}
          radius={radiusKm * 1000}
          strokeColor="rgba(46,125,50,0.4)"
          fillColor="rgba(46,125,50,0.06)"
          strokeWidth={1.5}
        />

        {/* Issue markers – use severity for icon, status for colour */}
        {nearbyIssues.map((issue) => (
          <Marker
            key={issue.id}
            coordinate={{ latitude: issue.latitude, longitude: issue.longitude }}
            tracksViewChanges={false}
          >
            <IssuePin type={issue.severity} status={issue.status} />
            <Callout tooltip>
              <IssueCallout
                issue={issue}
                userLat={location.latitude}
                userLon={location.longitude}
              />
            </Callout>
          </Marker>
        ))}
      </MapView>

      {/* ── HEADER ── */}
      <Animated.View
        style={[
          styles.header,
          { transform: [{ translateY: headerAnim }], opacity: headerFade },
        ]}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Civic Map</Text>
            <Text style={styles.headerSub}>
              {fetching
                ? "Refreshing…"
                : `${nearbyIssues.length} issue${nearbyIssues.length !== 1 ? "s" : ""} within ${
                    radiusKm < 1 ? `${radiusKm * 1000}m` : `${radiusKm}km`
                  }${apiError ? "  ·  demo data" : ""}`}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.iconBtn} onPress={toggleMapType}>
              <Ionicons
                name={mapType === "standard" ? "satellite-outline" : "map-outline"}
                size={18}
                color="#1b5e20"
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={recenter}>
              <Ionicons name="navigate" size={18} color="#1b5e20" />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      {/* ── BOTTOM PANEL ── */}
      <Animated.View
        style={[
          styles.bottomPanel,
          { transform: [{ translateY: bottomAnim }], opacity: bottomFade },
        ]}
      >
        {/* Stats */}
        <StatStrip issues={nearbyIssues} />

        {/* Radius picker */}
        <View style={styles.radiusRow}>
          <View style={styles.radiusLabelRow}>
            <Ionicons name="radio-outline" size={13} color="#2e7d32" />
            <Text style={styles.radiusLabel}>Search radius</Text>
            {fetching && (
              <ActivityIndicator size="small" color="#2e7d32" style={{ marginLeft: 6 }} />
            )}
          </View>
          <View style={styles.radiusPills}>
            {RADIUS_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.radiusPill,
                  radiusKm === opt.value && styles.radiusPillActive,
                ]}
                onPress={() => setRadiusKm(opt.value)}
                disabled={fetching}
              >
                <Text
                  style={[
                    styles.radiusPillText,
                    radiusKm === opt.value && styles.radiusPillTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Legend */}
        {nearbyIssues.length > 0 && (
          <View style={styles.legendScroll}>
            {Object.entries(statusCounts).map(([key, count]) => (
              <LegendChip key={key} status={key} count={count} />
            ))}
          </View>
        )}

        {nearbyIssues.length === 0 && !fetching && (
          <View style={styles.emptyNote}>
            <Ionicons name="checkmark-circle-outline" size={20} color="#81c784" />
            <Text style={styles.emptyNoteText}>
              No issues reported in this area — all clear!
            </Text>
          </View>
        )}
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f1f8e9" },

  loaderWrap: {
    flex: 1, alignItems: "center", justifyContent: "center",
    backgroundColor: "#e8f5e9",
  },
  loaderCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: "#2e7d32", alignItems: "center", justifyContent: "center",
    shadowColor: "#1b5e20", shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4, shadowRadius: 16, elevation: 12,
  },
  loaderText: { marginTop: 18, color: "#2e7d32", fontWeight: "900", fontSize: 16 },
  loaderSub:  { marginTop: 4, color: "#81c784", fontSize: 13, fontWeight: "500" },

  // ── Header ──
  header: {
    position: "absolute", top: 0, left: 0, right: 0,
    backgroundColor: "#fff",
    paddingHorizontal: 20, paddingTop: 52, paddingBottom: 14,
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
    shadowColor: "#1b5e20", shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15, shadowRadius: 16, elevation: 10,
  },
  headerContent:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitle:    { fontSize: 22, fontWeight: "900", color: "#1b5e20", letterSpacing: -0.4 },
  headerSub:      { fontSize: 12, color: "#81c784", fontWeight: "600", marginTop: 2 },
  headerActions:  { flexDirection: "row", gap: 8 },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "#e8f5e9", alignItems: "center", justifyContent: "center",
  },

  // ── Bottom panel ──
  bottomPanel: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingTop: 16, paddingBottom: 28,
    shadowColor: "#1b5e20", shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12, shadowRadius: 16, elevation: 14,
  },

  // ── Radius picker ──
  radiusRow:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, marginBottom: 12 },
  radiusLabelRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  radiusLabel:    { fontSize: 12, color: "#2e7d32", fontWeight: "700" },
  radiusPills:    { flexDirection: "row", gap: 6 },
  radiusPill:     { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, backgroundColor: "#f1f8e9", borderWidth: 1.5, borderColor: "#c8e6c9" },
  radiusPillActive:     { backgroundColor: "#1b5e20", borderColor: "#1b5e20" },
  radiusPillText:       { fontSize: 11, fontWeight: "700", color: "#2e7d32" },
  radiusPillTextActive: { color: "#fff" },

  // ── Legend ──
  legendScroll: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 16, gap: 0 },

  // ── Empty ──
  emptyNote: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginHorizontal: 20, backgroundColor: "#e8f5e9",
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10,
  },
  emptyNoteText: { fontSize: 12, color: "#2e7d32", fontWeight: "600", flex: 1 },
});
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Modal,
  ActivityIndicator,
  ScrollView,
  Animated,
  Dimensions,
  StatusBar,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { useLocationContext } from "../context/locationcontext";
import api from "../api";
const { width, height } = Dimensions.get("window");

// ─── Floating background orb ──────────────────────────────────────────────────
function Orb({ style, duration, delay, range }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <Animated.View pointerEvents="none" style={[style, {
      transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, range] }) }],
    }]} />
  );
}

// ─── NEW: Location chips (ward + municipal corp) ──────────────────────────────
function LocationChips({ wardInfo, corpInfo, locationResolving, locationError }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(6)).current;

  useEffect(() => {
    if (wardInfo || locationError || !locationResolving) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 100, friction: 8, useNativeDriver: true }),
      ]).start();
    }
  }, [wardInfo, locationError, locationResolving]);

  if (locationResolving) {
    return (
      <Animated.View style={[locStyles.row, { opacity: fadeAnim }]}>
        <View style={locStyles.chip}>
          <ActivityIndicator size="small" color="#a5d6a7" style={{ marginRight: 5, transform: [{ scale: 0.7 }] }} />
          <Text style={locStyles.chipText}>Detecting location…</Text>
        </View>
      </Animated.View>
    );
  }

  if (locationError) {
    return (
      <Animated.View style={[locStyles.row, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <View style={[locStyles.chip, locStyles.chipError]}>
          <Ionicons name="warning-outline" size={10} color="#ef9a9a" style={{ marginRight: 4 }} />
          <Text style={[locStyles.chipText, { color: "#ef9a9a" }]} numberOfLines={1}>
            {locationError}
          </Text>
        </View>
      </Animated.View>
    );
  }

  if (!wardInfo && !corpInfo) return null;

  return (
    <Animated.View style={[locStyles.row, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      {corpInfo && (
        <View style={locStyles.chip}>
          <Ionicons name="business-outline" size={10} color="#a5d6a7" style={{ marginRight: 4 }} />
          <Text style={locStyles.chipText} numberOfLines={1}>{corpInfo.name}</Text>
        </View>
      )}
      {wardInfo && (
        <View style={[locStyles.chip, locStyles.chipWard]}>
          <Ionicons name="location-outline" size={10} color="#a5d6a7" style={{ marginRight: 4 }} />
          <Text style={locStyles.chipText} numberOfLines={1}>{wardInfo.name}</Text>
        </View>
      )}
    </Animated.View>
  );
}

const locStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.13)",
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  chipWard: {
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  chipError: {
    backgroundColor: "rgba(198,40,40,0.2)",
    borderColor: "rgba(239,154,154,0.3)",
  },
  chipText: {
    color: "#e8f5e9",
    fontSize: 10,
    fontWeight: "600",
    maxWidth: 130,
  },
});

// ─── Character count ring ─────────────────────────────────────────────────────
function CharRing({ current, max }) {
  const pct = Math.min(current / max, 1);
  const color = pct < 0.5 ? "#43a047" : pct < 0.8 ? "#f57c00" : "#e53935";
  const remaining = max - current;
  return (
    <View style={charRingStyles.wrap}>
      <View style={[charRingStyles.ring, { borderColor: current === 0 ? "#e0e0e0" : color }]}>
        <Text style={[charRingStyles.count, { color: current === 0 ? "#bbb" : color }]}>{remaining}</Text>
      </View>
    </View>
  );
}
const charRingStyles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center" },
  ring: { width: 36, height: 36, borderRadius: 18, borderWidth: 3, alignItems: "center", justifyContent: "center" },
  count: { fontSize: 10, fontWeight: "900" },
});

// ─── Animated error banner ────────────────────────────────────────────────────
function ErrorBanner({ errors, onDismiss }) {
  const slideAnim = useRef(new Animated.Value(-20)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (errors.length > 0) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, tension: 100, friction: 8, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: -20, duration: 200, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [errors.length]);

  if (errors.length === 0) return null;

  return (
    <Animated.View style={[styles.errorBanner, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <View style={styles.errorTopRow}>
        <View style={styles.errorIconBubble}>
          <Ionicons name="warning" size={18} color="#fff" />
        </View>
        <Text style={styles.errorTitle}>Fix these to continue</Text>
        <TouchableOpacity onPress={onDismiss} style={styles.errorDismiss}>
          <Ionicons name="close-circle" size={22} color="#ef9a9a" />
        </TouchableOpacity>
      </View>
      {errors.map((e, i) => (
        <View key={i} style={styles.errorItem}>
          <View style={styles.errorDot} />
          <Text style={styles.errorText}>{e}</Text>
        </View>
      ))}
    </Animated.View>
  );
}

// ─── Cloud upload badge ───────────────────────────────────────────────────────
function CloudBadge({ uploading, done }) {
  const pulse = useRef(new Animated.Value(1)).current;
  const checkScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (uploading) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.15, duration: 500, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      ).start();
    } else if (done) {
      pulse.stopAnimation();
      Animated.spring(checkScale, { toValue: 1, tension: 200, friction: 6, useNativeDriver: true }).start();
    }
  }, [uploading, done]);

  if (!uploading && !done) return null;

  return (
    <Animated.View style={[styles.cloudBadge, done && styles.cloudBadgeDone,
      { transform: [{ scale: uploading ? pulse : checkScale }] }]}>
      {uploading ? (
        <><ActivityIndicator size="small" color="#fff" /><Text style={styles.cloudBadgeText}>Uploading…</Text></>
      ) : (
        <><Ionicons name="cloud-done" size={15} color="#fff" /><Text style={styles.cloudBadgeText}>Cloud Ready ✓</Text></>
      )}
    </Animated.View>
  );
}

// ─── Step progress bar ────────────────────────────────────────────────────────
function StepBar({ hasImage, hasDescription, hasLocation }) {
  const steps = [
    { label: "Photo", done: hasImage, icon: "camera" },
    { label: "Details", done: hasDescription, icon: "create" },
    { label: "Location", done: hasLocation, icon: "location" },
  ];
  return (
    <View style={styles.stepBar}>
      {steps.map((s, i) => (
        <React.Fragment key={i}>
          <View style={styles.stepItem}>
            <View style={[styles.stepCircle, s.done && styles.stepCircleDone]}>
              <Ionicons name={s.icon} size={14} color={s.done ? "#fff" : "#bbb"} />
            </View>
            <Text style={[styles.stepLabel, s.done && styles.stepLabelDone]}>{s.label}</Text>
          </View>
          {i < 2 && <View style={[styles.stepLine, steps[i + 1]?.done && styles.stepLineDone]} />}
        </React.Fragment>
      ))}
    </View>
  );
}

// ─── Bounce dot for loader ────────────────────────────────────────────────────
function BounceDot({ delay }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: -8, duration: 300, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.delay(600),
      ])
    ).start();
  }, []);
  return <Animated.View style={[styles.bounceDot, { transform: [{ translateY: anim }] }]} />;
}

// ─── Submitting overlay ───────────────────────────────────────────────────────
function SubmittingOverlay({ visible }) {
  const spinAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
      Animated.loop(
        Animated.timing(spinAnim, { toValue: 1, duration: 1200, useNativeDriver: true })
      ).start();
    }
  }, [visible]);

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  return (
    <Modal transparent visible={visible} animationType="none">
      <Animated.View style={[styles.overlayBg, { opacity: fadeAnim }]}>
        <Animated.View style={[styles.overlayCard, { transform: [{ scale: scaleAnim }] }]}>
          <View style={styles.overlayIconWrap}>
            <View style={styles.overlayIconBg} />
            <Animated.View style={[styles.overlaySpinRing, { transform: [{ rotate: spin }] }]} />
            <View style={styles.overlayIcon}>
              <Ionicons name="send" size={26} color="#fff" />
            </View>
          </View>
          <Text style={styles.overlayTitle}>Submitting Report</Text>
          <Text style={styles.overlaySub}>Uploading to civic servers…</Text>
          <View style={styles.overlayDots}>
            {[0, 1, 2].map(i => <BounceDot key={i} delay={i * 180} />)}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function Report() {
  const router = useRouter();
  const [image, setImage] = useState(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [cloudImageUrl, setCloudImageUrl] = useState(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState([]);
  const [locationFetched, setLocationFetched] = useState(false);

  const cameraRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();
  const {
    wardInfo,
    corpInfo,
    coords: locationCoords,
    resolving: locationResolving,
    error: locationError,
  } = useLocationContext();

  const headerSlide = useRef(new Animated.Value(-30)).current;
  const headerFade = useRef(new Animated.Value(0)).current;
  const cardSlide = useRef(new Animated.Value(40)).current;
  const cardFade = useRef(new Animated.Value(0)).current;
  const btnScale = useRef(new Animated.Value(1)).current;
  const imgScaleIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    ImagePicker.requestMediaLibraryPermissionsAsync();
    Location.requestForegroundPermissionsAsync();

    Animated.sequence([
      Animated.parallel([
        Animated.timing(headerSlide, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.timing(headerFade, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.spring(cardSlide, { toValue: 0, tension: 70, friction: 8, useNativeDriver: true }),
        Animated.timing(cardFade, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const uploadImageToCloud = async (uri) => {
    setImageUploading(true);
    setCloudImageUrl(null);
    setErrors([]);
    Animated.spring(imgScaleIn, { toValue: 1, tension: 80, friction: 7, useNativeDriver: true }).start();
    try {
      const filename = uri.split("/").pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : "image/jpeg";
      const formData = new FormData();
      formData.append("image_only", "true");
      formData.append("image", { uri, name: filename, type });
      const response = await api.post("/api/issues/upload-image/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const url = response.data?.image_url || response.data?.secure_url;
      if (!url) throw new Error("No URL returned");
      setCloudImageUrl(url);
    } catch (err) {
      // silent fail — will use local URI as fallback
    } finally {
      setImageUploading(false);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85 });
    if (!result.canceled) {
      imgScaleIn.setValue(0);
      setImage(result.assets[0].uri);
      uploadImageToCloud(result.assets[0].uri);
    }
  };

  const takePicture = async () => {
    if (!cameraRef.current) return;
    const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 });
    imgScaleIn.setValue(0);
    setImage(photo.uri);
    setCameraOpen(false);
    uploadImageToCloud(photo.uri);
  };

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return null;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLocationFetched(true);
      return { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
    } catch { return null; }
  };

  const validate = (coords) => {
    const errs = [];
    if (!image) errs.push("Attach a photo of the civic issue.");
    if (!description.trim()) errs.push("Add a description of the problem.");
    if (description.trim().length < 10) errs.push("Description needs at least 10 characters.");
    if (!coords) errs.push("GPS unavailable. Enable location and retry.");
    if (!wardInfo || !corpInfo) errs.push("Area not resolved yet. Wait for GPS detection or try again.");
    return errs;
  };

  const handleSubmit = async () => {
    setErrors([]);
    setLoading(true);
    const coords = locationCoords ?? await getCurrentLocation();
    const validationErrors = validate(coords);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      setLoading(false);
      return;
    }
    try {
      const filename = image.split("/").pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : "image/jpeg";
      const formData = new FormData();
      formData.append("description", description.trim());
      formData.append("latitude", Math.round(coords.latitude * 1000000) / 1000000);
      formData.append("longitude", Math.round(coords.longitude * 1000000) / 1000000);
      if (cloudImageUrl) formData.append("image_url", cloudImageUrl);
      else formData.append("image", { uri: image, name: filename, type });
      formData.append("ward_id", String(wardInfo.id));
      formData.append("municipal_corp_id", String(corpInfo.id));
      await api.post("/api/issues/report/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setLoading(false);
      Alert.alert("Report Submitted", "Thank you for helping improve your city! Your report has been submitted successfully.");
      router.push({ pathname: "/dashboard", params: { description, location: `${coords.latitude},${coords.longitude}` } });
    } catch (err) {
      setLoading(false);
      const data = err?.response?.data;
      if (data && typeof data === "object") {
        const extracted = [];
        for (const [key, val] of Object.entries(data)) {
          if (Array.isArray(val)) val.forEach(v => extracted.push(`${key}: ${v}`));
          else if (typeof val === "string") extracted.push(val);
        }
        setErrors(extracted.length ? extracted : ["Something went wrong. Please try again."]);
      } else {
        setErrors(["Network error. Check your connection."]);
      }
    }
  };

  const pressIn = () => Animated.spring(btnScale, { toValue: 0.94, useNativeDriver: true }).start();
  const pressOut = () => Animated.spring(btnScale, { toValue: 1, useNativeDriver: true }).start();

  if (!permission?.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permScreen}>
          <View style={styles.permIconRing}>
            <View style={styles.permIconCircle}>
              <Ionicons name="camera" size={44} color="#fff" />
            </View>
          </View>
          <Text style={styles.permTitle}>Camera Access Needed</Text>
          <Text style={styles.permSub}>Allow camera access to photograph and report civic issues in your area.</Text>
          <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
            <Ionicons name="checkmark-circle" size={18} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.permBtnText}>Allow Camera</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (cameraOpen) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#000" }}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <CameraView ref={cameraRef} style={{ flex: 1 }}>
          <View style={styles.cameraGuide}>
            <View style={[styles.cameraCorner, styles.cameraCornerTL]} />
            <View style={[styles.cameraCorner, styles.cameraCornerTR]} />
            <View style={[styles.cameraCorner, styles.cameraCornerBL]} />
            <View style={[styles.cameraCorner, styles.cameraCornerBR]} />
          </View>
          <Text style={styles.cameraHint}>Frame the civic issue clearly</Text>
          <View style={styles.cameraControls}>
            <TouchableOpacity style={styles.cameraCloseBtn} onPress={() => setCameraOpen(false)}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.captureBtn} onPress={takePicture}>
              <View style={styles.captureBtnInner} />
            </TouchableOpacity>
            <View style={{ width: 52 }} />
          </View>
        </CameraView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1b5e20" />

      {/* ── HEADER BAND with location chips ── */}
      <Animated.View style={[styles.headerBand, { transform: [{ translateY: headerSlide }], opacity: headerFade }]}>
        <Orb style={styles.bandOrb1} duration={4000} delay={0} range={-12} />
        <Orb style={styles.bandOrb2} duration={5500} delay={800} range={10} />

        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Report Issue</Text>
          <Text style={styles.headerSub}>Help improve your city</Text>

          {/* ✅ Ward + Municipal Corp chips — same style as Dashboard */}
          <LocationChips
            wardInfo={wardInfo}
            corpInfo={corpInfo}
            locationResolving={locationResolving}
            locationError={locationError}
          />
        </View>

        <View style={styles.headerIcon}>
          <Ionicons name="megaphone" size={20} color="#a5d6a7" />
        </View>
      </Animated.View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          <StepBar hasImage={!!image} hasDescription={description.trim().length >= 10} hasLocation={locationFetched} />
          <ErrorBanner errors={errors} onDismiss={() => setErrors([])} />

          <Animated.View style={[styles.card, { transform: [{ translateY: cardSlide }], opacity: cardFade }]}>

            {/* Photo section */}
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionBadge, { backgroundColor: "#e8f5e9" }]}>
                <Ionicons name="camera" size={16} color="#2e7d32" />
              </View>
              <Text style={styles.sectionTitle}>Issue Photo</Text>
              {image && <View style={styles.sectionCheck}><Ionicons name="checkmark" size={12} color="#fff" /></View>}
            </View>

            {image ? (
              <Animated.View style={[styles.imageWrapper, { transform: [{ scale: imgScaleIn }] }]}>
                <Image source={{ uri: image }} style={styles.previewImage} />
                <CloudBadge uploading={imageUploading} done={!!cloudImageUrl && !imageUploading} />
                <View style={styles.imageActions}>
                  <TouchableOpacity style={styles.imageActionBtn} onPress={() => setCameraOpen(true)}>
                    <Ionicons name="camera-reverse-outline" size={16} color="#fff" />
                    <Text style={styles.imageActionText}>Retake</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.imageActionBtn, styles.imageActionDanger]} onPress={() => { setImage(null); setCloudImageUrl(null); imgScaleIn.setValue(0); }}>
                    <Ionicons name="trash-outline" size={16} color="#fff" />
                    <Text style={styles.imageActionText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            ) : (
              <View style={styles.photoPickerRow}>
                <TouchableOpacity style={styles.photoPickerBtn} onPress={() => setCameraOpen(true)}>
                  <View style={styles.photoPickerIcon}>
                    <Ionicons name="camera" size={30} color="#2e7d32" />
                  </View>
                  <Text style={styles.photoPickerLabel}>Camera</Text>
                  <Text style={styles.photoPickerSub}>Take a photo</Text>
                </TouchableOpacity>
                <View style={styles.photoPickerOr}>
                  <View style={styles.photoPickerOrLine} />
                  <Text style={styles.photoPickerOrText}>or</Text>
                  <View style={styles.photoPickerOrLine} />
                </View>
                <TouchableOpacity style={[styles.photoPickerBtn, { borderColor: "#bbdefb" }]} onPress={pickImage}>
                  <View style={[styles.photoPickerIcon, { backgroundColor: "#e3f2fd" }]}>
                    <Ionicons name="images" size={30} color="#1565c0" />
                  </View>
                  <Text style={[styles.photoPickerLabel, { color: "#1565c0" }]}>Gallery</Text>
                  <Text style={styles.photoPickerSub}>Choose existing</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.divider} />

            {/* Description */}
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionBadge, { backgroundColor: "#fff3e0" }]}>
                <Ionicons name="create" size={16} color="#e65100" />
              </View>
              <Text style={styles.sectionTitle}>Description</Text>
              <CharRing current={description.length} max={300} />
            </View>

            <TextInput
              placeholder="Describe the civic issue in detail — location landmarks, severity, how long it's been there…"
              placeholderTextColor="#bdbdbd"
              value={description}
              onChangeText={(t) => { if (t.length <= 300) { setDescription(t); if (errors.length) setErrors([]); } }}
              multiline
              style={[styles.descInput, errors.some(e => e.toLowerCase().includes("descri")) && styles.descInputError]}
            />

            <View style={styles.divider} />

            {/* Location preview card — read-only display of resolved area */}
           

            {/* Submit */}
            <Animated.View style={{ transform: [{ scale: btnScale }] }}>
              <TouchableOpacity
                style={[styles.submitBtn, loading && styles.submitDisabled]}
                onPress={handleSubmit}
                onPressIn={pressIn}
                onPressOut={pressOut}
                disabled={loading}
                activeOpacity={1}
              >
                <View style={styles.submitBtnShimmer} />
                <Ionicons name="send" size={18} color="#fff" style={{ marginRight: 10 }} />
                <Text style={styles.submitBtnText}>Submit Report</Text>
                <View style={styles.submitBtnArrow}>
                  <Ionicons name="arrow-forward" size={14} color="#2e7d32" />
                </View>
              </TouchableOpacity>
            </Animated.View>

            <Text style={styles.submitNote}>
              Your report will be reviewed and forwarded to the concerned civic authority.
            </Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      <SubmittingOverlay visible={loading} />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f1f8e9" },

  headerBand: {
    backgroundColor: "#1b5e20", flexDirection: "row", alignItems: "center",
    paddingHorizontal: 20, paddingTop: 14, paddingBottom: 18,
    borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: "hidden",
    shadowColor: "#1b5e20", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 10,
  },
  bandOrb1: { position: "absolute", width: 160, height: 160, borderRadius: 80, backgroundColor: "rgba(255,255,255,0.05)", top: -60, right: -40 },
  bandOrb2: { position: "absolute", width: 100, height: 100, borderRadius: 50, backgroundColor: "rgba(255,255,255,0.04)", bottom: -30, left: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { fontSize: 20, fontWeight: "900", color: "#fff", letterSpacing: -0.3 },
  headerSub: { fontSize: 11, color: "#a5d6a7", marginTop: 2, fontWeight: "500" },
  headerIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" },

  scrollContent: { padding: 16, paddingBottom: 40 },

  stepBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: "#fff", borderRadius: 20, padding: 16, marginBottom: 14,
    shadowColor: "#2e7d32", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
  },
  stepItem: { alignItems: "center", gap: 5 },
  stepCircle: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#f5f5f5", borderWidth: 2, borderColor: "#e0e0e0", alignItems: "center", justifyContent: "center" },
  stepCircleDone: { backgroundColor: "#2e7d32", borderColor: "#2e7d32" },
  stepLabel: { fontSize: 10, color: "#bbb", fontWeight: "600" },
  stepLabelDone: { color: "#2e7d32" },
  stepLine: { width: 40, height: 2, backgroundColor: "#e0e0e0", marginHorizontal: 6, marginBottom: 14 },
  stepLineDone: { backgroundColor: "#2e7d32" },

  errorBanner: {
    backgroundColor: "#ffebee", borderRadius: 16, borderWidth: 1.5, borderColor: "#ef9a9a",
    padding: 16, marginBottom: 14,
    shadowColor: "#e53935", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3,
  },
  errorTopRow: { flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 10 },
  errorIconBubble: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#e53935", alignItems: "center", justifyContent: "center" },
  errorTitle: { flex: 1, fontWeight: "800", color: "#b71c1c", fontSize: 14 },
  errorDismiss: {},
  errorItem: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 4 },
  errorDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#e53935", marginTop: 5 },
  errorText: { flex: 1, color: "#c62828", fontSize: 13, lineHeight: 19 },

  card: {
    backgroundColor: "#fff", borderRadius: 26, padding: 22,
    shadowColor: "#2e7d32", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 8,
  },

  sectionHeader: { flexDirection: "row", alignItems: "center", marginBottom: 14, gap: 10 },
  sectionBadge: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  sectionTitle: { flex: 1, fontSize: 16, fontWeight: "800", color: "#1b5e20" },
  sectionCheck: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#2e7d32", alignItems: "center", justifyContent: "center" },

  photoPickerRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  photoPickerBtn: {
    flex: 1, alignItems: "center", paddingVertical: 22, borderWidth: 1.5, borderColor: "#c8e6c9",
    borderRadius: 18, borderStyle: "dashed", backgroundColor: "#f9fbe7", gap: 6,
  },
  photoPickerIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: "#e8f5e9", alignItems: "center", justifyContent: "center" },
  photoPickerLabel: { fontSize: 14, fontWeight: "800", color: "#2e7d32" },
  photoPickerSub: { fontSize: 11, color: "#388e3c" },
  photoPickerOr: { alignItems: "center", paddingHorizontal: 12, gap: 6 },
  photoPickerOrLine: { width: 1, height: 24, backgroundColor: "#c8e6c9" },
  photoPickerOrText: { fontSize: 11, color: "#bbb", fontWeight: "600" },

  imageWrapper: { borderRadius: 18, overflow: "hidden", marginBottom: 4 },
  previewImage: { width: "100%", height: 210, borderRadius: 18 },
  cloudBadge: {
    position: "absolute", top: 12, left: 12, flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#388e3c", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
  },
  cloudBadgeDone: { backgroundColor: "#00897b" },
  cloudBadgeText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  imageActions: { position: "absolute", bottom: 12, right: 12, flexDirection: "row", gap: 8 },
  imageActionBtn: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 16, paddingHorizontal: 12, paddingVertical: 7 },
  imageActionDanger: { backgroundColor: "rgba(198,40,40,0.8)" },
  imageActionText: { color: "#fff", fontSize: 12, fontWeight: "700" },

  divider: { height: 1, backgroundColor: "#f1f8e9", marginVertical: 18 },

  descInput: {
    height: 120, borderWidth: 1.5, borderColor: "#c8e6c9", borderRadius: 16,
    padding: 14, textAlignVertical: "top", color: "#1b5e20",
    backgroundColor: "#fafff9", fontSize: 14, lineHeight: 21, marginBottom: 6,
  },
  descInputError: { borderColor: "#ef9a9a", backgroundColor: "#fff9f9" },

  // ✅ New area card (replaces old single-line location card)
  areaCard: {
    backgroundColor: "#f1f8e9",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#c8e6c9",
  },
  areaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
  },
  areaPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 10,
    shadowColor: "#2e7d32",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  areaPillIcon: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
  },
  areaPillLabel: { fontSize: 9, color: "#2e7d32", fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  areaPillValue: { fontSize: 13, fontWeight: "800", color: "#1b5e20", marginTop: 1, maxWidth: 110 },
  areaDivider: { width: 1, height: 36, backgroundColor: "#c8e6c9" },
  areaGps: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#e8f5e9", borderRadius: 20,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  areaGpsDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: "#00e676" },
  areaGpsText: { fontSize: 10, fontWeight: "700", color: "#2e7d32" },
  areaDetecting: { fontSize: 13, color: "#2e7d32", fontWeight: "500" },

  submitBtn: {
    backgroundColor: "#2e7d32", borderRadius: 18, paddingVertical: 17,
    flexDirection: "row", alignItems: "center", justifyContent: "center", overflow: "hidden",
    shadowColor: "#1b5e20", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 10,
  },
  submitDisabled: { opacity: 0.6 },
  submitBtnShimmer: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(255,255,255,0.07)" },
  submitBtnText: { color: "#fff", fontSize: 17, fontWeight: "900", letterSpacing: 0.2 },
  submitBtnArrow: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", marginLeft: 10 },
  submitNote: { textAlign: "center", color: "#a5d6a7", fontSize: 11, marginTop: 12, lineHeight: 16 },

  cameraGuide: { position: "absolute", top: "25%", left: "10%", width: "80%", height: "45%", justifyContent: "space-between" },
  cameraCorner: { position: "absolute", width: 28, height: 28, borderColor: "#fff" },
  cameraCornerTL: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 6 },
  cameraCornerTR: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 6 },
  cameraCornerBL: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 6 },
  cameraCornerBR: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 6 },
  cameraHint: { position: "absolute", top: "22%", width: "100%", textAlign: "center", color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: "600" },
  cameraControls: { position: "absolute", bottom: 50, width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 40 },
  cameraCloseBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  captureBtn: { width: 76, height: 76, borderRadius: 38, borderWidth: 4, borderColor: "#fff", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.2)" },
  captureBtnInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: "#fff" },

  permScreen: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  permIconRing: { width: 120, height: 120, borderRadius: 60, borderWidth: 2, borderColor: "#c8e6c9", alignItems: "center", justifyContent: "center", marginBottom: 20 },
  permIconCircle: { width: 96, height: 96, borderRadius: 48, backgroundColor: "#2e7d32", alignItems: "center", justifyContent: "center", shadowColor: "#1b5e20", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 10 },
  permTitle: { fontSize: 24, fontWeight: "900", color: "#1b5e20", marginBottom: 10 },
  permSub: { textAlign: "center", color: "#666", fontSize: 14, lineHeight: 22, marginBottom: 28 },
  permBtn: { backgroundColor: "#2e7d32", flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 28, borderRadius: 16 },
  permBtnText: { color: "#fff", fontWeight: "800", fontSize: 16 },

  overlayBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "center", alignItems: "center" },
  overlayCard: { backgroundColor: "#fff", borderRadius: 28, padding: 36, alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.2, shadowRadius: 30, elevation: 20, minWidth: 240 },
  overlayIconWrap: { width: 90, height: 90, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  overlayIconBg: { position: "absolute", width: 90, height: 90, borderRadius: 45, backgroundColor: "#e8f5e9" },
  overlaySpinRing: { position: "absolute", width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: "#c8e6c9", borderTopColor: "#2e7d32" },
  overlayIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#2e7d32", alignItems: "center", justifyContent: "center" },
  overlayTitle: { fontSize: 20, fontWeight: "900", color: "#1b5e20", marginBottom: 6 },
  overlaySub: { fontSize: 13, color: "#388e3c", marginBottom: 20 },
  overlayDots: { flexDirection: "row", gap: 8 },
  bounceDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#2e7d32" },
});
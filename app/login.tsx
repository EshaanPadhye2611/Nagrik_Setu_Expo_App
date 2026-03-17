import React, { useState, useRef, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, SafeAreaView,
  ActivityIndicator, Animated, Dimensions, StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import api from "../api";
import useUserStore from "../store/userStore";

const { width, height } = Dimensions.get("window");

// ─── Animated Background Rings ────────────────────────────────────────────────
function PulsingRings() {
  const rings = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];

  useEffect(() => {
    rings.forEach((ring, i) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 700),
          Animated.timing(ring, { toValue: 1, duration: 2800, useNativeDriver: true }),
          Animated.timing(ring, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      ).start();
    });
  }, []);

  return (
    <View style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "flex-start", paddingTop: height * 0.12 }]} pointerEvents="none">
      {rings.map((ring, i) => (
        <Animated.View key={i} style={{
          position: "absolute", top: height * 0.1,
          width: 180 + i * 70, height: 180 + i * 70,
          borderRadius: 999, borderWidth: 1.5,
          borderColor: `rgba(46,125,50,${0.18 - i * 0.05})`,
          opacity: ring.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1, 0] }),
          transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.5] }) }],
        }} />
      ))}
    </View>
  );
}

// ─── Floating Particle ────────────────────────────────────────────────────────
function FloatingParticle({ x, delay, size, opacity }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration: 4000 + delay, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View pointerEvents="none" style={{
      position: "absolute", left: x, bottom: -20,
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: `rgba(46,125,50,${opacity})`,
      opacity: anim.interpolate({ inputRange: [0, 0.1, 0.9, 1], outputRange: [0, 1, 1, 0] }),
      transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -(height * 0.7)] }) }],
    }} />
  );
}

// ─── Animated Input ───────────────────────────────────────────────────────────
function AnimatedInput({ icon, placeholder, value, onChangeText, secureText, keyboardType, autoCapitalize, delay, rightIcon, onRightIconPress }) {
  const slideAnim = useRef(new Animated.Value(50)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const focusAnim = useRef(new Animated.Value(0)).current;
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 550, delay, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 550, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  const onFocus = () => {
    setFocused(true);
    Animated.spring(focusAnim, { toValue: 1, useNativeDriver: false, tension: 140, friction: 8 }).start();
  };
  const onBlur = () => {
    setFocused(false);
    Animated.spring(focusAnim, { toValue: 0, useNativeDriver: false, tension: 140, friction: 8 }).start();
  };

  const borderColor = focusAnim.interpolate({ inputRange: [0, 1], outputRange: ["#c8e6c9", "#2e7d32"] });
  const bgColor = focusAnim.interpolate({ inputRange: [0, 1], outputRange: ["#f0faf0", "#e8f5e9"] });
  const iconScale = focusAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] });

  return (
    <Animated.View style={{ transform: [{ translateY: slideAnim }], opacity: fadeAnim }}>
      <Animated.View style={[styles.inputWrap, { borderColor, backgroundColor: bgColor }]}>
        <Animated.View style={{ transform: [{ scale: iconScale }], marginRight: 10 }}>
          <Ionicons name={icon} size={19} color={focused ? "#2e7d32" : "#81c784"} />
        </Animated.View>
        <TextInput
          placeholder={placeholder}
          placeholderTextColor="#a5d6a7"
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureText}
          keyboardType={keyboardType || "default"}
          autoCapitalize={autoCapitalize || "sentences"}
          style={styles.inputText}
          onFocus={onFocus}
          onBlur={onBlur}
        />
        {rightIcon && (
          <TouchableOpacity onPress={onRightIconPress} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name={rightIcon} size={19} color={focused ? "#2e7d32" : "#81c784"} />
          </TouchableOpacity>
        )}
      </Animated.View>
    </Animated.View>
  );
}

// ─── Main Login Screen ────────────────────────────────────────────────────────
export default function Login() {
  const router = useRouter();
  const { login } = useUserStore();

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const logoScale = useRef(new Animated.Value(0)).current;
  const logoY = useRef(new Animated.Value(-30)).current;
  const titleFade = useRef(new Animated.Value(0)).current;
  const titleY = useRef(new Animated.Value(20)).current;
  const cardScale = useRef(new Animated.Value(0.92)).current;
  const cardFade = useRef(new Animated.Value(0)).current;
  const btnScale = useRef(new Animated.Value(1)).current;
  const errorShake = useRef(new Animated.Value(0)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, tension: 70, friction: 6, useNativeDriver: true }),
        Animated.timing(logoY, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(titleFade, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(titleY, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.spring(cardScale, { toValue: 1, tension: 80, friction: 8, useNativeDriver: true }),
        Animated.timing(cardFade, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(logoRotate, { toValue: 1, duration: 3500, useNativeDriver: true }),
        Animated.timing(logoRotate, { toValue: -1, duration: 3500, useNativeDriver: true }),
        Animated.timing(logoRotate, { toValue: 0, duration: 3500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const spin = logoRotate.interpolate({ inputRange: [-1, 1], outputRange: ["-5deg", "5deg"] });

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(errorShake, { toValue: 12, duration: 55, useNativeDriver: true }),
      Animated.timing(errorShake, { toValue: -12, duration: 55, useNativeDriver: true }),
      Animated.timing(errorShake, { toValue: 8, duration: 55, useNativeDriver: true }),
      Animated.timing(errorShake, { toValue: -8, duration: 55, useNativeDriver: true }),
      Animated.timing(errorShake, { toValue: 4, duration: 55, useNativeDriver: true }),
      Animated.timing(errorShake, { toValue: 0, duration: 55, useNativeDriver: true }),
    ]).start();
  };

  const showError = (msg) => { setErrorMsg(msg); triggerShake(); };
  const pressBtnIn = () => Animated.spring(btnScale, { toValue: 0.93, useNativeDriver: true, tension: 220 }).start();
  const pressBtnOut = () => Animated.spring(btnScale, { toValue: 1, useNativeDriver: true, tension: 220 }).start();

  // ✅ UPDATED handleLogin — saves tokens + user properly
  const handleLogin = async () => {
    setErrorMsg("");
    if (!email || !password) return showError("Please enter your email and password.");

    setLoading(true);
    try {
      const response = await api.post("/api/auth/login", { email, password });
      const { access_token, refresh_token, user } = response.data;

      // Save tokens to SecureStore + user to AsyncStorage + Zustand
      await login({ access_token, refresh_token, user });

      // Route based on role
      if (user.role === "citizen") {
        router.replace("/dashboard");
      } else {
        router.replace("/worker-dashboard");
      }
    } catch (error) {
      showError(
        error.response?.data?.error ||
        error.response?.data?.message ||
        "Invalid credentials. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const particles = [
    { x: width * 0.1, delay: 0, size: 8, opacity: 0.25 },
    { x: width * 0.3, delay: 900, size: 5, opacity: 0.18 },
    { x: width * 0.55, delay: 400, size: 10, opacity: 0.2 },
    { x: width * 0.75, delay: 1400, size: 6, opacity: 0.22 },
    { x: width * 0.88, delay: 200, size: 7, opacity: 0.15 },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#e8f5e9" />
      <PulsingRings />
      {particles.map((p, i) => <FloatingParticle key={i} {...p} />)}
      <View style={styles.topBlob} />
      <View style={styles.topBlobInner} />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.inner}>

        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <View style={styles.backBtnInner}>
            <Ionicons name="arrow-back" size={20} color="#2e7d32" />
          </View>
        </TouchableOpacity>

        {/* Logo */}
        <Animated.View style={[styles.logoArea, { transform: [{ scale: logoScale }, { translateY: logoY }, { rotate: spin }] }]}>
          <View style={styles.logoGlow} />
          <View style={styles.logoRing}>
            <View style={styles.logoCircle}>
              <Ionicons name="leaf" size={42} color="#fff" />
            </View>
          </View>
        </Animated.View>

        {/* App Name */}
        <Animated.View style={[styles.titleWrap, { opacity: titleFade, transform: [{ translateY: titleY }] }]}>
          <Text style={styles.appName}>Nagrik Setu</Text>
          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <Ionicons name="shield-checkmark" size={11} color="#fff" />
              <Text style={styles.badgeText}>Trusted Civic Platform</Text>
            </View>
          </View>
          <Text style={styles.subtitle}>Connecting citizens for a better city.</Text>
        </Animated.View>

        {/* Card */}
        <Animated.View style={[styles.card, { transform: [{ scale: cardScale }], opacity: cardFade }]}>
          <View style={styles.welcomeRow}>
            <View style={styles.welcomeAccent} />
            <Text style={styles.welcomeText}>Welcome back</Text>
          </View>

          {errorMsg ? (
            <Animated.View style={[styles.errorBox, { transform: [{ translateX: errorShake }] }]}>
              <View style={styles.errorIconWrap}>
                <Ionicons name="close-circle" size={18} color="#c62828" />
              </View>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </Animated.View>
          ) : null}

          <AnimatedInput
            icon="mail-outline" placeholder="Email Address"
            value={email} onChangeText={(t) => { setEmail(t); if (errorMsg) setErrorMsg(""); }}
            keyboardType="email-address" autoCapitalize="none" delay={200}
          />
          <View style={{ height: 14 }} />
          <AnimatedInput
            icon="lock-closed-outline" placeholder="Password"
            value={password} onChangeText={(t) => { setPassword(t); if (errorMsg) setErrorMsg(""); }}
            secureText={!showPassword} autoCapitalize="none" delay={320}
            rightIcon={showPassword ? "eye-off-outline" : "eye-outline"}
            onRightIconPress={() => setShowPassword(!showPassword)}
          />

          <TouchableOpacity style={styles.forgotRow}>
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>

          <Animated.View style={{ transform: [{ scale: btnScale }] }}>
            <TouchableOpacity
              style={[styles.loginBtn, loading && { opacity: 0.72 }]}
              onPress={handleLogin} onPressIn={pressBtnIn} onPressOut={pressBtnOut}
              disabled={loading} activeOpacity={1}
            >
              <View style={styles.btnShimmer} />
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <View style={styles.btnContent}>
                  <Text style={styles.btnText}>Sign In</Text>
                  <View style={styles.btnArrow}>
                    <Ionicons name="arrow-forward" size={16} color="#2e7d32" />
                  </View>
                </View>
              )}
            </TouchableOpacity>
          </Animated.View>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <View style={styles.dividerDot} />
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity style={styles.signupRow} onPress={() => router.push("/signup")}>
            <Text style={styles.signupText}>New to Nagrik Setu? </Text>
            <Text style={styles.signupLink}>Create Account</Text>
            <View style={styles.signupArrow}>
              <Ionicons name="chevron-forward" size={13} color="#2e7d32" />
            </View>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View style={[styles.bottomTag, { opacity: cardFade }]}>
          <Ionicons name="people" size={13} color="#a5d6a7" />
          <Text style={styles.bottomTagText}>Empowering 10,000+ citizens</Text>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#e8f5e9" },
  inner: { flex: 1, justifyContent: "center", paddingHorizontal: 22 },
  topBlob: { position: "absolute", top: -80, right: -80, width: 260, height: 260, borderRadius: 130, backgroundColor: "rgba(46,125,50,0.1)" },
  topBlobInner: { position: "absolute", top: -40, right: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: "rgba(67,160,71,0.12)" },
  backBtn: { position: "absolute", top: 52, left: 20, zIndex: 20 },
  backBtnInner: { backgroundColor: "#fff", borderRadius: 14, padding: 9, shadowColor: "#2e7d32", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.14, shadowRadius: 8, elevation: 4 },
  logoArea: { alignItems: "center", marginBottom: 14 },
  logoGlow: { position: "absolute", width: 110, height: 110, borderRadius: 55, backgroundColor: "rgba(46,125,50,0.14)", top: -8 },
  logoRing: { width: 96, height: 96, borderRadius: 48, borderWidth: 2, borderColor: "rgba(46,125,50,0.2)", alignItems: "center", justifyContent: "center" },
  logoCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#2e7d32", alignItems: "center", justifyContent: "center", shadowColor: "#1b5e20", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.38, shadowRadius: 18, elevation: 12 },
  titleWrap: { alignItems: "center", marginBottom: 24 },
  appName: { fontSize: 36, fontWeight: "900", color: "#1b5e20", letterSpacing: -1 },
  badgeRow: { flexDirection: "row", marginTop: 6, marginBottom: 6 },
  badge: { flexDirection: "row", alignItems: "center", backgroundColor: "#43a047", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, gap: 4 },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
  subtitle: { fontSize: 13, color: "#66bb6a", fontStyle: "italic" },
  card: { backgroundColor: "#fff", borderRadius: 30, padding: 26, shadowColor: "#2e7d32", shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.13, shadowRadius: 28, elevation: 10 },
  welcomeRow: { flexDirection: "row", alignItems: "center", marginBottom: 20, gap: 10 },
  welcomeAccent: { width: 4, height: 22, borderRadius: 2, backgroundColor: "#2e7d32" },
  welcomeText: { fontSize: 19, fontWeight: "800", color: "#1b5e20" },
  errorBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#ffebee", borderRadius: 14, borderLeftWidth: 3, borderLeftColor: "#e53935", paddingHorizontal: 14, paddingVertical: 11, marginBottom: 16, gap: 8 },
  errorIconWrap: { backgroundColor: "#ffcdd2", borderRadius: 99, padding: 2 },
  errorText: { flex: 1, color: "#c62828", fontSize: 13, lineHeight: 18 },
  inputWrap: { flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderRadius: 15, paddingHorizontal: 14, paddingVertical: 13 },
  inputText: { flex: 1, color: "#1b5e20", fontSize: 15 },
  forgotRow: { alignSelf: "flex-end", marginTop: 8, marginBottom: 20 },
  forgotText: { color: "#43a047", fontSize: 13, fontWeight: "600" },
  loginBtn: { backgroundColor: "#2e7d32", borderRadius: 16, paddingVertical: 15, alignItems: "center", overflow: "hidden", shadowColor: "#1b5e20", shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.32, shadowRadius: 14, elevation: 9 },
  btnShimmer: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(255,255,255,0.07)" },
  btnContent: { flexDirection: "row", alignItems: "center", gap: 10 },
  btnText: { color: "#fff", fontSize: 17, fontWeight: "800", letterSpacing: 0.2 },
  btnArrow: { backgroundColor: "#fff", borderRadius: 99, padding: 5 },
  divider: { flexDirection: "row", alignItems: "center", marginVertical: 20, gap: 8 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#e8f5e9" },
  dividerDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#c8e6c9" },
  signupRow: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  signupText: { color: "#888", fontSize: 14 },
  signupLink: { color: "#2e7d32", fontWeight: "800", fontSize: 14 },
  signupArrow: { backgroundColor: "#e8f5e9", borderRadius: 99, padding: 3, marginLeft: 4 },
  bottomTag: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 20, gap: 6 },
  bottomTagText: { color: "#a5d6a7", fontSize: 12, fontWeight: "500" },
});
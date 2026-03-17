import React, { useState, useRef, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, SafeAreaView, Modal,
  ActivityIndicator, Animated, Dimensions, StatusBar, ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import api from "../api";
import useUserStore from "../store/userStore";

const { width, height } = Dimensions.get("window");

// ─── Floating Orb Background ──────────────────────────────────────────────────
function FloatingOrbs() {
  const orb1 = useRef(new Animated.Value(0)).current;
  const orb2 = useRef(new Animated.Value(0)).current;
  const orb3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (anim, duration, delay) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: 1, duration, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration, useNativeDriver: true }),
        ])
      ).start();
    animate(orb1, 4000, 0);
    animate(orb2, 5500, 800);
    animate(orb3, 3800, 1600);
  }, []);

  const makeTranslate = (anim, y1, y2) => ({
    translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [y1, y2] }),
  });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={[styles.orb, { width: 200, height: 200, top: -60, left: -60, backgroundColor: "rgba(46,125,50,0.18)" }, { transform: [makeTranslate(orb1, 0, 18)] }]} />
      <Animated.View style={[styles.orb, { width: 140, height: 140, top: height * 0.25, right: -40, backgroundColor: "rgba(67,160,71,0.13)" }, { transform: [makeTranslate(orb2, 0, -22)] }]} />
      <Animated.View style={[styles.orb, { width: 100, height: 100, bottom: height * 0.15, left: 20, backgroundColor: "rgba(129,199,132,0.2)" }, { transform: [makeTranslate(orb3, 0, 14)] }]} />
    </View>
  );
}

// ─── Animated Input Field ─────────────────────────────────────────────────────
function AnimatedInput({ icon, placeholder, value, onChangeText, secureText, keyboardType, autoCapitalize, delay, rightIcon, onRightIconPress }) {
  const slideAnim = useRef(new Animated.Value(40)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const focusAnim = useRef(new Animated.Value(0)).current;
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 500, delay, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  const onFocus = () => {
    setFocused(true);
    Animated.spring(focusAnim, { toValue: 1, useNativeDriver: false, tension: 120, friction: 8 }).start();
  };
  const onBlur = () => {
    setFocused(false);
    Animated.spring(focusAnim, { toValue: 0, useNativeDriver: false, tension: 120, friction: 8 }).start();
  };

  const borderColor = focusAnim.interpolate({ inputRange: [0, 1], outputRange: ["#c8e6c9", "#43a047"] });
  const bgColor = focusAnim.interpolate({ inputRange: [0, 1], outputRange: ["#f0faf0", "#e8f5e9"] });

  return (
    <Animated.View style={{ transform: [{ translateY: slideAnim }], opacity: fadeAnim }}>
      <Animated.View style={[styles.inputWrap, { borderColor, backgroundColor: bgColor }]}>
        <Ionicons name={icon} size={19} color={focused ? "#2e7d32" : "#81c784"} style={{ marginRight: 10 }} />
        <TextInput
          placeholder={placeholder} placeholderTextColor="#a5d6a7"
          value={value} onChangeText={onChangeText}
          secureTextEntry={secureText}
          keyboardType={keyboardType || "default"}
          autoCapitalize={autoCapitalize || "sentences"}
          style={styles.inputText} onFocus={onFocus} onBlur={onBlur}
        />
        {rightIcon && (
          <TouchableOpacity onPress={onRightIconPress}>
            <Ionicons name={rightIcon} size={19} color="#81c784" />
          </TouchableOpacity>
        )}
      </Animated.View>
    </Animated.View>
  );
}

// ─── OTP Box ──────────────────────────────────────────────────────────────────
function OtpBox({ value, onChangeText, onKeyPress, refCb, index }) {
  const scale = useRef(new Animated.Value(1)).current;
  const borderAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (value) {
      Animated.sequence([
        Animated.spring(scale, { toValue: 1.18, useNativeDriver: true, tension: 200, friction: 5 }),
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 200, friction: 5 }),
      ]).start();
      Animated.spring(borderAnim, { toValue: 1, useNativeDriver: false }).start();
    } else {
      Animated.spring(borderAnim, { toValue: 0, useNativeDriver: false }).start();
    }
  }, [value]);

  const borderColor = borderAnim.interpolate({ inputRange: [0, 1], outputRange: ["#c8e6c9", "#2e7d32"] });
  const bg = borderAnim.interpolate({ inputRange: [0, 1], outputRange: ["#f0faf0", "#e8f5e9"] });

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Animated.View style={[styles.otpBox, { borderColor, backgroundColor: bg }]}>
        <TextInput
          ref={refCb} value={value}
          onChangeText={(v) => onChangeText(v.slice(-1), index)}
          onKeyPress={(e) => onKeyPress(e, index)}
          keyboardType="number-pad" maxLength={1}
          textAlign="center" selectionColor="#2e7d32"
          style={styles.otpText}
          showSoftInputOnFocus={true} caretHidden={false}
        />
      </Animated.View>
    </Animated.View>
  );
}

// ─── Main Signup Screen ───────────────────────────────────────────────────────
export default function Signup() {
  const router = useRouter();
  const { login } = useUserStore();

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [errorMsg, setErrorMsg] = useState("");
  const otpRefs = useRef([]);

  const logoScale = useRef(new Animated.Value(0)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;
  const titleSlide = useRef(new Animated.Value(-30)).current;
  const titleFade = useRef(new Animated.Value(0)).current;
  const btnScale = useRef(new Animated.Value(1)).current;
  const errorShake = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (otpModalVisible) {
      setTimeout(() => otpRefs.current[0]?.focus(), 300);
    }
  }, [otpModalVisible]);

  useEffect(() => {
    Animated.sequence([
      Animated.spring(logoScale, { toValue: 1, tension: 80, friction: 6, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(titleSlide, { toValue: 0, duration: 400, useNativeDriver: true }),
        Animated.timing(titleFade, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(logoRotate, { toValue: 1, duration: 3000, useNativeDriver: true }),
        Animated.timing(logoRotate, { toValue: -1, duration: 3000, useNativeDriver: true }),
        Animated.timing(logoRotate, { toValue: 0, duration: 3000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const spin = logoRotate.interpolate({ inputRange: [-1, 1], outputRange: ["-6deg", "6deg"] });

  const shakeError = () => {
    Animated.sequence([
      Animated.timing(errorShake, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(errorShake, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(errorShake, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(errorShake, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(errorShake, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const pressBtnIn = () => Animated.spring(btnScale, { toValue: 0.94, useNativeDriver: true, tension: 200 }).start();
  const pressBtnOut = () => Animated.spring(btnScale, { toValue: 1, useNativeDriver: true, tension: 200 }).start();
  const showError = (msg) => { setErrorMsg(msg); shakeError(); };

  const closeModal = () => {
    setOtpModalVisible(false);
    setOtp(["", "", "", "", "", ""]);
    setErrorMsg("");
  };

  // ── Step 1: Send OTP ────────────────────────────────────────────────────────
  const handleSignup = async () => {
    setErrorMsg("");
    if (!fullName || !email || !phone || !password)
      return showError("Please fill in all fields to continue.");

    setLoading(true);
    try {
      await api.post("/api/auth/register", {
        name: fullName, email, phone, password,
      });
      setOtp(["", "", "", "", "", ""]);
      setOtpModalVisible(true);
    } catch (error) {
      console.log("Signup error:", JSON.stringify(error.response?.data));
      showError(
        error.response?.data?.error ||
        error.response?.data?.message ||
        "Failed to send OTP. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Verify OTP → auto login ────────────────────────────────────────
  const handleOtpSubmit = async () => {
    const otpString = otp.join("");
    if (otpString.length < 6) return showError("Please enter the complete 6-digit OTP.");

    setLoading(true);
    try {
      const response = await api.post("/api/auth/register", {
        name: fullName, email, phone, password, otp: otpString,
      });

      const { access_token, refresh_token, user } = response.data;

      if (access_token && refresh_token && user) {
        // ✅ Backend returned tokens — auto login after register
        await login({ access_token, refresh_token, user });
        setOtpModalVisible(false);
        if (user.role === "citizen") {
          router.replace("/dashboard");
        } else {
          router.replace("/worker-dashboard");
        }
      } else {
        // Backend didn't return tokens — go to login manually
        setOtpModalVisible(false);
        setTimeout(() => router.push("/login"), 300);
      }
    } catch (error) {
      console.log("OTP error:", JSON.stringify(error.response?.data));
      showError(
        error.response?.data?.error ||
        error.response?.data?.message ||
        "Invalid or expired OTP."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (value, index) => {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyPress = (e, index) => {
    if (e.nativeEvent.key === "Backspace" && !otp[index] && index > 0)
      otpRefs.current[index - 1]?.focus();
  };

  const isOtpComplete = otp.join("").length === 6;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#e8f5e9" />
      <FloatingOrbs />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.inner}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <View style={styles.backBtnInner}>
              <Ionicons name="arrow-back" size={20} color="#2e7d32" />
            </View>
          </TouchableOpacity>

          {/* Logo */}
          <Animated.View style={[styles.logoWrap, { transform: [{ scale: logoScale }, { rotate: spin }] }]}>
            <View style={styles.logoGlow} />
            <View style={styles.logoCircle}>
              <Ionicons name="leaf" size={44} color="#fff" />
            </View>
          </Animated.View>

          {/* Title */}
          <Animated.View style={{ transform: [{ translateY: titleSlide }], opacity: titleFade, alignItems: "center", marginBottom: 28 }}>
            <Text style={styles.appName}>Nagrik Setu</Text>
            <View style={styles.taglineRow}>
              <View style={styles.taglineLine} />
              <Text style={styles.tagline}>Citizen Connect</Text>
              <View style={styles.taglineLine} />
            </View>
          </Animated.View>

          {/* Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Create Account</Text>

            {errorMsg ? (
              <Animated.View style={[styles.errorBox, { transform: [{ translateX: errorShake }] }]}>
                <Ionicons name="warning-outline" size={16} color="#b71c1c" style={{ marginRight: 6 }} />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </Animated.View>
            ) : null}

            <AnimatedInput icon="person-outline" placeholder="Full Name" value={fullName} onChangeText={setFullName} delay={100} />
            <View style={{ height: 12 }} />
            <AnimatedInput icon="mail-outline" placeholder="Email Address" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" delay={180} />
            <View style={{ height: 12 }} />
            <AnimatedInput icon="call-outline" placeholder="Phone Number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" delay={260} />
            <View style={{ height: 12 }} />
            <AnimatedInput
              icon="lock-closed-outline" placeholder="Password"
              value={password} onChangeText={setPassword}
              secureText={!showPassword} autoCapitalize="none" delay={340}
              rightIcon={showPassword ? "eye-off-outline" : "eye-outline"}
              onRightIconPress={() => setShowPassword(!showPassword)}
            />

            <View style={{ height: 22 }} />

            <Animated.View style={{ transform: [{ scale: btnScale }] }}>
              <TouchableOpacity
                style={[styles.signupBtn, loading && { opacity: 0.7 }]}
                onPress={handleSignup} onPressIn={pressBtnIn} onPressOut={pressBtnOut}
                disabled={loading} activeOpacity={1}
              >
                <View style={styles.btnGradientMock} />
                {loading ? <ActivityIndicator color="#fff" /> : (
                  <View style={styles.btnContent}>
                    <Text style={styles.btnText}>Create Account</Text>
                    <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 8 }} />
                  </View>
                )}
              </TouchableOpacity>
            </Animated.View>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity style={styles.loginRow} onPress={() => router.push("/login")}>
              <Text style={styles.loginText}>Already have an account? </Text>
              <Text style={styles.loginLink}>Sign In</Text>
              <Ionicons name="chevron-forward" size={14} color="#2e7d32" />
            </TouchableOpacity>
          </View>

          <View style={{ height: 30 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── OTP Modal ── */}
      <Modal visible={otpModalVisible} transparent animationType="fade" onRequestClose={closeModal} statusBarTranslucent>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalKAV}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeModal} />

          <View style={styles.modalCard}>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={closeModal}>
              <Ionicons name="close" size={20} color="#888" />
            </TouchableOpacity>

            <View style={styles.modalStrip}>
              <Ionicons name="shield-checkmark" size={28} color="#fff" />
            </View>

            <Text style={styles.modalTitle}>Verify Identity</Text>
            <Text style={styles.modalSub}>
              A 6-digit code was sent to{"\n"}
              <Text style={styles.modalEmail}>{email}</Text>
            </Text>

            {errorMsg ? (
              <Animated.View style={[styles.errorBox, { transform: [{ translateX: errorShake }], marginBottom: 12, width: "100%" }]}>
                <Ionicons name="warning-outline" size={15} color="#b71c1c" style={{ marginRight: 5 }} />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </Animated.View>
            ) : null}

            <View style={styles.otpRow}>
              {otp.map((digit, index) => (
                <OtpBox
                  key={index} value={digit} index={index}
                  onChangeText={handleOtpChange} onKeyPress={handleOtpKeyPress}
                  refCb={(ref) => (otpRefs.current[index] = ref)}
                />
              ))}
            </View>

            <TouchableOpacity onPress={handleSignup} disabled={loading} style={styles.resendBtn}>
              <Ionicons name="refresh-outline" size={15} color="#43a047" style={{ marginRight: 5 }} />
              <Text style={styles.resendText}>Resend Code</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.verifyBtn, !isOtpComplete && styles.verifyBtnDisabled, loading && { opacity: 0.7 }]}
              onPress={handleOtpSubmit} disabled={!isOtpComplete || loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : (
                <View style={styles.btnContent}>
                  <Ionicons name="checkmark-done" size={18} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.btnText}>Verify & Register</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#e8f5e9" },
  inner: { flex: 1 },
  orb: { position: "absolute", borderRadius: 999 },
  backBtn: { position: "absolute", top: 10, left: 0, zIndex: 20 },
  backBtnInner: { backgroundColor: "#fff", borderRadius: 14, padding: 9, shadowColor: "#2e7d32", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 4 },
  logoWrap: { alignItems: "center", marginBottom: 16 },
  logoGlow: { position: "absolute", width: 100, height: 100, borderRadius: 50, backgroundColor: "rgba(46,125,50,0.15)", top: -6 },
  logoCircle: { width: 88, height: 88, borderRadius: 44, backgroundColor: "#2e7d32", alignItems: "center", justifyContent: "center", shadowColor: "#1b5e20", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 10 },
  appName: { fontSize: 34, fontWeight: "900", color: "#1b5e20", letterSpacing: -0.5 },
  taglineRow: { flexDirection: "row", alignItems: "center", marginTop: 6, gap: 8 },
  taglineLine: { height: 1, width: 30, backgroundColor: "#a5d6a7" },
  tagline: { fontSize: 12, color: "#66bb6a", fontWeight: "600", letterSpacing: 2 },
  card: { backgroundColor: "#fff", borderRadius: 28, padding: 24, shadowColor: "#2e7d32", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.12, shadowRadius: 24, elevation: 8 },
  cardTitle: { fontSize: 20, fontWeight: "800", color: "#1b5e20", marginBottom: 16 },
  errorBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#ffebee", borderRadius: 12, borderLeftWidth: 3, borderLeftColor: "#e53935", paddingHorizontal: 14, paddingVertical: 10, marginBottom: 14 },
  errorText: { flex: 1, color: "#c62828", fontSize: 13, lineHeight: 18 },
  inputWrap: { flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13 },
  inputText: { flex: 1, color: "#1b5e20", fontSize: 15 },
  signupBtn: { backgroundColor: "#2e7d32", borderRadius: 16, paddingVertical: 16, alignItems: "center", overflow: "hidden", shadowColor: "#1b5e20", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 },
  btnGradientMock: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(255,255,255,0.07)" },
  btnContent: { flexDirection: "row", alignItems: "center" },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "800", letterSpacing: 0.3 },
  dividerRow: { flexDirection: "row", alignItems: "center", marginVertical: 18, gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#e8f5e9" },
  dividerText: { color: "#a5d6a7", fontSize: 13, fontWeight: "600" },
  loginRow: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  loginText: { color: "#888", fontSize: 14 },
  loginLink: { color: "#2e7d32", fontWeight: "800", fontSize: 14 },
  modalKAV: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)" },
  modalCard: { backgroundColor: "#fff", borderRadius: 28, padding: 28, width: width * 0.88, alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 24, elevation: 20, zIndex: 10 },
  modalCloseBtn: { position: "absolute", top: 14, right: 14, width: 32, height: 32, borderRadius: 16, backgroundColor: "#f5f5f5", alignItems: "center", justifyContent: "center", zIndex: 20 },
  modalStrip: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#2e7d32", alignItems: "center", justifyContent: "center", marginBottom: 14, shadowColor: "#1b5e20", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 8 },
  modalTitle: { fontSize: 22, fontWeight: "900", color: "#1b5e20", marginBottom: 6 },
  modalSub: { fontSize: 14, color: "#777", textAlign: "center", lineHeight: 22, marginBottom: 20 },
  modalEmail: { color: "#2e7d32", fontWeight: "700" },
  otpRow: { flexDirection: "row", justifyContent: "space-between", width: "100%", marginBottom: 16, gap: 6 },
  otpBox: { width: 44, height: 54, borderWidth: 2, borderRadius: 12, alignItems: "center", justifyContent: "center", shadowColor: "#2e7d32", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 3 },
  otpText: { fontSize: 22, fontWeight: "900", color: "#1b5e20" },
  resendBtn: { flexDirection: "row", alignItems: "center", marginBottom: 18 },
  resendText: { color: "#43a047", fontSize: 14, fontWeight: "700" },
  verifyBtn: { backgroundColor: "#2e7d32", borderRadius: 14, paddingVertical: 14, paddingHorizontal: 28, alignItems: "center", width: "100%", shadowColor: "#1b5e20", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 6 },
  verifyBtnDisabled: { backgroundColor: "#a5d6a7", shadowOpacity: 0, elevation: 0 },
});
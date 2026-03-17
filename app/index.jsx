import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  Animated,
  StatusBar,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

const { width, height } = Dimensions.get("window");

// ─── Animated Counter ─────────────────────────────────────────────────────────
function CountUp({ target, suffix = "", duration = 1800, delay = 0 }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = null;
    let raf;
    const step = (timestamp) => {
      if (!start) start = timestamp + delay;
      const elapsed = timestamp - start;
      if (elapsed < 0) { raf = requestAnimationFrame(step); return; }
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.floor(eased * target));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <Text style={styles.statNum}>{display.toLocaleString()}{suffix}</Text>;
}

// ─── Floating Orb ─────────────────────────────────────────────────────────────
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
    <Animated.View
      pointerEvents="none"
      style={[style, {
        transform: [{
          translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, range] }),
        }],
      }]}
    />
  );
}

// ─── Feature Card ─────────────────────────────────────────────────────────────
function FeatureCard({ icon, title, desc, color, delay }) {
  const slideAnim = useRef(new Animated.Value(60)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 600, delay, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  const pressIn = () => Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: true }).start();
  const pressOut = () => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();

  return (
    <Animated.View style={{ transform: [{ translateY: slideAnim }, { scale: scaleAnim }], opacity: fadeAnim }}>
      <TouchableOpacity activeOpacity={1} onPressIn={pressIn} onPressOut={pressOut}>
        <View style={[styles.featureCard, { borderTopColor: color }]}>
          <View style={[styles.featureIconWrap, { backgroundColor: color + "22" }]}>
            <Ionicons name={icon} size={26} color={color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.featureTitle}>{title}</Text>
            <Text style={styles.featureDesc}>{desc}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={color} style={{ opacity: 0.6 }} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Testimonial Card ─────────────────────────────────────────────────────────
function TestimonialCard({ text, name, role, avatar, active }) {
  const scaleAnim = useRef(new Animated.Value(active ? 1 : 0.88)).current;
  const opacityAnim = useRef(new Animated.Value(active ? 1 : 0.5)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: active ? 1 : 0.88, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: active ? 1 : 0.5, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [active]);

  return (
    <Animated.View style={[styles.testimonialCard, { transform: [{ scale: scaleAnim }], opacity: opacityAnim }]}>
      <View style={styles.quoteIcon}>
        <Ionicons name="chatbubble-ellipses" size={20} color="#43a047" />
      </View>
      <Text style={styles.testimonialText}>{text}</Text>
      <View style={styles.testimonialFooter}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{avatar}</Text>
        </View>
        <View>
          <Text style={styles.testimonialName}>{name}</Text>
          <Text style={styles.testimonialRole}>{role}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

// ─── Step Badge ───────────────────────────────────────────────────────────────
function StepBadge({ num, icon, label, active, delay }) {
  const anim = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 500, delay, useNativeDriver: true }).start();
    if (active) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.1, duration: 800, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [active]);

  return (
    <Animated.View style={[styles.stepBadge, { opacity: anim, transform: [{ scale: pulse }] }]}>
      <View style={[styles.stepCircle, active && styles.stepCircleActive]}>
        <Ionicons name={icon} size={22} color={active ? "#fff" : "#81c784"} />
      </View>
      <Text style={[styles.stepLabel, active && styles.stepLabelActive]}>{label}</Text>
      {num < 3 && <View style={[styles.stepLine, active && styles.stepLineActive]} />}
    </Animated.View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function LandingPage() {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(0);
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;

  // Hero animations
  const heroScale = useRef(new Animated.Value(0)).current;
  const heroFade = useRef(new Animated.Value(0)).current;
  const titleSlide = useRef(new Animated.Value(30)).current;
  const ctaSlide = useRef(new Animated.Value(40)).current;
  const ctaFade = useRef(new Animated.Value(0)).current;
  const btnScale = useRef(new Animated.Value(1)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(heroScale, { toValue: 1, tension: 60, friction: 6, useNativeDriver: true }),
        Animated.timing(heroFade, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(titleSlide, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.timing(ctaFade, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(ctaSlide, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(logoRotate, { toValue: 1, duration: 4000, useNativeDriver: true }),
        Animated.timing(logoRotate, { toValue: -1, duration: 4000, useNativeDriver: true }),
        Animated.timing(logoRotate, { toValue: 0, duration: 4000, useNativeDriver: true }),
      ])
    ).start();

    const stepInterval = setInterval(() => setActiveStep((p) => (p + 1) % 3), 2200);
    const testInterval = setInterval(() => setActiveTestimonial((p) => (p + 1) % 3), 3500);
    return () => { clearInterval(stepInterval); clearInterval(testInterval); };
  }, []);

  const spin = logoRotate.interpolate({ inputRange: [-1, 1], outputRange: ["-6deg", "6deg"] });
  const pressBtnIn = () => Animated.spring(btnScale, { toValue: 0.93, useNativeDriver: true }).start();
  const pressBtnOut = () => Animated.spring(btnScale, { toValue: 1, useNativeDriver: true }).start();

  const features = [
    { icon: "camera-outline", title: "Snap & Report", desc: "Photo + GPS in one tap. Issues logged instantly.", color: "#2e7d32", delay: 400 },
    { icon: "pulse-outline", title: "Live Tracking", desc: "Watch your report move from filed to resolved.", color: "#00838f", delay: 550 },
    { icon: "notifications-outline", title: "Smart Alerts", desc: "AI-curated civic alerts for your neighborhood.", color: "#e65100", delay: 700 },
    { icon: "people-circle-outline", title: "Citizen Network", desc: "Upvote issues, join drives, build community.", color: "#6a1b9a", delay: 850 },
  ];

  const steps = [
    { icon: "camera", label: "Snap" },
    { icon: "send", label: "Report" },
    { icon: "checkmark-circle", label: "Resolved" },
  ];

  const testimonials = [
    { text: "Reported a broken streetlight and it was fixed in 3 days. Incredible!", name: "Priya Sharma", role: "Resident, Pune", avatar: "PS" },
    { text: "The community alerts kept my family safe during the flood warning.", name: "Rohit Kulkarni", role: "Parent, Mumbai", avatar: "RK" },
    { text: "Finally an app that makes civic participation feel effortless.", name: "Anjali Mehta", role: "Student, Bengaluru", avatar: "AM" },
  ];

  const stats = [
    { num: 12400, suffix: "+", label: "Issues Resolved" },
    { num: 8, suffix: "K+", label: "Active Citizens" },
    { num: 94, suffix: "%", label: "Satisfaction" },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#e8f5e9" }}>
      <StatusBar barStyle="dark-content" backgroundColor="#e8f5e9" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >

        {/* ── HERO ── */}
        <View style={styles.heroSection}>
          {/* Background orbs */}
          <Orb style={styles.orb1} duration={4500} delay={0} range={-20} />
          <Orb style={styles.orb2} duration={5500} delay={600} range={16} />
          <Orb style={styles.orb3} duration={3800} delay={1200} range={-12} />

          {/* Logo */}
          <Animated.View style={[styles.logoWrap, { transform: [{ scale: heroScale }, { rotate: spin }], opacity: heroFade }]}>
            <View style={styles.logoGlow} />
            <View style={styles.logoRing}>
              <View style={styles.logoCircle}>
                <Ionicons name="leaf" size={52} color="#fff" />
              </View>
            </View>
          </Animated.View>

          {/* Title */}
          <Animated.View style={{ transform: [{ translateY: titleSlide }], opacity: heroFade, alignItems: "center" }}>
            <Text style={styles.appName}>Nagrik Setu</Text>
            <View style={styles.tagBadge}>
              <View style={styles.tagDot} />
              <Text style={styles.tagText}>CIVIC TECH PLATFORM</Text>
            </View>
            <Text style={styles.heroSubtitle}>
              Empowering citizens.{"\n"}Bridging gaps. Building cities.
            </Text>
          </Animated.View>

          {/* CTA Buttons */}
          <Animated.View style={[styles.ctaRow, { transform: [{ translateY: ctaSlide }], opacity: ctaFade }]}>
            <Animated.View style={{ transform: [{ scale: btnScale }] }}>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => router.push("/signup")}
                onPressIn={pressBtnIn}
                onPressOut={pressBtnOut}
                activeOpacity={1}
              >
                <Text style={styles.primaryBtnText}>Get Started</Text>
                <View style={styles.btnArrowCircle}>
                  <Ionicons name="arrow-forward" size={16} color="#2e7d32" />
                </View>
              </TouchableOpacity>
            </Animated.View>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.push("/login")}>
              <Text style={styles.secondaryBtnText}>Sign In</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* ── STATS ── */}
        <View style={styles.statsRow}>
          {stats.map((s, i) => (
            <View key={i} style={[styles.statCard, i === 1 && styles.statCardCenter]}>
              <CountUp target={s.num} suffix={s.suffix} delay={i * 200} />
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* ── HOW IT WORKS ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionAccent} />
            <Text style={styles.sectionTitle}>How It Works</Text>
          </View>
          <View style={styles.stepsRow}>
            {steps.map((s, i) => (
              <StepBadge key={i} num={i + 1} icon={s.icon} label={s.label} active={activeStep === i} delay={300 + i * 150} />
            ))}
          </View>
          {/* Active step detail card */}
          <View style={styles.stepDetailCard}>
            <View style={styles.stepDetailIcon}>
              <Ionicons name={steps[activeStep].icon} size={30} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.stepDetailTitle}>{["Snap the Issue", "Submit Your Report", "Track to Resolution"][activeStep]}</Text>
              <Text style={styles.stepDetailDesc}>{[
                "Open the app, take a photo of the civic issue. GPS auto-tags your location.",
                "Add a description, choose the category. One tap to submit to authorities.",
                "Get real-time updates. Watch your issue move through the resolution pipeline.",
              ][activeStep]}</Text>
            </View>
          </View>
        </View>

        {/* ── FEATURES ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionAccent, { backgroundColor: "#00838f" }]} />
            <Text style={styles.sectionTitle}>Features</Text>
          </View>
          {features.map((f, i) => <FeatureCard key={i} {...f} />)}
        </View>

        {/* ── TESTIMONIALS ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionAccent, { backgroundColor: "#6a1b9a" }]} />
            <Text style={styles.sectionTitle}>Citizen Stories</Text>
          </View>
          <View style={styles.testimonialsWrap}>
            {testimonials.map((t, i) => (
              <TestimonialCard key={i} {...t} active={activeTestimonial === i} />
            ))}
          </View>
          {/* Dots */}
          <View style={styles.dotsRow}>
            {testimonials.map((_, i) => (
              <TouchableOpacity key={i} onPress={() => setActiveTestimonial(i)}>
                <View style={[styles.dot, activeTestimonial === i && styles.dotActive]} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── FINAL CTA BANNER ── */}
        <View style={styles.ctaBanner}>
          <Orb style={styles.bannerOrb1} duration={4000} delay={0} range={-14} />
          <Orb style={styles.bannerOrb2} duration={5000} delay={800} range={12} />
          <Ionicons name="rocket-outline" size={36} color="#fff" style={{ marginBottom: 12 }} />
          <Text style={styles.bannerTitle}>Ready to make a difference?</Text>
          <Text style={styles.bannerSub}>Join thousands of citizens shaping their cities.</Text>
          <TouchableOpacity style={styles.bannerBtn} onPress={() => router.push("/signup")}>
            <Text style={styles.bannerBtnText}>Join Nagrik Setu →</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#e8f5e9" },

  // Hero
  heroSection: {
    alignItems: "center",
    paddingTop: 60,
    paddingBottom: 36,
    paddingHorizontal: 24,
    overflow: "hidden",
  },
  orb1: { position: "absolute", width: 220, height: 220, borderRadius: 110, backgroundColor: "rgba(46,125,50,0.12)", top: -60, left: -70 },
  orb2: { position: "absolute", width: 160, height: 160, borderRadius: 80, backgroundColor: "rgba(67,160,71,0.1)", top: 80, right: -50 },
  orb3: { position: "absolute", width: 100, height: 100, borderRadius: 50, backgroundColor: "rgba(129,199,132,0.15)", bottom: 30, left: 30 },

  logoWrap: { alignItems: "center", marginBottom: 20 },
  logoGlow: { position: "absolute", width: 130, height: 130, borderRadius: 65, backgroundColor: "rgba(46,125,50,0.15)", top: -10 },
  logoRing: { width: 110, height: 110, borderRadius: 55, borderWidth: 2, borderColor: "rgba(46,125,50,0.2)", alignItems: "center", justifyContent: "center" },
  logoCircle: {
    width: 92, height: 92, borderRadius: 46, backgroundColor: "#2e7d32",
    alignItems: "center", justifyContent: "center",
    shadowColor: "#1b5e20", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.4, shadowRadius: 20, elevation: 14,
  },

  appName: { fontSize: 42, fontWeight: "900", color: "#1b5e20", letterSpacing: -1.5 },
  tagBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "#2e7d32", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, marginTop: 8, marginBottom: 14, gap: 6 },
  tagDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#a5d6a7" },
  tagText: { color: "#fff", fontSize: 10, fontWeight: "800", letterSpacing: 2 },
  heroSubtitle: { fontSize: 17, color: "#388e3c", textAlign: "center", lineHeight: 26, fontStyle: "italic" },

  ctaRow: { flexDirection: "row", gap: 12, marginTop: 28, alignItems: "center" },
  primaryBtn: {
    backgroundColor: "#2e7d32", flexDirection: "row", alignItems: "center", gap: 10,
    paddingVertical: 15, paddingHorizontal: 26, borderRadius: 18,
    shadowColor: "#1b5e20", shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.35, shadowRadius: 14, elevation: 10,
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  btnArrowCircle: { backgroundColor: "#fff", borderRadius: 99, padding: 5 },
  secondaryBtn: {
    borderWidth: 2, borderColor: "#2e7d32", paddingVertical: 15, paddingHorizontal: 26, borderRadius: 18,
  },
  secondaryBtnText: { color: "#2e7d32", fontSize: 16, fontWeight: "700" },

  // Stats
  statsRow: {
    flexDirection: "row", marginHorizontal: 20, marginBottom: 10,
    backgroundColor: "#fff", borderRadius: 24, overflow: "hidden",
    shadowColor: "#2e7d32", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 6,
  },
  statCard: { flex: 1, alignItems: "center", paddingVertical: 20 },
  statCardCenter: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: "#e8f5e9" },
  statNum: { fontSize: 26, fontWeight: "900", color: "#1b5e20" },
  statLabel: { fontSize: 11, color: "#81c784", fontWeight: "600", marginTop: 2 },

  // Section
  section: { marginTop: 32, paddingHorizontal: 20 },
  sectionHeader: { flexDirection: "row", alignItems: "center", marginBottom: 18, gap: 10 },
  sectionAccent: { width: 4, height: 24, borderRadius: 2, backgroundColor: "#2e7d32" },
  sectionTitle: { fontSize: 22, fontWeight: "900", color: "#1b5e20", letterSpacing: -0.3 },

  // Steps
  stepsRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 18 },
  stepBadge: { alignItems: "center", flexDirection: "row" },
  stepCircle: {
    width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderColor: "#c8e6c9",
    backgroundColor: "#f1f8e9", alignItems: "center", justifyContent: "center",
  },
  stepCircleActive: { backgroundColor: "#2e7d32", borderColor: "#2e7d32", shadowColor: "#1b5e20", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 8 },
  stepLabel: { position: "absolute", bottom: -20, fontSize: 11, color: "#81c784", fontWeight: "600", width: 60, textAlign: "center" },
  stepLabelActive: { color: "#2e7d32", fontWeight: "800" },
  stepLine: { width: 44, height: 2, backgroundColor: "#c8e6c9", marginHorizontal: 4 },
  stepLineActive: { backgroundColor: "#43a047" },

  stepDetailCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: "#fff", borderRadius: 18, padding: 18, marginTop: 24,
    shadowColor: "#2e7d32", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5,
  },
  stepDetailIcon: {
    width: 54, height: 54, borderRadius: 27, backgroundColor: "#2e7d32",
    alignItems: "center", justifyContent: "center",
    shadowColor: "#1b5e20", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  stepDetailTitle: { fontSize: 15, fontWeight: "800", color: "#1b5e20", marginBottom: 4 },
  stepDetailDesc: { fontSize: 13, color: "#66bb6a", lineHeight: 18 },

  // Feature card
  featureCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: "#fff", borderRadius: 18, padding: 18, marginBottom: 12,
    borderTopWidth: 3,
    shadowColor: "#2e7d32", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  },
  featureIconWrap: { width: 50, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center" },
  featureTitle: { fontSize: 15, fontWeight: "800", color: "#1b5e20", marginBottom: 3 },
  featureDesc: { fontSize: 13, color: "#888", lineHeight: 18 },

  // Testimonials
  testimonialsWrap: { gap: 12 },
  testimonialCard: {
    backgroundColor: "#fff", borderRadius: 22, padding: 20,
    shadowColor: "#2e7d32", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 14, elevation: 5,
  },
  quoteIcon: {
    backgroundColor: "#e8f5e9", borderRadius: 99, padding: 8, alignSelf: "flex-start", marginBottom: 12,
  },
  testimonialText: { fontSize: 14, color: "#444", lineHeight: 22, fontStyle: "italic", marginBottom: 16 },
  testimonialFooter: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatarCircle: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: "#2e7d32", alignItems: "center", justifyContent: "center",
  },
  avatarText: { color: "#fff", fontSize: 13, fontWeight: "800" },
  testimonialName: { fontSize: 14, fontWeight: "800", color: "#1b5e20" },
  testimonialRole: { fontSize: 12, color: "#81c784" },

  dotsRow: { flexDirection: "row", justifyContent: "center", gap: 8, marginTop: 16 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#c8e6c9" },
  dotActive: { width: 22, backgroundColor: "#2e7d32" },

  // CTA Banner
  ctaBanner: {
    margin: 20,
    marginTop: 32,
    backgroundColor: "#2e7d32",
    borderRadius: 28,
    padding: 32,
    alignItems: "center",
    overflow: "hidden",
    shadowColor: "#1b5e20", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.35, shadowRadius: 20, elevation: 12,
  },
  bannerOrb1: { position: "absolute", width: 160, height: 160, borderRadius: 80, backgroundColor: "rgba(255,255,255,0.06)", top: -50, left: -50 },
  bannerOrb2: { position: "absolute", width: 120, height: 120, borderRadius: 60, backgroundColor: "rgba(255,255,255,0.05)", bottom: -30, right: -30 },
  bannerTitle: { fontSize: 24, fontWeight: "900", color: "#fff", textAlign: "center", letterSpacing: -0.5 },
  bannerSub: { fontSize: 14, color: "#a5d6a7", textAlign: "center", marginTop: 8, marginBottom: 24, lineHeight: 20 },
  bannerBtn: {
    backgroundColor: "#fff", borderRadius: 16, paddingVertical: 14, paddingHorizontal: 32,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 6,
  },
  bannerBtnText: { color: "#2e7d32", fontSize: 16, fontWeight: "900" },
});
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import {
  parse,
  languages,
  type BuiltinLanguage,
  type ParseResult,
} from "react-native-gpu-time";
import { runChecks, type Check } from "./checks";
import { highlight, kinds } from "./highlight";
import { samplePhrases } from "./samples";
const colors = {
  date: "#CFE3FD",
  time: "#FDE8B4",
  repeat: "#E2DCFD",
  duration: "#CFEFD8",
};
function Mark({ text }: { text: string }) {
  return (
    <Text style={s.chipText}>
      {highlight(text).map((part, index) => (
        <Text
          key={index}
          style={part.kind ? { backgroundColor: colors[part.kind] } : undefined}
        >
          {part.text}
        </Text>
      ))}
    </Text>
  );
}

const samples = samplePhrases.en;

function Playground() {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState(samples[0]);
  const [language, setLanguage] = useState<BuiltinLanguage>("en");
  const [contextOpen, setContextOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [timeZone, setTimeZone] = useState("America/New_York");
  const [reference, setReference] = useState("2026-09-12T12:00:00-04:00");
  const [result, setResult] = useState<ParseResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [details, setDetails] = useState(false);
  const [checks, setChecks] = useState<Check[] | null>(null);
  const [checking, setChecking] = useState(false);
  const alive = useRef(true);
  const running = useRef(false);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  function edit(update: () => void) {
    update();
    setResult(null);
    setError("");
  }

  async function submit(phrase = text) {
    if (running.current || !phrase.trim()) return;
    running.current = true;
    Keyboard.dismiss();
    setEditing(false);
    setBusy(true);
    setResult(null);
    setError("");
    try {
      // Give the pressed state a chance to paint before synchronous CPU inference.
      await new Promise((resolve) => setTimeout(resolve, 0));
      const next = await parse(
        phrase,
        { reference, timeZone: timeZone.trim(), limit: 5 },
        { language },
      );
      if (alive.current) setResult(next);
    } catch (error) {
      if (alive.current)
        setError(error instanceof Error ? error.message : String(error));
    } finally {
      running.current = false;
      if (alive.current) setBusy(false);
    }
  }

  async function verify() {
    setChecking(true);
    setChecks(null);
    try {
      await new Promise((resolve) => setTimeout(resolve, 0));
      const next = await runChecks();
      if (alive.current) setChecks(next);
    } finally {
      if (alive.current) setChecking(false);
    }
  }

  const hermes = Boolean(
    (globalThis as typeof globalThis & { HermesInternal?: unknown })
      .HermesInternal,
  );
  const zone = timeZone.trim();
  return (
    <KeyboardAvoidingView
      style={s.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar style="dark" />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          s.page,
          {
            paddingTop: insets.top + 24,
            paddingBottom: insets.bottom + 32,
          },
        ]}
      >
        <View style={s.topline}>
          <Text style={s.eyebrow}>▦ gpu-time / native</Text>
          <View style={s.badge}>
            <View style={s.dot} />
            <Text style={s.badgeText}>On device</Text>
          </View>
        </View>
        <Text accessibilityRole="header" style={s.title}>
          Plain words.{"\n"}Real dates.
        </Text>
        <Text style={s.intro}>
          A tiny neural model.{"\n"}Right here on your phone.
        </Text>
        <View style={s.languages}>
          {languages.map((pack) => (
            <Pressable
              key={pack.id}
              accessibilityRole="button"
              accessibilityState={{ selected: pack.id === language }}
              disabled={busy || checking}
              onPress={() =>
                edit(() => {
                  setLanguage(pack.id as BuiltinLanguage);
                  setText(samplePhrases[pack.id as BuiltinLanguage][0]);
                })
              }
              style={[s.language, pack.id === language && s.languageSelected]}
            >
              <Text
                style={[
                  s.languageText,
                  pack.id === language && s.languageTextSelected,
                ]}
              >
                {pack.name}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={s.card}>
          <Text style={s.label}>TRY IT OUT</Text>
          {!editing ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Edit phrase: ${text}`}
              onPress={() => setEditing(true)}
              style={s.phrasePreview}
            >
              {language === "en" ? (
                <Text style={s.expression}>
                  {highlight(text).map((part, index) => (
                    <Text
                      key={index}
                      style={
                        part.kind
                          ? { backgroundColor: colors[part.kind] }
                          : undefined
                      }
                    >
                      {part.text}
                    </Text>
                  ))}
                </Text>
              ) : (
                <Text style={s.expression}>{text}</Text>
              )}
              <Text style={s.tapHint}>Tap to edit</Text>
            </Pressable>
          ) : (
            <TextInput
              accessibilityLabel="Time expression"
              testID="expression-input"
              value={text}
              onChangeText={(value) => edit(() => setText(value))}
              editable={!busy && !checking}
              multiline
              autoFocus
              maxLength={500}
              style={s.expression}
              placeholder="tomorrow at 3pm"
              placeholderTextColor="#999999"
              autoCorrect={false}
              onBlur={() => setEditing(false)}
            />
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Edit reference and timezone"
            disabled={busy || checking}
            onPress={() => setContextOpen(!contextOpen)}
            style={s.contextToggle}
          >
            <Text style={s.contextLabel}>
              Reference: {reference.slice(0, 10)} · {timeZone} ⌄
            </Text>
          </Pressable>
          {contextOpen && (
            <View>
              <Text style={s.label}>TIMEZONE</Text>
              <TextInput
                accessibilityLabel="Timezone"
                value={timeZone}
                onChangeText={(value) => edit(() => setTimeZone(value))}
                editable={!busy && !checking}
                autoCapitalize="none"
                autoCorrect={false}
                style={s.input}
              />
              <Text style={s.label}>REFERENCE INSTANT</Text>
              <TextInput
                accessibilityLabel="Reference instant"
                value={reference}
                onChangeText={(value) => edit(() => setReference(value))}
                editable={!busy && !checking}
                autoCapitalize="none"
                autoCorrect={false}
                style={s.reference}
              />
            </View>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Parse expression"
            testID="parse-button"
            accessibilityState={{
              disabled: busy || checking || !text.trim(),
              busy,
            }}
            disabled={busy || checking || !text.trim()}
            onPress={() => void submit()}
            style={({ pressed }) => [
              s.button,
              pressed && s.pressed,
              (busy || checking || !text.trim()) && s.disabled,
            ]}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.buttonText}>Parse phrase ↗</Text>
            )}
          </Pressable>
          {(result || error) && (
            <View style={s.resultPanel}>
              {!!error && (
                <Text accessibilityRole="alert" style={s.error}>
                  {error}
                </Text>
              )}
              {result && (
                <View accessibilityLiveRegion="polite" testID="parse-result">
                  <View style={s.resultHeading}>
                    <Text accessibilityRole="header" style={s.sectionTitle}>
                      Your schedule
                    </Text>
                    <Text style={s.count}>
                      {result.occurrences.length}{" "}
                      {result.occurrences.length === 1 ? "date" : "dates"}
                    </Text>
                  </View>
                  {result.occurrences.map((occurrence, index) => (
                    <View
                      style={s.occurrence}
                      key={`${index}-${occurrence.start}`}
                    >
                      <Text style={s.index}>
                        {String(index + 1).padStart(2, "0")}
                      </Text>
                      <View style={s.occurrenceBody}>
                        <Text style={s.date}>
                          {new Date(occurrence.start).toLocaleDateString(
                            "en-GB",
                            {
                              timeZone: zone,
                              weekday: "short",
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            },
                          )}
                        </Text>
                        <Text style={s.time}>
                          {occurrence.allDay
                            ? "All day"
                            : new Date(occurrence.start).toLocaleTimeString(
                                "en-GB",
                                {
                                  timeZone: zone,
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )}
                          {occurrence.open
                            ? ` · open ${occurrence.open} bound`
                            : ""}
                        </Text>
                        {occurrence.end && (
                          <Text style={s.end}>
                            Until{" "}
                            {new Date(occurrence.end).toLocaleString("en-GB", {
                              timeZone: zone,
                            })}
                          </Text>
                        )}
                      </View>
                    </View>
                  ))}
                  {!result.occurrences.length && (
                    <Text style={s.empty}>
                      No dates found. Try a specific day or time.
                    </Text>
                  )}
                  {result.truncated && (
                    <Text style={s.note}>
                      Showing the first 5 dates. This schedule continues.
                    </Text>
                  )}
                  {result.diagnostics.map((diagnostic, index) => (
                    <Text key={index} style={s.error}>
                      {diagnostic.message}
                    </Text>
                  ))}
                  <Text style={s.note}>
                    Preview the dates before using them. This parser is
                    experimental.
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setDetails(!details)}
                    style={s.detailsButton}
                  >
                    <Text style={s.link}>
                      {details ? "Hide" : "Show"} API result
                    </Text>
                  </Pressable>
                  {details && (
                    <Text selectable style={s.code}>
                      {JSON.stringify(result, null, 2)}
                    </Text>
                  )}
                </View>
              )}
            </View>
          )}
        </View>
        {language === "en" && (
          <View style={s.legend}>
            {kinds.map((item) => (
              <View key={item.kind} style={s.legendItem}>
                <View
                  style={[s.swatch, { backgroundColor: colors[item.kind] }]}
                />
                <Text style={s.legendText}>{item.label}</Text>
              </View>
            ))}
          </View>
        )}
        <Text style={[s.label, s.tryLabel]}>A LITTLE INSPIRATION</Text>
        <View style={s.samples}>
          {samplePhrases[language].map((sample) => (
            <Pressable
              key={sample}
              accessibilityRole="button"
              disabled={busy || checking}
              onPress={() => {
                setText(sample);
                void submit(sample);
              }}
              style={({ pressed }) => [s.chip, pressed && s.pressed]}
            >
              {language === "en" ? (
                <Mark text={sample} />
              ) : (
                <Text style={s.chipText}>{sample}</Text>
              )}
            </Pressable>
          ))}
        </View>
        <View style={s.footer}>
          <Text style={s.footerTitle}>
            24,761 parameters. Zero server calls.
          </Text>
          <Text style={s.footerText}>
            No API key. No model download. No server calls.
          </Text>
          <Text style={s.engine}>
            {hermes ? "Hermes" : "JavaScript"} · CPU · {Platform.OS} ·{" "}
            {language}
          </Text>
          <Pressable
            accessibilityRole="button"
            disabled={checking || busy}
            onPress={verify}
            style={s.checkButton}
          >
            <Text style={s.link}>
              {checking ? "Checking…" : "Run compatibility checks"}
            </Text>
          </Pressable>
          {checks && (
            <View testID="compatibility-results">
              <Text style={s.checkSummary}>
                {checks.filter((check) => check.passed).length}/{checks.length}{" "}
                checks passed
              </Text>
              {checks.map((check) => (
                <Text
                  key={check.name}
                  style={[s.check, !check.passed && s.error]}
                >
                  {check.passed ? "✓" : "✕"} {check.name}
                  {check.detail ? `: ${check.detail}` : ""}
                </Text>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <Playground />
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({
  resultPanel: {
    marginTop: 20,
    marginHorizontal: -20,
    marginBottom: -20,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: "#FAFAFA",
    borderTopWidth: 1,
    borderColor: "#EEEEEE",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  languages: {
    flexDirection: "row",
    gap: 6,
    paddingBottom: 18,
    flexWrap: "wrap",
  },
  language: {
    paddingHorizontal: 13,
    minHeight: 44,
    justifyContent: "center",
    borderRadius: 24,
    backgroundColor: "#F6F6F6",
  },
  languageSelected: { backgroundColor: "#171717" },
  languageText: { fontSize: 12, color: "#777777" },
  languageTextSelected: { color: "#FFFFFF" },
  phrasePreview: { minHeight: 95 },
  tapHint: { fontSize: 10, color: "#AAAAAA", paddingBottom: 10 },
  contextToggle: { minHeight: 44, justifyContent: "center" },
  contextLabel: { fontSize: 10, lineHeight: 17, color: "#999999" },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    paddingTop: 16,
    justifyContent: "center",
  },
  legendItem: { flexDirection: "row", gap: 5, alignItems: "center" },
  swatch: { width: 10, height: 10, borderRadius: 3 },
  legendText: { fontSize: 9, color: "#888888" },
  screen: { flex: 1, backgroundColor: "#FFFFFF" },
  page: {
    paddingHorizontal: 24,
    maxWidth: 600,
    width: "100%",
    alignSelf: "center",
  },
  topline: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  eyebrow: {
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: -0.6,
    color: "#111111",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F3F3F3",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
  },
  badgeText: { fontSize: 11, color: "#666666", fontWeight: "600" },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#426A44" },
  title: {
    fontSize: 40,
    lineHeight: 46,
    letterSpacing: -1.6,
    fontWeight: "600",
    color: "#111111",
    marginTop: 30,
  },
  intro: {
    fontSize: 16,
    lineHeight: 24,
    color: "#777777",
    marginTop: 16,
    marginBottom: 28,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#EEEEEE",
  },
  label: {
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: "700",
    color: "#888888",
  },
  expression: {
    fontSize: 25,
    lineHeight: 32,
    color: "#171717",
    minHeight: 80,
    paddingVertical: 12,
    textAlignVertical: "top",
  },
  rule: { height: 1, backgroundColor: "#E7E8DC", marginBottom: 18 },
  input: {
    fontSize: 16,
    color: "#333333",
    paddingVertical: 10,
    marginBottom: 12,
    minHeight: 44,
  },
  reference: {
    fontSize: 13,
    color: "#777777",
    paddingVertical: 10,
    minHeight: 44,
  },
  button: {
    backgroundColor: "#171717",
    borderRadius: 28,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
  },
  buttonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.5 },
  tryLabel: { marginTop: 24, marginBottom: 12 },
  samples: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    flexBasis: "46%",
    flexGrow: 1,
    backgroundColor: "#FAFAFA",
    padding: 13,
    minHeight: 44,
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEEEEE",
  },
  chipText: { color: "#333333", fontSize: 14, lineHeight: 23 },
  resultHeading: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 18,
    marginBottom: 4,
  },
  sectionTitle: { fontSize: 19, color: "#111111" },
  count: { fontSize: 12, color: "#888888" },
  occurrence: {
    flexDirection: "row",
    gap: 14,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderColor: "#EEEEEE",
  },
  index: { color: "#7A886D", fontSize: 12, paddingTop: 4 },
  occurrenceBody: { flex: 1 },
  date: { fontSize: 16, color: "#222222", fontWeight: "600" },
  time: { fontSize: 19, color: "#222222", marginTop: 5 },
  end: { fontSize: 12, lineHeight: 18, color: "#617057", marginTop: 6 },
  empty: { fontSize: 15, color: "#617057", paddingVertical: 16 },
  note: { fontSize: 12, lineHeight: 18, color: "#888888", marginTop: 14 },
  error: { color: "#993E27", fontSize: 14, lineHeight: 21, marginTop: 14 },
  detailsButton: {
    minHeight: 44,
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  link: { color: "#777777", fontSize: 13, textDecorationLine: "underline" },
  code: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#191919",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 11,
    lineHeight: 17,
    color: "#E2DCFD",
  },
  footer: {
    marginTop: 34,
    paddingTop: 24,
    borderTopWidth: 1,
    borderColor: "#EEEEEE",
  },
  footerTitle: { color: "#444444", fontWeight: "600", fontSize: 13 },
  footerText: { color: "#999999", fontSize: 12, marginTop: 6 },
  engine: { color: "#999999", fontSize: 11, marginTop: 12 },
  checkButton: {
    alignSelf: "flex-start",
    minHeight: 44,
    justifyContent: "center",
  },
  checkSummary: {
    color: "#355336",
    fontWeight: "700",
    fontSize: 13,
    marginBottom: 8,
  },
  check: { color: "#526549", fontSize: 12, lineHeight: 21 },
});

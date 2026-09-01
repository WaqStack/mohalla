# 06 — Android Foundation

**Stage 5 · Project Foundation · Shehersaaz Community Platform (Mohalla — محلہ)**
Kotlin **2.4.10** · AGP **9.3.2** · Gradle **9.7.1** · Compose BOM **2026.08.00** · JDK **21.0.12.1**
Status: ✅ **BUILD SUCCESSFUL** — `app-debug.apk` (11 MB) · 3 tests, 0 failures

---

## 1. What exists

One activity, one screen, one theme, one test class. **No product screen, no navigation, no network call, no authentication.**

```
apps/android/
├── settings.gradle.kts
├── build.gradle.kts
├── gradle.properties
├── gradle/libs.versions.toml        version catalogue - every version pinned
├── gradlew / gradlew.bat            wrapper, distribution pinned by SHA-256
└── app/
    ├── build.gradle.kts
    └── src/
        ├── main/
        │   ├── AndroidManifest.xml           android:supportsRtl="true"
        │   ├── java/…/MainActivity.kt
        │   ├── java/…/MohallaTheme.kt        approved palette values
        │   ├── java/…/FoundationScreen.kt    displays resolved layout direction
        │   └── res/
        │       ├── values/strings.xml        English
        │       ├── values-ur/strings.xml     Urdu — peer, not fallback
        │       └── xml/locales_config.xml    per-app language support
        └── test/…/LocalizationParityTest.kt
```

---

## 2. SDK levels

| Property | Value | Source |
|---|---|---|
| `minSdk` | **26** | 🟦 Stage 4 approved constraint |
| `compileSdk` | **37** | **forced by Compose 1.12.0** — see below |
| `targetSdk` | **37** | tracks `compileSdk` |
| build-tools | **37.0.0** | matches platform 37 |
| platform-tools | **37.0.1** | |

> ### ⚠️ Correction — compileSdk 36 was wrong, and the build proved it
>
> An earlier draft pinned `compileSdk = 36` on the stated grounds that *"no `platforms;android-37` is published"*. **That was false.**
>
> **Cause:** the availability check used the regex `path="platforms;android-[0-9]*"` against `repository2-3.xml`. Google publishes platforms with **dotted minor versions** — `android-37.0`, `android-37.1`, `android-37.2` — none of which matched. `sdkmanager --list` shows all of them.
>
> **How it was caught:** not by review. Compose BOM 2026.08.00 resolves Compose **1.12.0**, whose AAR metadata requires consumers to compile against **API 37 or later**. The build failed `checkDebugAarMetadata` with **11 issues**, one per Compose artifact:
>
> ```
> Dependency 'androidx.compose.foundation:foundation-android:1.12.0'
> requires libraries and applications that depend on it to compile
> against version 37 or later of the Android APIs.
> :app is currently compiled against android-36.
> ```
>
> **Resolution:** installed `platforms;android-37.0` and `build-tools;37.0.0`; raised `compileSdk` and `targetSdk` to **37**. **37.0** is chosen — not 37.1 or 37.2 — as the lowest release satisfying the constraint. `37.2-beta*` are excluded as pre-release.
>
> `minSdk` is **unchanged at 26**. `compileSdk` governs which APIs the code may reference; `minSdk` governs which devices can install the app. The approved API 26+ constraint is untouched.

---

## 3. RTL — the foundation's most important property

🟦 **LOCALE-FR-003 · BR-041 · REL-002** require the interface to mirror completely for Urdu. OD-011 explicitly forbids meeting the 68-day schedule by *"skipping RTL"*.

Four mechanisms, all present from the first commit:

**1. `android:supportsRtl="true"` in the manifest.** Without it every `start`/`end` attribute in the project silently behaves as `left`/`right`. The Urdu layout is then wrong in a way that compiles, runs, and passes casual review.

**2. Direction-agnostic APIs only** in Compose:

| Used | Never used |
|---|---|
| `Modifier.padding(horizontal = …)` | `padding(start = 16.dp)` with a hardcoded matching `end` |
| `Alignment.Start` / `Alignment.End` | `Alignment.Left` / `Alignment.Right` |
| `TextAlign.Start` | `TextAlign.Left` |

**3. `locales_config.xml`** declares `en` and `ur` as peers, so Urdu appears in Android's own per-app language setting, and `androidResources.localeFilters` stops resource shrinking dropping it.

**4. The screen displays its own resolved direction.** `FoundationScreen` renders the active locale tag and `LTR`/`RTL`. RTL verification is therefore something a tester can **see**, not something asserted in a document.

---

## 4. Localization parity test — runs on the JVM, no device needed

`LocalizationParityTest` asserts three things:

1. Every English string key has an Urdu counterpart, and there are no orphan Urdu keys
2. No Urdu value is blank
3. **The manifest actually declares `android:supportsRtl="true"`**

Point 3 is the one most easily lost — a merge conflict resolution can silently drop that attribute, and nothing else in the build would notice.

### ⚠️ The gate was silently not running — found by negative test

The first negative test produced a result worth recording: **deleting an Urdu string and setting `supportsRtl="false"` produced a PASSING build.**

The tests were correct. They simply **did not run**.

`LocalizationParityTest` reads `src/main/res/**/strings.xml` and `AndroidManifest.xml` at **runtime**, through relative `File(...)` paths. Gradle cannot infer that, so it treated `testDebugUnitTest` as **UP-TO-DATE** when only those files changed — meaning the gate was skipped at exactly the moment it mattered: when a string or the manifest had just been edited. Forcing `--rerun-tasks` made both assertions fail correctly, which confirmed the diagnosis.

**Fix** — declare the files as task inputs:

```kotlin
tasks.withType<Test>().configureEach {
    inputs
        .files(
            fileTree("src/main/res") { include("values*/strings.xml") },
            file("src/main/AndroidManifest.xml"),
        )
        .withPathSensitivity(PathSensitivity.RELATIVE)
        .withPropertyName("localizationGateInputs")
}
```

**Re-verified after the fix, with no `--rerun-tasks`:**

| Injected fault | Result |
|---|---|
| Urdu string `foundation_direction_label` deleted | ❌ `every english key has an urdu translation FAILED` |
| `android:supportsRtl="false"` | ❌ `manifest declares supportsRtl FAILED` |
| Both restored | ✅ 3 tests, 0 failures |

CI was never exposed to this — a fresh checkout has no up-to-date state — but a developer running `./gradlew test` locally, or any build using the Gradle build cache, was. **A gate that reports green without running is worse than no gate**, and this one was found only because the negative test was actually performed rather than assumed.

---

## 5. AGP 9 breaking change, hit and resolved

The first wrapper generation **failed**:

```
The 'org.jetbrains.kotlin.android' plugin is no longer required
for Kotlin support since AGP 9.0.
```

**AGP 9 has built-in Kotlin support** and fails the build if the separate plugin is also applied. Resolved by removing `org.jetbrains.kotlin.android` from both build files and replacing `kotlin { jvmToolchain(21) }` with the standard `java { toolchain { … } }` block. `org.jetbrains.kotlin.plugin.compose` is still required and is retained.

A second issue — `resourceConfigurations` deprecated in favour of `androidResources.localeFilters` — was fixed rather than suppressed.

---

## 6. Reproducibility

**The Gradle wrapper is authoritative and checksum-pinned:**

```properties
distributionUrl=https\://services.gradle.org/distributions/gradle-9.7.1-bin.zip
distributionSha256Sum=acd53f1edaf02f1a8ff99879f8a34b302661a057d9b063ae9e35b552f804d20a
validateDistributionUrl=true
```

A tampered or substituted Gradle distribution fails the build. No developer needs Gradle installed.

`java { toolchain { languageVersion.set(JavaLanguageVersion.of(21)) } }` means the build declares the JDK it needs rather than inheriting whatever is on `PATH`.

**`android.builder.sdkDownload=false`** stops Gradle silently pulling an SDK component other than the pinned one.

---

## 7. Signing

**There is no signing configuration and no keystore in this repository, and there must never be one.** The release build type has `isMinifyEnabled = true` and no `signingConfig`. Release signing keys are held outside version control; `.gitignore` blocks `*.jks` and `*.keystore` as a second line of defence.

---

## 8. Verified

| Check | Result |
|---|---|
| `./gradlew assembleDebug` | ✅ **BUILD SUCCESSFUL** — `app/build/outputs/apk/debug/app-debug.apk`, 11 MB |
| `./gradlew test` | ✅ **3 tests, 0 failures, 0 errors** |
| — en/ur key parity | ✅ pass |
| — no blank Urdu value | ✅ pass |
| — manifest declares `supportsRtl` | ✅ pass |
| Gate fails on a missing Urdu string | ✅ verified |
| Gate fails on `supportsRtl="false"` | ✅ verified |
| AGP 9.3.2 ↔ Gradle 9.7.1 | ✅ confirmed by execution |
| **App launched on a device** | ⏳ **NOT DONE** — see §9 |
| **RTL verified visually in Urdu** | ⏳ **NOT DONE** — see §9 |

---

## 9. Emulator — blocked by the same cause as Docker

The Android emulator requires WHPX or Hyper-V acceleration. This workstation has **`HypervisorPresent: False`** and the `vmcompute` service absent, so **the emulator cannot run here either** — the same missing Windows features that block Docker Desktop.

`adb devices` returns an empty list: **no physical device is attached.**

**On-device RTL verification is therefore not complete**, and is not claimed to be. It requires either the Windows virtualization features enabled (administrator + reboot) or a physical Android device over `adb`. See [`09-local-development.md`](09-local-development.md).
